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
    const user = await User.findById(req.user._id).populate('class department');

    let filter = { role: 'STUDENT', isActive: true };

    if (type === 'class' && user.class) {
      filter.class = user.class._id;
    } else if (type === 'department' && user.department) {
      filter.department = user.department._id;
    }

    const students = await User.find(filter).select('name rollNumber xpPoints');

    const leaderboard = await Promise.all(
      students.map(async (student) => {
        const score = await MomentumScore.findOne({ student: student._id }).sort({ weekStart: -1, createdAt: -1 });
        return {
          id: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
          xpPoints: student.xpPoints,
          momentumScore: score?.score || 0
        };
      })
    );

    leaderboard.sort((a, b) => b.momentumScore - a.momentumScore || b.xpPoints - a.xpPoints);

    if (type === 'institution') {
      const top10 = leaderboard.slice(0, 10);
      const userRank = leaderboard.findIndex(s => s.id.toString() === req.user._id.toString());
      
      if (userRank >= 10) {
        return res.json({ success: true, data: { top10, userRank: userRank + 1, hidden: true } });
      }
      
      return res.json({ success: true, data: { leaderboard: top10 } });
    }

    res.json({ success: true, data: { leaderboard } });
  } catch (error) {
    next(error);
  }
};

const getStudentDashboard = async (req, res, next) => {
  try {
    const upcomingTests = await MCQTest.find({
      status: 'PUBLISHED',
      startTime: { $gt: new Date() }
    }).limit(5).sort({ startTime: 1 }).populate('subject');

    const recentResults = await MCQAttempt.find({
      student: req.user._id,
      status: 'COMPLETED'
    }).limit(5).sort({ submittedAt: -1 }).populate('test');

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
        upcomingTests,
        recentResults,
        momentum: scoreDoc?.score || 0,
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

    let query = { status: 'PUBLISHED' };

    if (status === 'available') {
      query.startTime = { $lte: now };
      query.endTime = { $gte: now };
    } else if (status === 'completed') {
      const attempts = await MCQAttempt.find({
        student: req.user._id,
        status: 'COMPLETED'
      }).select('test');
      query._id = { $in: attempts.map(a => a.test) };
    }

    const tests = await MCQTest.find(query)
      .populate('subject teacher')
      .sort({ startTime: -1 });

    res.json({ success: true, data: tests });
  } catch (error) {
    next(error);
  }
};

const getStudentResults = async (req, res, next) => {
  try {
    const results = await MCQAttempt.find({
      student: req.user._id,
      status: 'COMPLETED'
    })
      .populate('test')
      .populate({ path: 'test', populate: { path: 'subject' } })
      .sort({ submittedAt: -1 });

    const formattedResults = results.map(result => ({
      _id: result._id,
      test: result.test,
      score: result.score,
      totalScore: result.test?.totalMarks || 0,
      percentage: result.percentage,
      correctAnswers: result.correctAnswers,
      wrongAnswers: result.wrongAnswers,
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
