const User = require('../models/User');
const Department = require('../models/Department');
const Class = require('../models/Class');
const MomentumScore = require('../models/MomentumScore');
const MCQTest = require('../models/MCQTest');
const MCQAttempt = require('../models/MCQAttempt');
const ExamResult = require('../models/ExamResult');
const PDFAssignment = require('../models/PDFAssignment');
const PDFSubmission = require('../models/PDFSubmission');
const Recommendation = require('../models/Recommendation');
const Subject = require('../models/Subject');
const { calculateMomentumScore } = require('../services/momentumService');
const mongoose = require('mongoose');

const getCurrentWeekRange = () => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const buildLatestMomentumMap = async (studentIds) => {
  const ids = (studentIds || []).map((id) => id.toString());
  const latestByStudent = new Map();
  if (ids.length === 0) return latestByStudent;

  const scores = await MomentumScore.find({ student: { $in: studentIds } })
    .sort({ weekStart: -1, createdAt: -1 })
    .select('student score weekStart createdAt')
    .lean();

  for (const s of scores) {
    const key = s.student.toString();
    if (!latestByStudent.has(key)) latestByStudent.set(key, s.score ?? 0);
  }

  const missing = ids.filter((id) => !latestByStudent.has(id));
  if (missing.length > 0) {
    const { weekStart, weekEnd } = getCurrentWeekRange();
    for (const batch of chunk(missing, 10)) {
      const docs = await Promise.all(batch.map((id) => calculateMomentumScore(id, weekStart, weekEnd)));
      docs.forEach((d, idx) => latestByStudent.set(batch[idx], d?.score ?? 0));
    }
  }

  return latestByStudent;
};

const getHODDashboard = async (req, res, next) => {
  try {
    const totalTeachers = await User.countDocuments({ role: 'TEACHER', department: req.user.department });
    const totalStudents = await User.countDocuments({ role: 'STUDENT', department: req.user.department });
    const activeTests = await MCQTest.countDocuments({ department: req.user.department, status: 'PUBLISHED' });
    
    const students = await User.find({ role: 'STUDENT', department: req.user.department });
    const ids = students.map((s) => s._id);
    const latestByStudent = await buildLatestMomentumMap(ids);
    const values = Array.from(latestByStudent.values());
    const avgScore = values.reduce((a, b) => a + b, 0) / values.length || 0;
    const completionRate = 75;
    const avgAttendance = 82;

    res.json({
      success: true,
      data: {
        totalTeachers,
        totalStudents,
        activeTests,
        avgScore: Math.round(avgScore),
        completionRate,
        avgAttendance
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTeachers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = { role: 'TEACHER', department: req.user.department };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const teachers = await User.find(query).select('name email');
    
    const teachersWithStats = await Promise.all(
      teachers.map(async (teacher) => {
        const testsCreated = await MCQTest.countDocuments({ teacher: teacher._id });
        const students = await User.countDocuments({ role: 'STUDENT', department: req.user.department });
        
        return {
          _id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          subjects: [],
          testsCreated,
          studentCount: students
        };
      })
    );

    res.json({ success: true, data: teachersWithStats });
  } catch (error) {
    next(error);
  }
};

const getDepartmentReport = async (req, res, next) => {
  try {
    const classes = await Class.find({ department: req.user.department }).populate('students professor');

    const report = await Promise.all(
      classes.map(async (cls) => {
        const scores = await MomentumScore.find({ student: { $in: cls.students.map(s => s._id) } }).sort({ weekStart: -1, createdAt: -1 });
        const latestScores = {};
        scores.forEach(s => {
          if (!latestScores[s.student]) latestScores[s.student] = s.score;
        });
        const avgMomentum = Object.values(latestScores).reduce((a, b) => a + b, 0) / Object.keys(latestScores).length || 0;

        return {
          className: cls.name,
          professor: cls.professor.name,
          avgMomentum: Math.round(avgMomentum * 100) / 100
        };
      })
    );

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

const compareProfessors = async (req, res, next) => {
  try {
    const professors = await User.find({ role: 'PROFESSOR', department: req.user.department });

    const comparison = await Promise.all(
      professors.map(async (prof) => {
        const classes = await Class.find({ professor: prof._id }).populate('students');
        const allStudentIds = classes.flatMap(c => c.students.map(s => s._id));

        const scores = await MomentumScore.find({ student: { $in: allStudentIds } }).sort({ weekStart: -1, createdAt: -1 });
        const latestScores = {};
        scores.forEach(s => {
          if (!latestScores[s.student]) latestScores[s.student] = s.score;
        });
        const avgMomentum = Object.values(latestScores).reduce((a, b) => a + b, 0) / Object.keys(latestScores).length || 0;

        const atRiskCount = Object.values(latestScores).filter(s => s < 40).length;
        const testsCreated = await MCQTest.countDocuments({ professor: prof._id });
        const assignmentsCreated = await PDFAssignment.countDocuments({ professor: prof._id });

        return {
          name: prof.name,
          avgMomentum: Math.round(avgMomentum * 100) / 100,
          atRiskCount,
          testsCreated,
          assignmentsCreated
        };
      })
    );

    res.json({ success: true, data: comparison });
  } catch (error) {
    next(error);
  }
};

const getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ department: req.user.department }).sort({ createdAt: -1 });
    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

const createSubject = async (req, res, next) => {
  try {
    const { name, code, description, credits, semester } = req.body;
    const subject = await Subject.create({
      name,
      code,
      description,
      credits,
      semester,
      department: req.user.department
    });
    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

const getTests = async (req, res, next) => {
  try {
    const tests = await MCQTest.find({ department: req.user.department })
      .populate('subject', 'name code')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Shape for existing frontend (HODTests.jsx)
    const rows = tests.map((t) => ({
      _id: t._id,
      title: t.title,
      subject: t.subject,
      teacher: t.createdBy,
      startTime: t.startDateTime,
      duration: t.duration,
      isPublished: t.isPublished
    }));

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

const getStudents = async (req, res, next) => {
  try {
    const { search } = req.query;
    const semester = req.query.semester !== undefined ? Number(req.query.semester) : undefined;
    const query = { role: 'STUDENT', department: req.user.department, isActive: true };

    if (!Number.isNaN(semester) && semester !== undefined) {
      query.semester = semester;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await User.find(query).select('name email rollNumber semester');
    const ids = students.map((s) => s._id);

    const latestByStudent = await buildLatestMomentumMap(ids);

    const attemptStats = await MCQAttempt.aggregate([
      { $match: { student: { $in: ids }, status: 'SUBMITTED' } },
      {
        $group: {
          _id: '$student',
          testsTaken: { $sum: 1 },
          avgScore: { $avg: '$percentage' }
        }
      }
    ]);

    const byStudent = new Map(attemptStats.map((a) => [a._id.toString(), a]));

    const rows = students.map((s) => {
      const stats = byStudent.get(s._id.toString());
      return {
        _id: s._id,
        name: s.name,
        email: s.email,
        rollNumber: s.rollNumber,
        semester: s.semester ?? 1,
        momentum: Math.round(((latestByStudent.get(s._id.toString()) || 0) * 100)) / 100,
        testsTaken: stats?.testsTaken || 0,
        avgScore: Math.round((stats?.avgScore || 0) * 100) / 100
      };
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

const getStudentDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ _id: id, role: 'STUDENT', isActive: true })
      .populate('badges')
      .populate('department', 'name code')
      .populate('class', 'name');

    if (!user) return res.status(404).json({ success: false, message: 'Student not found' });
    if (user.department?._id?.toString() !== req.user.department?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const scores = await MomentumScore.find({ student: id }).sort({ weekStart: -1, createdAt: -1 }).limit(10);
    const studentObjectId = new mongoose.Types.ObjectId(id);

    const mcqAgg = await MCQAttempt.aggregate([
      { $match: { student: studentObjectId, status: 'SUBMITTED' } },
      {
        $group: {
          _id: '$student',
          testsTaken: { $sum: 1 },
          avgScore: { $avg: '$percentage' }
        }
      }
    ]);

    const examAgg = await ExamResult.aggregate([
      { $match: { student: studentObjectId, department: user.department?._id } },
      {
        $group: {
          _id: '$student',
          examsTaken: { $sum: 1 },
          avgPercentage: { $avg: '$avg' }
        }
      }
    ]);

    const semesterStart = user.semesterStartedAt ? new Date(user.semesterStartedAt) : new Date(0);
    const semesterMomentumAgg = await MomentumScore.aggregate([
      { $match: { student: studentObjectId, weekStart: { $gte: semesterStart } } },
      {
        $group: {
          _id: '$student',
          weeks: { $sum: 1 },
          avgMomentum: { $avg: '$score' }
        }
      }
    ]);

    const mcq = mcqAgg?.[0] || { testsTaken: 0, avgScore: 0 };
    const exams = examAgg?.[0] || { examsTaken: 0, avgPercentage: 0 };
    const semesterMomentum = semesterMomentumAgg?.[0] || { weeks: 0, avgMomentum: 0 };

    res.json({
      success: true,
      data: {
        user,
        momentumHistory: scores,
        performance: {
          semester: {
            current: user.semester ?? 1,
            startedAt: user.semesterStartedAt || null,
            weeks: semesterMomentum.weeks || 0,
            avgMomentum: Math.round((semesterMomentum.avgMomentum || 0) * 100) / 100
          },
          mcq: {
            testsTaken: mcq.testsTaken || 0,
            avgScore: Math.round((mcq.avgScore || 0) * 100) / 100
          },
          exams: {
            examsTaken: exams.examsTaken || 0,
            avgPercentage: Math.round((exams.avgPercentage || 0) * 100) / 100
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const promoteSemester = async (req, res, next) => {
  try {
    const fromSemester = Number(req.body.fromSemester);
    const toSemester = Number(req.body.toSemester);
    const studentIds = Array.isArray(req.body.studentIds) ? req.body.studentIds : null;

    if (!Number.isInteger(fromSemester) || fromSemester < 1 || fromSemester > 8) {
      return res.status(400).json({ success: false, message: 'fromSemester must be between 1 and 8' });
    }
    if (!Number.isInteger(toSemester) || toSemester < 1 || toSemester > 8) {
      return res.status(400).json({ success: false, message: 'toSemester must be between 1 and 8' });
    }
    if (toSemester === fromSemester) {
      return res.status(400).json({ success: false, message: 'toSemester must be different from fromSemester' });
    }

    let filter = {
      role: 'STUDENT',
      department: req.user.department,
      isActive: true,
      semester: fromSemester
    };

    if (studentIds && studentIds.length > 0) {
      const validIds = studentIds.filter((x) => mongoose.Types.ObjectId.isValid(x));
      if (validIds.length === 0) {
        return res.status(400).json({ success: false, message: 'studentIds are invalid' });
      }
      filter = { ...filter, _id: { $in: validIds } };
    }

    const students = await User.find(filter).select('_id semester semesterStartedAt createdAt');
    if (!students || students.length === 0) {
      return res.json({ success: true, data: { promoted: 0 } });
    }

    const now = new Date();

    for (const s of students) {
      const startedAt = s.semesterStartedAt || s.createdAt || null;
      await User.updateOne(
        { _id: s._id },
        {
          $set: { semester: toSemester, semesterStartedAt: now },
          $push: {
            semesterHistory: {
              semester: fromSemester,
              startedAt,
              endedAt: now
            }
          }
        }
      );
    }

    res.json({ success: true, data: { promoted: students.length } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHODDashboard,
  getTeachers,
  getDepartmentReport,
  compareProfessors,
  getSubjects,
  createSubject,
  getTests,
  getStudents,
  getStudentDetail,
  promoteSemester
};
