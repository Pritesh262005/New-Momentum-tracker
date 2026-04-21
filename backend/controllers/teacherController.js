const User = require('../models/User');
const Class = require('../models/Class');
const MomentumScore = require('../models/MomentumScore');
const MCQTest = require('../models/MCQTest');
const MCQAttempt = require('../models/MCQAttempt');
const ExamResult = require('../models/ExamResult');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Recommendation = require('../models/Recommendation');
const Subject = require('../models/Subject');
const { calculateMomentumScore } = require('../services/momentumService');
const { extractTextFromPdfBuffer } = require('../services/pdfTextExtractService');
const { parseQuestionBankText } = require('../services/pdfQuestionBankParserService');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

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

const isValidObjectId = (id) => typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
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

const teacherYearGroups = (user) => sanitizeAssignedYearGroups(user?.assignedYearGroups);

const teacherCanAccessYearSemester = (user, year, semester) => {
  const groups = teacherYearGroups(user);
  if (groups.length === 0) return true;
  const safeYear = clampYear(year);
  const safeSemester = clampSemester(semester);
  if (!safeYear || !safeSemester) return false;
  return groups.some((group) => group.year === safeYear && (group.semesters.length === 0 || group.semesters.includes(safeSemester)));
};

const buildTeacherYearSemesterMongoFilter = (user, prefix = '') => {
  const groups = teacherYearGroups(user);
  if (groups.length === 0) return {};

  const yearKey = prefix ? `${prefix}.year` : 'year';
  const semesterKey = prefix ? `${prefix}.semester` : 'semester';

  return {
    $or: groups.map((group) => (
      group.semesters.length > 0
        ? { [yearKey]: group.year, [semesterKey]: { $in: group.semesters } }
        : { [yearKey]: group.year }
    ))
  };
};

const ensureTeacherSubject = async (subjectId, departmentId) => {
  if (!isValidObjectId(subjectId)) {
    return { ok: false, status: 400, message: 'Invalid subject id' };
  }
  const subject = await Subject.findById(subjectId).lean();
  if (!subject) return { ok: false, status: 404, message: 'Subject not found' };
  if (subject.department?.toString() !== departmentId?.toString()) {
    return { ok: false, status: 403, message: 'Subject is not in your department' };
  }
  return { ok: true, subject };
};

const ensureTeacherClass = async ({ classId, user }) => {
  if (!classId) return { ok: true, classDoc: null };
  if (!isValidObjectId(classId)) return { ok: false, status: 400, message: 'Invalid class id' };
  const classDoc = await Class.findById(classId).lean();
  if (!classDoc) return { ok: false, status: 404, message: 'Class not found' };
  if (classDoc.department?.toString() !== user.department?.toString()) {
    return { ok: false, status: 403, message: 'Class is not in your department' };
  }
  if (classDoc.teacher?.toString() !== user._id.toString()) {
    return { ok: false, status: 403, message: 'You can only create tests for your own classes' };
  }
  return { ok: true, classDoc };
};

const normalizeQuestion = (q) => ({
  questionText: String(q.questionText || q.question || '').trim(),
  options: Array.isArray(q.options) ? q.options.map((opt) => String(opt || '').trim()) : [],
  correctAnswer: Number(q.correctAnswer),
  marks: Math.max(1, Number(q.marks || 1)),
  difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(q.difficulty) ? q.difficulty : 'MEDIUM',
  explanation: String(q.explanation || '').trim()
});

const shuffle = (arr) => {
  const items = arr.slice();
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

const isPdfFile = (file) =>
  file?.mimetype === 'application/pdf' || String(file?.originalname || '').toLowerCase().endsWith('.pdf');

const questionBankUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isPdfFile(file)) return cb(null, true);
    return cb(new Error('Only PDF files are allowed'));
  }
});

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
    const requestedYear = clampYear(req.query.year);
    const requestedSemester = clampSemester(req.query.semester);
    if (req.query.year && !requestedYear) {
      return res.status(400).json({ success: false, message: 'Invalid year' });
    }
    if (req.query.semester && !requestedSemester) {
      return res.status(400).json({ success: false, message: 'Invalid semester' });
    }
    if (requestedYear && requestedSemester && semesterToYear(requestedSemester) !== requestedYear) {
      return res.status(400).json({ success: false, message: 'Semester does not belong to selected year' });
    }

    const classes = await Class.find({ teacher: req.user._id }).populate('students');
    let studentIds = classes.flatMap((c) => c.students.map((s) => s._id));

    if (studentIds.length === 0) {
      const query = { role: 'STUDENT', department: req.user.department, isActive: true, ...buildTeacherYearSemesterMongoFilter(req.user) };
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { rollNumber: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      if (requestedYear) query.year = requestedYear;
      if (requestedSemester) query.semester = requestedSemester;
      const deptStudents = await User.find(query).select('_id name rollNumber');
      studentIds = deptStudents.map((s) => s._id);
    }

    const usersQuery = { _id: { $in: studentIds }, ...buildTeacherYearSemesterMongoFilter(req.user) };
    if (search) {
      usersQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (requestedYear) usersQuery.year = requestedYear;
    if (requestedSemester) usersQuery.semester = requestedSemester;
    const users = await User.find(usersQuery)
      .populate('department', 'name')
      .select('_id name email rollNumber department year semester');

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
        year: u.year ?? semesterToYear(u.semester ?? 1),
        semester: u.semester ?? 1,
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

const getTeacherTests = async (req, res, next) => {
  try {
    const tests = await MCQTest.find({ createdBy: req.user._id })
      .populate('subject', 'name code')
      .populate('class', 'name')
      .sort({ createdAt: -1 });

    const rows = await Promise.all(tests.map(async (test) => {
      const attempts = await MCQAttempt.find({ test: test._id, status: { $in: ['SUBMITTED', 'TIMED_OUT'] } })
        .select('percentage isPassed')
        .lean();

      const avgScore = attempts.length > 0
        ? attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length
        : 0;

      return {
        ...test.toObject(),
        attemptCount: attempts.length,
        avgScore: Math.round(avgScore * 100) / 100,
        passRate: attempts.length > 0
          ? Math.round((attempts.filter((a) => a.isPassed).length / attempts.length) * 10000) / 100
          : 0,
        targetYear: test.targetYear || test.subject?.year || null,
        targetSemester: test.targetSemester || test.subject?.semester || null
      };
    }));

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

const getSubjects = async (req, res, next) => {
  try {
    const requestedYear = clampYear(req.query.year);
    const requestedSemester = clampSemester(req.query.semester);
    if (req.query.year && !requestedYear) {
      return res.status(400).json({ success: false, message: 'Invalid year' });
    }
    if (req.query.semester && !requestedSemester) {
      return res.status(400).json({ success: false, message: 'Invalid semester' });
    }
    const filter = {
      department: req.user.department,
      ...buildTeacherYearSemesterMongoFilter(req.user)
    };
    if (requestedYear) filter.year = requestedYear;
    if (requestedSemester) filter.semester = requestedSemester;
    const subjects = await Subject.find(filter).sort({ year: 1, semester: 1, name: 1 });
    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

const createTest = async (req, res, next) => {
  try {
    const {
      title,
      description,
      subject,
      classId,
      startTime,
      duration,
      questions,
      questionCount,
      instructions,
      targetYear,
      targetSemester
    } = req.body;

    const subjectChk = await ensureTeacherSubject(subject, req.user.department);
    if (!subjectChk.ok) return res.status(subjectChk.status).json({ success: false, message: subjectChk.message });

    const classChk = await ensureTeacherClass({ classId, user: req.user });
    if (!classChk.ok) return res.status(classChk.status).json({ success: false, message: classChk.message });

    const subjectYear = subjectChk.subject.year || semesterToYear(subjectChk.subject.semester);
    const subjectSemester = subjectChk.subject.semester;
    const safeTargetYear = classChk.classDoc?.year || clampYear(targetYear) || subjectYear;
    const safeTargetSemester = classChk.classDoc?.semester || clampSemester(targetSemester) || subjectSemester;
    if (!safeTargetYear || !safeTargetSemester) {
      return res.status(400).json({ success: false, message: 'Target year and semester are required' });
    }
    if (semesterToYear(safeTargetSemester) !== safeTargetYear) {
      return res.status(400).json({ success: false, message: 'Target semester does not match target year' });
    }
    if (!teacherCanAccessYearSemester(req.user, safeTargetYear, safeTargetSemester)) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this year/semester group' });
    }
    if (subjectYear !== safeTargetYear || subjectSemester !== safeTargetSemester) {
      return res.status(400).json({ success: false, message: 'Selected subject does not belong to the target year/semester' });
    }

    const normalizedQuestions = Array.isArray(questions) ? questions.map(normalizeQuestion) : [];
    if (normalizedQuestions.length < 5) {
      return res.status(400).json({ success: false, message: 'At least 5 questions are required' });
    }
    if (normalizedQuestions.some((q) => !q.questionText || q.options.length !== 4 || q.options.some((opt) => !opt) || q.correctAnswer < 0 || q.correctAnswer > 3)) {
      return res.status(400).json({ success: false, message: 'Each question must have text, 4 options, and a valid correct answer' });
    }

    const parsedDuration = Math.max(5, Math.min(180, Number(duration || 60)));
    const startDateTime = new Date(startTime);
    if (Number.isNaN(startDateTime.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start time' });
    }
    const totalMarks = normalizedQuestions.reduce((sum, q) => sum + q.marks, 0);

    const test = await MCQTest.create({
      title: String(title || '').trim(),
      description: String(description || '').trim(),
      subject,
      class: classId || undefined,
      createdBy: req.user._id,
      department: req.user.department,
      targetYear: safeTargetYear,
      targetSemester: safeTargetSemester,
      duration: parsedDuration,
      startDateTime,
      endDateTime: new Date(startDateTime.getTime() + parsedDuration * 60000),
      questions: normalizedQuestions,
      passingMarks: Math.max(1, Math.ceil(totalMarks * 0.4)),
      instructions: String(instructions || `Attempt all ${Number(questionCount || normalizedQuestions.length)} questions.`).trim(),
      isPublished: true,
      showResultImmediately: true,
      allowReview: true,
      maxAttempts: 1
    });

    res.status(201).json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

const importQuestionsFromPdf = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'PDF file is required' });
    }

    const requestedCount = Math.max(1, Math.min(100, Number(req.body.pickCount || 10)));
    const selectionMode = String(req.body.selectionMode || 'random').toLowerCase();
    const text = await extractTextFromPdfBuffer(req.file.buffer);

    if (!text) {
      return res.status(400).json({ success: false, message: 'Could not read text from the PDF' });
    }

    const parsed = parseQuestionBankText(text);
    if (parsed.questions.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Could not parse enough MCQ questions from the PDF. Use a PDF with numbered questions, A-D options, answer markers, and explanations.'
      });
    }

    const sourceQuestions = selectionMode === 'first' ? parsed.questions : shuffle(parsed.questions);
    const pickedQuestions = sourceQuestions.slice(0, Math.min(requestedCount, parsed.questions.length));

    res.json({
      success: true,
      data: {
        parsedCount: parsed.questions.length,
        pickedCount: pickedQuestions.length,
        questions: pickedQuestions
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherResults = async (req, res, next) => {
  try {
    const tests = await MCQTest.find({ createdBy: req.user._id }).select('_id title totalMarks');
    const testIds = tests.map((t) => t._id);

    const attempts = await MCQAttempt.find({ test: { $in: testIds }, status: { $in: ['SUBMITTED', 'TIMED_OUT'] } })
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

const deleteTest = async (req, res, next) => {
  try {
    const test = await MCQTest.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
    if (test.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }



    await MCQAttempt.deleteMany({ test: test._id });
    await test.deleteOne();
    res.json({ success: true, message: 'Test deleted' });
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

const updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findOne({ _id: id, department: req.user.department });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Only allow update if the teacher is assigned to it, OR it's in their department. 
    // Usually teachers can only edit their own subjects.
    if (!subject.teachers.some(t => t.toString() === req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'You can only edit subjects you are assigned to.' });
    }

    if (req.file) {
      subject.syllabusFileName = req.file.originalname;
      subject.syllabusFilePath = req.file.path;
    }

    await subject.save();
    res.json({ success: true, data: subject });
  } catch (error) {
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

module.exports = {
  questionBankUpload,
  getTeacherDashboard,
  getClassStudents,
  getStudentDetail,
  getTeacherTests,
  getSubjects,
  updateSubject,
  getSubjectSyllabus,
  createTest,
  importQuestionsFromPdf,
  getTeacherResults,
  deleteTest,
  getLeaderboard
};
