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
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const syllabusStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/syllabuses';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const sanitized = String(file.originalname || 'syllabus.pdf').replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `syllabus_${req.user?._id || 'user'}_${Date.now()}_${sanitized}`);
  }
});

const syllabusUpload = multer({
  storage: syllabusStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || String(file.originalname || '').toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed for syllabus'));
    }
  }
});

const semesterToYear = (semester) => Math.ceil(Number(semester) / 2);
const clampYear = (year) => {
  const value = Number(year);
  return Number.isInteger(value) && value >= 1 && value <= 4 ? value : null;
};
const clampSemester = (semester) => {
  const value = Number(semester);
  return Number.isInteger(value) && value >= 1 && value <= 8 ? value : null;
};

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

const getHODAnalytics = async (req, res, next) => {
  try {
    const departmentId = req.user.department;
    const requestedYear = clampYear(req.query.year);
    if (req.query.year && !requestedYear) {
      return res.status(400).json({ success: false, message: 'Invalid year' });
    }
    const students = await User.find({
      role: 'STUDENT',
      department: departmentId,
      isActive: true,
      ...(requestedYear ? { year: requestedYear } : {})
    }).select('_id name email');

    const studentIds = students.map((student) => student._id);
    const tests = await MCQTest.find({
      department: departmentId,
      ...(requestedYear ? { targetYear: requestedYear } : {})
    }).select('_id subject isPublished');
    const testIds = tests.map((test) => test._id);
    const subjectIds = [...new Set(tests.map((test) => test.subject?.toString()).filter(Boolean))];
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('_id name');
    const subjectNameById = new Map(subjects.map((subject) => [subject._id.toString(), subject.name]));

    const basePayload = {
      totalTests: tests.filter((test) => test.isPublished).length,
      avgScore: 0,
      passRate: 0,
      completionRate: 0,
      topPerformers: [],
      subjectStats: []
    };

    if (studentIds.length === 0 || testIds.length === 0) {
      return res.json({ success: true, data: basePayload });
    }

    const submittedAttempts = await MCQAttempt.find({
      test: { $in: testIds },
      student: { $in: studentIds },
      status: 'SUBMITTED'
    })
      .select('student test percentage isPassed')
      .lean();

    if (submittedAttempts.length === 0) {
      return res.json({ success: true, data: basePayload });
    }

    const avgScore =
      submittedAttempts.reduce((sum, attempt) => sum + (attempt.percentage || 0), 0) / submittedAttempts.length;
    const passRate =
      (submittedAttempts.filter((attempt) => attempt.isPassed).length / submittedAttempts.length) * 100;

    const attemptedStudents = new Set(submittedAttempts.map((attempt) => attempt.student.toString()));
    const completionRate = (attemptedStudents.size / studentIds.length) * 100;

    const performerMap = new Map();
    submittedAttempts.forEach((attempt) => {
      const key = attempt.student.toString();
      const current = performerMap.get(key) || { total: 0, count: 0 };
      current.total += attempt.percentage || 0;
      current.count += 1;
      performerMap.set(key, current);
    });

    const studentById = new Map(students.map((student) => [student._id.toString(), student]));
    const topPerformers = [...performerMap.entries()]
      .map(([studentId, stats]) => {
        const student = studentById.get(studentId);
        return {
          name: student?.name || 'Unknown Student',
          email: student?.email || '',
          avgScore: Math.round((stats.total / stats.count) * 100) / 100
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);

    const testById = new Map(tests.map((test) => [test._id.toString(), test]));
    const subjectStatsMap = new Map();
    submittedAttempts.forEach((attempt) => {
      const test = testById.get(attempt.test.toString());
      const subjectId = test?.subject?.toString();
      if (!subjectId) return;
      const current = subjectStatsMap.get(subjectId) || { total: 0, count: 0 };
      current.total += attempt.percentage || 0;
      current.count += 1;
      subjectStatsMap.set(subjectId, current);
    });

    const subjectStats = [...subjectStatsMap.entries()]
      .map(([subjectId, stats]) => ({
        name: subjectNameById.get(subjectId) || 'Unknown Subject',
        avgScore: Math.round((stats.total / stats.count) * 100) / 100
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    res.json({
      success: true,
      data: {
        year: requestedYear,
        totalTests: basePayload.totalTests,
        avgScore: Math.round(avgScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        topPerformers,
        subjectStats
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
    const { year, semester } = req.query;
    const filter = { department: req.user.department };

    if (year) {
      const numYear = Number(year);
      if (!Number.isNaN(numYear)) {
        filter.year = numYear;
      }
    }
    if (semester) {
      const numSemester = Number(semester);
      if (!Number.isNaN(numSemester)) {
        filter.semester = numSemester;
      }
    }

    const subjects = await Subject.find(filter)
      .populate('teachers', 'name email role')
      .sort({ year: 1, semester: 1, name: 1 })
      .lean();
    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

const createSubject = async (req, res, next) => {
  try {
    const { name, code, description, credits, year, semester } = req.body;
    let teachers = [];

    if (req.body.teachers) {
      try {
        const parsed = JSON.parse(req.body.teachers);
        teachers = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        teachers = (typeof req.body.teachers === 'string') ? req.body.teachers.split(',') : [];
      }
    }

    const existing = await Subject.findOne({
      code: code.toUpperCase(),
      department: req.user.department
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Subject with this code already exists in your department' });
    }

    const subjectData = {
      name,
      code: code.toUpperCase(),
      department: req.user.department,
      description,
      credits: parseInt(credits) || 3,
      year: parseInt(year),
      semester: parseInt(semester),
      teachers
    };

    if (req.file) {
      subjectData.syllabusFileName = req.file.originalname;
      subjectData.syllabusFilePath = req.file.path;
    }

    const subject = await Subject.create(subjectData);

    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Subject code must be unique' });
    }
    next(error);
  }
};

const updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, credits, year, semester } = req.body;
    
    let teachers = undefined;
    if (req.body.teachers) {
      try {
        const parsed = JSON.parse(req.body.teachers);
        teachers = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        teachers = (typeof req.body.teachers === 'string') ? req.body.teachers.split(',') : [];
      }
    }

    const subject = await Subject.findOne({ _id: id, department: req.user.department });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    if (name) subject.name = name;
    if (code) subject.code = code.toUpperCase();
    if (description !== undefined) subject.description = description;
    if (credits) subject.credits = parseInt(credits) || subject.credits;
    if (year) subject.year = parseInt(year);
    if (semester) subject.semester = parseInt(semester);
    if (teachers !== undefined) subject.teachers = teachers;

    if (req.file) {
      subject.syllabusFileName = req.file.originalname;
      subject.syllabusFilePath = req.file.path;
    }

    await subject.save();
    res.json({ success: true, data: subject });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Subject code must be unique' });
    }
    next(error);
  }
};

const getSubjectSyllabus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findOne({ _id: id, department: req.user.department });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    if (!subject.syllabusFilePath) {
      return res.status(404).json({ success: false, message: 'Syllabus PDF not available' });
    }

    const absPath = path.resolve(subject.syllabusFilePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${subject.syllabusFileName || 'syllabus.pdf'}"`);
    res.sendFile(absPath);
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
    const year = (req.query.year !== undefined && req.query.year !== '') ? Number(req.query.year) : undefined;
    const semester = (req.query.semester !== undefined && req.query.semester !== '') ? Number(req.query.semester) : undefined;

    const query = { role: 'STUDENT', department: req.user.department, isActive: true };
    const and = [];

    if (!Number.isNaN(year) && year !== undefined) {
      and.push({ year });
    }

    if (!Number.isNaN(semester) && semester !== undefined) {
      // Backward compatible: older seeded students may not have `semester` set.
      // Treat "missing semester" as S1 for filtering.
      if (semester === 1) {
        and.push({ $or: [{ semester: 1 }, { semester: { $exists: false } }] });
      } else {
        and.push({ semester });
      }
    }

    if (search) {
      and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { rollNumber: { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (and.length > 0) query.$and = and;

    const students = await User.find(query).select('name email rollNumber year semester');
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
        year: s.year ?? semesterToYear(s.semester ?? 1),
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
            year: user.year ?? semesterToYear(user.semester ?? 1),
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

    const filter = {
      role: 'STUDENT',
      department: req.user.department,
      isActive: true
    };

    // Backward compatible: missing semester is treated as S1.
    const and = [];
    if (fromSemester === 1) {
      and.push({ $or: [{ semester: 1 }, { semester: { $exists: false } }] });
    } else {
      and.push({ semester: fromSemester });
    }

    if (studentIds && studentIds.length > 0) {
      const validIds = studentIds.filter((x) => mongoose.Types.ObjectId.isValid(x));
      if (validIds.length === 0) {
        return res.status(400).json({ success: false, message: 'studentIds are invalid' });
      }
      and.push({ _id: { $in: validIds } });
    }

    if (and.length > 0) filter.$and = and;

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
          $set: { semester: toSemester, year: semesterToYear(toSemester), semesterStartedAt: now },
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

const getLeaderboard = async (req, res, next) => {
  try {
    const { metric = 'momentum', year } = req.query;

    const filter = { role: 'STUDENT', isActive: true, department: req.user.department };
    if (year && year !== 'all') {
      const numYear = Number(year);
      if (!Number.isNaN(numYear)) {
        filter.year = numYear;
      }
    }

    const students = await User.find(filter)
      .populate('department', 'name')
      .populate('class', 'name')
      .select('_id name rollNumber xpPoints currentStreak department class year semester')
      .lean();

    const studentIds = students.map((s) => s._id);
    const latestByStudent = await buildLatestMomentumMap(studentIds);

    const attemptStats = await MCQAttempt.aggregate([
      { $match: { student: { $in: studentIds }, status: 'SUBMITTED' } },
      { $group: { _id: '$student', avgScore: { $avg: '$percentage' } } }
    ]);
    const avgScoreByStudent = new Map(attemptStats.map((a) => [a._id.toString(), a.avgScore ?? 0]));

    const leaderboard = students.map((student) => {
      const id = student._id.toString();
      const momentum = Math.round(((latestByStudent.get(id) || 0) * 100)) / 100;
      const avgScore = Math.round(((avgScoreByStudent.get(id) || 0) * 100)) / 100;
      const streak = student.currentStreak || 0;

      return {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        xpPoints: student.xpPoints || 0,
        department: student.department || null,
        class: student.class || null,
        year: student.year ?? semesterToYear(student.semester ?? 1),
        momentum,
        avgScore,
        streak
      };
    });

    if (metric === 'score') {
      leaderboard.sort((a, b) => b.avgScore - a.avgScore || b.xpPoints - a.xpPoints);
    } else if (metric === 'streak') {
      leaderboard.sort((a, b) => b.streak - a.streak || b.xpPoints - a.xpPoints);
    } else {
      leaderboard.sort((a, b) => b.momentum - a.momentum || b.xpPoints - a.xpPoints);
    }

    return res.json({ success: true, data: { leaderboard } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHODDashboard,
  getHODAnalytics,
  getTeachers,
  getDepartmentReport,
  compareProfessors,
  getSubjects,
  createSubject,
  getTests,
  getStudents,
  getStudentDetail,
  promoteSemester,
  getLeaderboard,
  syllabusUpload,
  updateSubject,
  getSubjectSyllabus
};
