const User = require('../models/User');
const Class = require('../models/Class');
const MomentumScore = require('../models/MomentumScore');
const MCQTest = require('../models/MCQTest');
const MCQAttempt = require('../models/MCQAttempt');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Recommendation = require('../models/Recommendation');
const Subject = require('../models/Subject');
const { calculateMomentumScore } = require('../services/momentumService');

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

  // If a student has no momentum record at all, calculate current week on demand.
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

const getTeacherDashboard = async (req, res, next) => {
  try {
    const classes = await Class.find({ teacher: req.user._id }).populate('students');
    let allStudentIds = classes.flatMap((c) => c.students.map((s) => s._id));

    if (allStudentIds.length === 0) {
      const deptStudents = await User.find({ role: 'STUDENT', department: req.user.department, isActive: true }).select('_id');
      allStudentIds = deptStudents.map((s) => s._id);
    }

    const latestByStudent = await buildLatestMomentumMap(allStudentIds);
    const values = Array.from(latestByStudent.values());
    const avgMomentum = values.reduce((a, b) => a + b, 0) / values.length || 0;

    const testsCreated = await MCQTest.countDocuments({ createdBy: req.user._id });
    const pendingGrading = await AssignmentSubmission.countDocuments({ status: 'SUBMITTED' });

    const atRiskStudents = await Promise.all(
      allStudentIds.map(async (id) => {
        const score = latestByStudent.get(id.toString()) || 0;
        const burnout = await Recommendation.findOne({ student: id, type: 'BURNOUT' }).sort({ createdAt: -1 });
        if (score < 40 || burnout) {
          const user = await User.findById(id);
          return { name: user.name, score, risk: score < 40 ? 'Low Score' : 'Burnout' };
        }
        return null;
      })
    );

    res.json({
      success: true,
      data: {
        totalStudents: allStudentIds.length,
        avgMomentum: Math.round(avgMomentum * 100) / 100,
        testsCreated,
        pendingGrading,
        atRiskStudents: atRiskStudents.filter(s => s !== null)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getClassStudents = async (req, res, next) => {
  try {
    const search = (req.query.search || '').trim();

    const classes = await Class.find({ teacher: req.user._id }).populate('students');
    let studentIds = classes.flatMap((c) => c.students.map((s) => s._id));

    if (studentIds.length === 0) {
      const query = { role: 'STUDENT', department: req.user.department };
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { rollNumber: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      const deptStudents = await User.find(query).select('_id name rollNumber');
      studentIds = deptStudents.map((s) => s._id);
    }

    const usersQuery = { _id: { $in: studentIds } };
    if (search) {
      usersQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(usersQuery)
      .populate('department', 'name')
      .select('_id name email rollNumber department');

    const latestByStudent = await buildLatestMomentumMap(studentIds);

    const attemptStats = await MCQAttempt.aggregate([
      { $match: { student: { $in: studentIds }, status: 'SUBMITTED' } },
      {
        $group: {
          _id: '$student',
          testsTaken: { $sum: 1 },
          avgScore: { $avg: '$percentage' }
        }
      }
    ]);
    const byStudent = new Map(attemptStats.map((a) => [a._id.toString(), a]));

    const data = users.map((u) => {
      const stats = byStudent.get(u._id.toString());
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        rollNumber: u.rollNumber,
        department: u.department,
        momentum: Math.round(((latestByStudent.get(u._id.toString()) || 0) * 100)) / 100,
        testsTaken: stats?.testsTaken || 0,
        avgScore: Math.round((stats?.avgScore || 0) * 100) / 100
      };
    });

    data.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || '') || a.name.localeCompare(b.name));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getStudentDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate('badges');
    const scores = await MomentumScore.find({ student: id }).sort({ weekStart: -1, createdAt: -1 }).limit(10);

    res.json({ success: true, data: { user, momentumHistory: scores } });
  } catch (error) {
    next(error);
  }
};

const getTeacherTests = async (req, res, next) => {
  try {
    const tests = await MCQTest.find({ createdBy: req.user._id })
      .populate('subject')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: tests });
  } catch (error) {
    next(error);
  }
};

const getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ department: req.user.department });
    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

const createTest = async (req, res, next) => {
  try {
    const { title, subject, startTime, duration, questions } = req.body;
    
    const test = await MCQTest.create({
      title,
      subject,
      createdBy: req.user._id,
      department: req.user.department,
      duration,
      startDateTime: new Date(startTime),
      endDateTime: new Date(new Date(startTime).getTime() + duration * 60000),
      questions: questions.map(q => ({
        questionText: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks
      })),
      passingMarks: Math.ceil(questions.reduce((sum, q) => sum + q.marks, 0) * 0.4),
      isPublished: true
    });
    
    res.status(201).json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

const getTeacherResults = async (req, res, next) => {
  try {
    const tests = await MCQTest.find({ createdBy: req.user._id }).select('_id title totalMarks');
    const testIds = tests.map((t) => t._id);

    const attempts = await MCQAttempt.find({ test: { $in: testIds }, status: 'SUBMITTED' })
      .populate('student', 'name email')
      .populate('test', 'title totalMarks')
      .sort({ submittedAt: -1, createdAt: -1 });

    const rows = attempts.map((a) => ({
      _id: a._id,
      student: a.student,
      test: a.test,
      score: a.totalScore || 0,
      totalScore: a.totalMarks || a.test?.totalMarks || 0,
      percentage: Math.round((a.percentage || 0) * 100) / 100,
      submittedAt: a.submittedAt || a.updatedAt || a.createdAt
    }));

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeacherDashboard,
  getClassStudents,
  getStudentDetail,
  getTeacherTests,
  getSubjects,
  createTest,
  getTeacherResults
};
