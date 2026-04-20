const StudyLog = require('../models/StudyLog');
const Mood = require('../models/Mood');
const MomentumScore = require('../models/MomentumScore');
const Badge = require('../models/Badge');
const Recommendation = require('../models/Recommendation');
const User = require('../models/User');
const MCQTest = require('../models/MCQTest');
const MCQAttempt = require('../models/MCQAttempt');
const ruleEngine = require('../services/ruleEngine');
const gamificationService = require('../services/gamificationService');
const { calculateMomentumScore } = require('../services/momentumService');
const { computeMomentumScore2 } = require('../services/momentumScore2Service');
const { analyzeStudyLogs } = require('../services/studySessionAnalyzerService');

const semesterToYear = (semester) => Math.ceil(Number(semester) / 2);
const buildStudentAcademicVisibility = (user) => ({
  department: user.department,
  $or: [
    { class: { $exists: false }, targetYear: { $exists: false } },
    { class: null, targetYear: { $exists: false } },
    { class: { $exists: false }, targetYear: user.year ?? semesterToYear(user.semester ?? 1), targetSemester: user.semester ?? 1 },
    { class: null, targetYear: user.year ?? semesterToYear(user.semester ?? 1), targetSemester: user.semester ?? 1 },
    ...(user.class ? [{ class: user.class }] : [])
  ]
});

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

const createStudyLog = async (req, res, next) => {
  try {
    const { subject, topic, duration, questionsAttempted, questionsCorrect, notes, date } = req.body;

    if (new Date(date) > new Date()) {
      return res.status(400).json({ success: false, message: 'Date cannot be in future' });
    }

    if (questionsCorrect > questionsAttempted) {
      return res.status(400).json({ success: false, message: 'Correct answers cannot exceed attempted' });
    }

    const log = await StudyLog.create({
      student: req.user._id,
      subject,
      topic,
      duration,
      questionsAttempted,
      questionsCorrect,
      notes,
      date
    });

    // Update streak
    const user = await User.findById(req.user._id);
    const lastDate = user.lastStudyDate;
    const today = new Date(date).setHours(0, 0, 0, 0);
    
    if (lastDate) {
      const lastDay = new Date(lastDate).setHours(0, 0, 0, 0);
      const dayDiff = (today - lastDay) / (1000 * 60 * 60 * 24);
      
      if (dayDiff === 1) {
        user.currentStreak += 1;
      } else if (dayDiff > 1) {
        user.currentStreak = 1;
      }
    } else {
      user.currentStreak = 1;
    }
    
    user.lastStudyDate = date;
    await user.save();

    // Run rule engine and gamification
    await ruleEngine.runRulesForStudent(req.user._id);
    await gamificationService.checkAndAwardBadges(req.user._id);

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

const getStudyLogs = async (req, res, next) => {
  try {
    const { subject, startDate, endDate } = req.query;
    const filter = { student: req.user._id };

    if (subject) filter.subject = subject;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const logs = await StudyLog.find(filter).sort({ date: -1 });
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

const getStudySessionAnalysis = async (req, res, next) => {
  try {
    const days = Math.max(7, Math.min(120, Number(req.query?.days || 30)));
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);

    const logs = await StudyLog.find({
      student: req.user._id,
      date: { $gte: from, $lte: to }
    })
      .sort({ date: 1 })
      .select('date duration questionsAttempted questionsCorrect')
      .lean();

    const analysis = analyzeStudyLogs({ logs });

    res.json({
      success: true,
      data: {
        range: { from, to, days },
        analysis
      }
    });
  } catch (error) {
    next(error);
  }
};

const logMood = async (req, res, next) => {
  try {
    const { level, note, date } = req.body;

    const moodDate = new Date(date || Date.now()).setHours(0, 0, 0, 0);

    const existing = await Mood.findOne({
      student: req.user._id,
      date: moodDate
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Mood already logged for this date' });
    }

    const mood = await Mood.create({
      student: req.user._id,
      level,
      note,
      date: moodDate
    });

    await ruleEngine.runRulesForStudent(req.user._id);

    res.status(201).json({ success: true, data: mood });
  } catch (error) {
    next(error);
  }
};

const getMoods = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const moods = await Mood.find({
      student: req.user._id,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: -1 });

    res.json({ success: true, data: moods });
  } catch (error) {
    next(error);
  }
};

const getStudentAnalytics = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const allLogs = await StudyLog.find({ student: req.user._id });
    const weekLogs = allLogs.filter(log => log.date >= sevenDaysAgo);

    const totalHours = allLogs.reduce((sum, log) => sum + log.duration, 0) / 60;
    const weekHours = weekLogs.reduce((sum, log) => sum + log.duration, 0) / 60;

    // Average accuracy per subject
    const subjectStats = {};
    allLogs.forEach(log => {
      if (log.questionsAttempted > 0) {
        if (!subjectStats[log.subject]) {
          subjectStats[log.subject] = { correct: 0, total: 0 };
        }
        subjectStats[log.subject].correct += log.questionsCorrect;
        subjectStats[log.subject].total += log.questionsAttempted;
      }
    });

    const avgAccuracyBySubject = Object.keys(subjectStats).map(subject => ({
      subject,
      accuracy: (subjectStats[subject].correct / subjectStats[subject].total) * 100
    }));

    // Study hours per day (last 7 days)
    const hoursPerDay = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayLogs = weekLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= day && logDate < nextDay;
      });

      const hours = dayLogs.reduce((sum, log) => sum + log.duration, 0) / 60;
      hoursPerDay.push({
        date: day.toISOString().split('T')[0],
        hours: Math.round(hours * 10) / 10
      });
    }

    // Mood trend (last 7 days)
    const moodTrend = await Mood.find({
      student: req.user._id,
      date: { $gte: sevenDaysAgo }
    }).sort({ date: 1 });

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const latestScore = await MomentumScore.findOne({ student: req.user._id }).sort({ weekStart: -1, createdAt: -1 });
    const scoreDoc = latestScore?.weekStart && new Date(latestScore.weekStart).getTime() === weekStart.getTime()
      ? latestScore
      : await calculateMomentumScore(req.user._id, weekStart, weekEnd);

    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: {
        totalHours: Math.round(totalHours * 10) / 10,
        weekHours: Math.round(weekHours * 10) / 10,
        avgAccuracyBySubject,
        hoursPerDay,
        moodTrend,
        currentMomentumScore: scoreDoc?.score || 0,
        currentStreak: user.currentStreak,
        totalBadges: user.badges.length
      }
    });
  } catch (error) {
    next(error);
  }
};

const getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await Recommendation.find({
      student: req.user._id,
      isRead: false
    }).sort({ createdAt: -1 });

    await Recommendation.updateMany(
      { student: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, data: recommendations });
  } catch (error) {
    next(error);
  }
};

const getBadges = async (req, res, next) => {
  try {
    const badges = await Badge.find({ student: req.user._id }).sort({ awardedAt: -1 });
    res.json({ success: true, data: badges });
  } catch (error) {
    next(error);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const { type } = req.query;

    const scopeTypes = new Set(['class', 'department', 'institution']);
    const metricTypes = new Set(['momentum', 'score', 'streak']);

    const scopeType = scopeTypes.has(type) ? type : null;
    const metricType = metricTypes.has(type) ? type : 'momentum';

    const currentUser = scopeType ? await User.findById(req.user._id).populate('class department') : null;

    const filter = { role: 'STUDENT', isActive: true };
    if (scopeType === 'class' && currentUser?.class) {
      filter.class = currentUser.class._id;
    } else if (scopeType === 'department' && currentUser?.department) {
      filter.department = currentUser.department._id;
    }

    const students = await User.find(filter)
      .populate('department', 'name')
      .populate('class', 'name')
      .select('_id name rollNumber xpPoints currentStreak department class')
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
        momentum,
        avgScore,
        streak
      };
    });

    if (metricType === 'score') {
      leaderboard.sort((a, b) => b.avgScore - a.avgScore || b.xpPoints - a.xpPoints);
    } else if (metricType === 'streak') {
      leaderboard.sort((a, b) => b.streak - a.streak || b.xpPoints - a.xpPoints);
    } else {
      leaderboard.sort((a, b) => b.momentum - a.momentum || b.xpPoints - a.xpPoints);
    }

    if (scopeType === 'institution') {
      const top10 = leaderboard.slice(0, 10);
      const userRank = leaderboard.findIndex((s) => s._id.toString() === req.user._id.toString());

      if (userRank >= 10) {
        return res.json({ success: true, data: { top10, userRank: userRank + 1, hidden: true } });
      }

      return res.json({ success: true, data: { leaderboard: top10 } });
    }

    return res.json({ success: true, data: { leaderboard } });
  } catch (error) {
    next(error);
  }
};

const getStudentDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const upcomingTests = await MCQTest.find({
      isPublished: true,
      ...buildStudentAcademicVisibility(req.user),
      startDateTime: { $gt: now },
    }).limit(5).sort({ startDateTime: 1 }).populate('subject');

    const recentResults = await MCQAttempt.find({
      student: req.user._id,
      status: { $in: ['SUBMITTED', 'TIMED_OUT'] }
    }).limit(5).sort({ submittedAt: -1 }).populate('test');
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const latestScore = await MomentumScore.findOne({ student: req.user._id }).sort({ weekStart: -1, createdAt: -1 });
    const scoreDoc = latestScore?.weekStart && new Date(latestScore.weekStart).getTime() === weekStart.getTime()
      ? latestScore
      : await calculateMomentumScore(req.user._id, weekStart, weekEnd);

    const momentumHistoryDesc = await MomentumScore.find({ student: req.user._id })
      .sort({ weekStart: -1, createdAt: -1 })
      .limit(12)
      .select('score weekStart')
      .lean();

    const momentumScore2 = await computeMomentumScore2({
      history: (momentumHistoryDesc || []).reverse()
    });

    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: {
        upcomingTests,
        recentResults,
        momentum: scoreDoc?.score || 0,
        momentumScore2,
        streak: user.currentStreak || 0,
        xpPoints: user.xpPoints || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

const getStudentTests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const now = new Date();
    const visibility = {
      isPublished: true,
      ...buildStudentAcademicVisibility(req.user)
    };

    let tests = [];
    if (status === 'completed') {
      const attempts = await MCQAttempt.find({
        student: req.user._id,
        status: { $in: ['SUBMITTED', 'TIMED_OUT'] }
      })
        .select('test status submittedAt percentage')
        .sort({ submittedAt: -1, createdAt: -1 })
        .lean();

      const attemptedTestIds = [...new Set(attempts.map((a) => a.test?.toString()).filter(Boolean))];
      
      // For completed tests, we relax visibility rules so promoted students can still see history.
      // We only strictly enforce the department to ensure correct context.
      const testsDocs = await MCQTest.find({ 
        _id: { $in: attemptedTestIds },
        department: req.user.department 
      })
        .populate('subject', 'name code')
        .populate('createdBy', 'name')
        .sort({ startDateTime: -1 })
        .lean();
      const latestAttemptByTest = new Map();
      for (const attempt of attempts) {
        const key = attempt.test?.toString();
        if (key && !latestAttemptByTest.has(key)) latestAttemptByTest.set(key, attempt);
      }
      tests = testsDocs.map((test) => {
        const latest = latestAttemptByTest.get(test._id.toString()) || null;
        return {
          ...test,
          attemptStatus: latest?.status || 'SUBMITTED',
          latestAttempt: latest
        };
      });
    } else {
      const testsDocs = await MCQTest.find({
        ...visibility,
        startDateTime: { $lte: now },
        endDateTime: { $gte: now }
      })
        .populate('subject', 'name code')
        .populate('createdBy', 'name')
        .sort({ startDateTime: 1 })
        .lean();

      const attempts = await MCQAttempt.find({
        student: req.user._id,
        test: { $in: testsDocs.map((t) => t._id) }
      }).select('test status').lean();

      const statusByTest = new Map();
      for (const attempt of attempts) {
        const key = attempt.test?.toString();
        if (!key) continue;
        if (attempt.status === 'IN_PROGRESS') statusByTest.set(key, 'IN_PROGRESS');
        else if (!statusByTest.has(key)) statusByTest.set(key, attempt.status);
      }

      tests = testsDocs.map((test) => ({
        ...test,
        attemptStatus: statusByTest.get(test._id.toString()) || 'NOT_STARTED'
      }));
    }

    res.json({ success: true, data: tests });
  } catch (error) {
    next(error);
  }
};

const getStudentResults = async (req, res, next) => {
  try {
    const results = await MCQAttempt.find({
      student: req.user._id,
      status: { $in: ['SUBMITTED', 'TIMED_OUT'] }
    })
      .populate('test')
      .populate({ path: 'test', populate: { path: 'subject' } })
      .sort({ submittedAt: -1 });

    const formattedResults = results.map(result => ({
      _id: result._id,
      test: result.test,
      score: result.totalScore || 0,
      totalScore: result.test?.totalMarks || 0,
      percentage: result.percentage,
      correctAnswers: (result.answers || []).filter((a) => a.isCorrect).length,
      wrongAnswers: (result.answers || []).filter((a) => a.selectedOption >= 0 && !a.isCorrect).length,
      submittedAt: result.submittedAt
    }));

    res.json({ success: true, data: formattedResults });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStudyLog,
  getStudyLogs,
  getStudySessionAnalysis,
  logMood,
  getMoods,
  getStudentAnalytics,
  getRecommendations,
  getBadges,
  getLeaderboard,
  getStudentDashboard,
  getStudentTests,
  getStudentResults
};
