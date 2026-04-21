const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Department = require('../models/Department');
const Class = require('../models/Class');
const AuditLog = require('../models/AuditLog');
const Subject = require('../models/Subject');
const MCQTest = require('../models/MCQTest');
const MCQAttempt = require('../models/MCQAttempt');
const generateTempPassword = require('../utils/generateTempPassword');
const auditLogger = require('../utils/auditLogger');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');
const semesterToYear = (semester) => Math.ceil(Number(semester) / 2);
const clampYear = (year) => {
  const value = Number(year);
  return Number.isInteger(value) && value >= 1 && value <= 4 ? value : null;
};
const clampSemester = (semester) => {
  const value = Number(semester);
  return Number.isInteger(value) && value >= 1 && value <= 8 ? value : null;
};
const sanitizeAssignedYearGroups = (groups) => (
  Array.isArray(groups) ? groups : []
).map((group) => ({
  year: clampYear(group?.year),
  semesters: Array.isArray(group?.semesters)
    ? [...new Set(group.semesters.map((semester) => clampSemester(semester)).filter(Boolean))]
    : []
})).filter((group) => group.year);

const generateUserId = async ({ role, rollNumber, departmentId }) => {
  const prefix = role === 'STUDENT' ? 'STU' : role === 'TEACHER' ? 'TCH' : role === 'HOD' ? 'HOD' : 'ADM';
  let deptCode = '';
  if (departmentId) {
    const dept = await Department.findById(departmentId).select('code');
    deptCode = dept?.code ? String(dept.code).toUpperCase() : '';
  }

  const base =
    role === 'STUDENT' && rollNumber
      ? `${prefix}-${String(rollNumber).trim()}`
      : deptCode
        ? `${prefix}-${deptCode}-${String(Date.now()).slice(-6)}`
        : `${prefix}-${String(Date.now()).slice(-6)}`;

  let candidate = base;
  for (let i = 0; i < 5; i++) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.exists({ userId: candidate });
    if (!exists) return candidate;
    candidate = `${base}-${Math.floor(Math.random() * 90 + 10)}`;
  }

  // last resort
  return `${base}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, role, rollNumber, department, class: classId, year, semester, assignedYearGroups } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    if (role === 'STUDENT') {
      if (!rollNumber) {
        return res.status(400).json({ success: false, message: 'Students require rollNumber' });
      }
      if (!department && !classId) {
        return res.status(400).json({ success: false, message: 'Students require department (or class)' });
      }
    }

    if (['HOD', 'TEACHER'].includes(role) && !department) {
      return res.status(400).json({ success: false, message: 'HOD/Teacher require department' });
    }

    let resolvedDepartment = department;
    let resolvedClassId = classId;
    let resolvedSemester;
    let resolvedYear;
    if (role === 'STUDENT' && classId) {
      const klass = await Class.findById(classId).select('_id department year semester');
      if (!klass) {
        return res.status(400).json({ success: false, message: 'Invalid class' });
      }
      resolvedDepartment = resolvedDepartment || klass.department?.toString();
      if (resolvedDepartment && klass.department?.toString() !== resolvedDepartment?.toString()) {
        return res.status(400).json({ success: false, message: 'Class does not belong to the selected department' });
      }
      resolvedClassId = klass._id;
      if (klass.semester !== undefined && klass.semester !== null) resolvedSemester = klass.semester;
      if (klass.year !== undefined && klass.year !== null) resolvedYear = klass.year;
    }

    const safeSemester = resolvedSemester || clampSemester(semester);
    const safeYear = resolvedYear || clampYear(year) || (safeSemester ? semesterToYear(safeSemester) : null);
    if (role === 'STUDENT' && (!safeSemester || !safeYear)) {
      return res.status(400).json({ success: false, message: 'Students require year and semester' });
    }
    if (safeSemester && safeYear && semesterToYear(safeSemester) !== safeYear) {
      return res.status(400).json({ success: false, message: 'Semester does not belong to selected year' });
    }

    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    const payload = {
      name,
      email,
      password: hashedPassword,
      role,
      userId: await generateUserId({ role, rollNumber, departmentId: resolvedDepartment || department }),
      createdByAdmin: req.user._id,
      isTempPassword: true,
      tempPasswordExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000)
    };

    if (role === 'STUDENT') {
      payload.rollNumber = rollNumber;
      payload.department = resolvedDepartment;
      if (resolvedClassId) payload.class = resolvedClassId;
      payload.year = safeYear;
      if (safeSemester !== undefined) payload.semester = safeSemester;
      payload.semesterStartedAt = new Date();
    } else if (['HOD', 'TEACHER'].includes(role)) {
      payload.department = department;
      if (rollNumber) payload.rollNumber = rollNumber;
      payload.assignedYearGroups = sanitizeAssignedYearGroups(assignedYearGroups);
    }

    const user = await User.create(payload);

    if (role === 'STUDENT' && resolvedClassId) {
      await Class.findByIdAndUpdate(resolvedClassId, { $addToSet: { students: user._id } });
    }

    const frontendBase = (process.env.FRONTEND_URL || '').trim() || 'http://localhost:5173';
    const loginUrl = `${frontendBase.replace(/\/$/, '')}/login`;
    const deptDoc = user.department ? await Department.findById(user.department).select('name code') : null;

    await sendWelcomeEmail({
      name: user.name,
      email: user.email,
      role: user.role,
      rollNumber: user.rollNumber,
      department: deptDoc ? `${deptDoc.name} (${deptDoc.code})` : undefined,
      tempPassword,
      loginUrl
    });
    await auditLogger(req.user._id, 'USER_CREATED', { userId: user._id, role }, req.ip);

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const { role, department, isActive, year, semester } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (department) filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (year) filter.year = Number(year);
    if (semester) filter.semester = Number(semester);

    const users = await User.find(filter)
      .select('-password')
      .populate('department class')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }

    const target = await User.findById(id).select('role isActive');
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (target.role === 'ADMIN') {
      const activeAdmins = await User.countDocuments({ role: 'ADMIN', isActive: true });
      if (activeAdmins <= 1 && target.isActive) {
        return res.status(400).json({ success: false, message: 'Cannot deactivate the last active admin' });
      }
    }

    const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await auditLogger(req.user._id, 'USER_DELETED', { userId: id }, req.ip);

    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
};

const toggleUserActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot block/unblock yourself' });
    }

    if (user.role === 'ADMIN') {
      const activeAdmins = await User.countDocuments({ role: 'ADMIN', isActive: true });
      if (activeAdmins <= 1 && user.isActive) {
        return res.status(400).json({ success: false, message: 'Cannot block the last active admin' });
      }
    }

    user.isActive = !user.isActive;
    await user.save();

    await auditLogger(req.user._id, 'USER_TOGGLED', { userId: id, isActive: user.isActive }, req.ip);

    const safe = user.toObject();
    delete safe.password;
    res.json({ success: true, data: safe });
  } catch (error) {
    next(error);
  }
};

const permanentlyDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }

    const user = await User.findById(id).select('role isActive department class');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'ADMIN') {
      const activeAdmins = await User.countDocuments({ role: 'ADMIN', isActive: true });
      if (activeAdmins <= 1 && user.isActive) {
        return res.status(400).json({ success: false, message: 'Cannot delete the last active admin' });
      }
    }

    if (user.role === 'TEACHER') {
      const classesCount = await Class.countDocuments({ teacher: user._id });
      if (classesCount > 0) {
        return res.status(400).json({ success: false, message: 'Cannot delete teacher with assigned classes' });
      }
    }

    if (user.role === 'HOD') {
      const deptCount = await Department.countDocuments({ hod: user._id });
      if (deptCount > 0) {
        return res.status(400).json({ success: false, message: 'Cannot delete HOD assigned to a department' });
      }
    }

    await Class.updateMany({ students: user._id }, { $pull: { students: user._id } });
    await User.deleteOne({ _id: user._id });

    await auditLogger(req.user._id, 'USER_DELETED_PERMANENT', { userId: id, role: user.role }, req.ip);

    res.json({ success: true, message: 'User permanently deleted' });
  } catch (error) {
    next(error);
  }
};

const resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(tempPassword, salt);
    user.isTempPassword = true;
    user.tempPasswordExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await user.save();

    const frontendBase = (process.env.FRONTEND_URL || '').trim() || 'http://localhost:5173';
    const loginUrl = `${frontendBase.replace(/\/$/, '')}/login`;

    await sendPasswordResetEmail({
      name: user.name,
      email: user.email,
      tempPassword,
      resetBy: req.user.email || 'admin',
      loginUrl
    });
    await auditLogger(req.user._id, 'PASSWORD_RESET', { userId: id }, req.ip);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, hodId } = req.body;

    const existing = await Department.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Department name or code already exists' });
    }

    const department = await Department.create({
      name,
      code: code.toUpperCase(),
      description,
      hod: hodId
    });

    if (hodId) {
      await User.findByIdAndUpdate(hodId, { department: department._id });
    }

    await auditLogger(req.user._id, 'DEPARTMENT_CREATED', { departmentId: department._id }, req.ip);

    res.status(201).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find().populate('hod', 'name email');
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
};

const getAllSubjects = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.semester) filter.semester = Number(req.query.semester);
    const subjects = await Subject.find(filter)
      .populate('department', 'name code')
      .sort({ 'department.name': 1, year: 1, semester: 1, name: 1 });
    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

const createSubject = async (req, res, next) => {
  try {
    const { name, code, description, credits, semester, year, department } = req.body;
    const safeSemester = clampSemester(semester);
    const safeYear = clampYear(year) || (safeSemester ? semesterToYear(safeSemester) : null);
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required' });
    }
    if (!safeSemester || !safeYear) {
      return res.status(400).json({ success: false, message: 'Year and semester are required' });
    }
    if (semesterToYear(safeSemester) !== safeYear) {
      return res.status(400).json({ success: false, message: 'Semester does not belong to selected year' });
    }

    const subject = await Subject.create({
      name,
      code,
      description,
      credits,
      semester: safeSemester,
      year: safeYear,
      department
    });
    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

const getAdminDashboard = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalStudents = await User.countDocuments({ role: 'STUDENT', isActive: true });
    const totalTeachers = await User.countDocuments({ role: 'TEACHER', isActive: true });
    const totalHODs = await User.countDocuments({ role: 'HOD', isActive: true });
    const totalDepartments = await Department.countDocuments();
    const totalClasses = await Class.countDocuments();
    const totalTests = await MCQTest.countDocuments();

    const recentAuditLogs = await AuditLog.find()
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalStudents,
        totalTeachers,
        totalProfessors: totalTeachers,
        totalHODs,
        totalDepartments,
        totalClasses,
        totalTests,
        recentAuditLogs
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find()
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments();

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const totalTests = await MCQTest.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    // Aggregate for average score and completion rate
    const stats = await MCQAttempt.aggregate([
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$percentage' },
          totalAttempts: { $sum: 1 },
          completedAttempts: {
            $sum: {
              $cond: [{ $in: ['$status', ['SUBMITTED', 'TIMED_OUT']] }, 1, 0]
            }
          }
        }
      }
    ]);

    const completionRate = stats[0]?.totalAttempts
      ? Math.round((stats[0].completedAttempts / stats[0].totalAttempts) * 100)
      : 0;

    // Top Performers (Students with highest average scores)
    const topPerformersData = await MCQAttempt.aggregate([
      { $match: { status: { $in: ['SUBMITTED', 'TIMED_OUT'] } } },
      {
        $group: {
          _id: '$student',
          avgScore: { $avg: '$percentage' }
        }
      },
      { $sort: { avgScore: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $lookup: {
          from: 'departments',
          localField: 'studentInfo.department',
          foreignField: '_id',
          as: 'deptInfo'
        }
      },
      { $unwind: { path: '$deptInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: '$studentInfo.name',
          department: '$deptInfo.name',
          score: { $round: ['$avgScore', 1] }
        }
      }
    ]);

    // Department Stats
    const departmentStats = await MCQAttempt.aggregate([
      { $match: { status: { $in: ['SUBMITTED', 'TIMED_OUT'] } } },
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $group: {
          _id: '$studentInfo.department',
          avgScore: { $avg: '$percentage' }
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'deptInfo'
        }
      },
      { $unwind: '$deptInfo' },
      {
        $project: {
          name: '$deptInfo.name',
          avgScore: { $round: ['$avgScore', 1] }
        }
      },
      { $sort: { avgScore: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalTests,
        avgScore: Math.round(stats[0]?.avgScore || 0),
        activeUsers,
        completionRate,
        topPerformers: topPerformersData,
        departmentStats
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  getAllUsers,
  deleteUser,
  permanentlyDeleteUser,
  toggleUserActive,
  resetUserPassword,
  createDepartment,
  getAllDepartments,
  getAllSubjects,
  createSubject,
  getAdminDashboard,
  getAuditLogs,
  getAnalytics
};
