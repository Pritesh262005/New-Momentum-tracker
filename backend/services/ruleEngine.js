const StudyLog = require('../models/StudyLog');
const Mood = require('../models/Mood');
const Recommendation = require('../models/Recommendation');
const gamificationService = require('./gamificationService');

const runRulesForStudent = async (studentId) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. WEAK_TOPIC Detection
    const studyLogs = await StudyLog.find({
      student: studentId,
      date: { $gte: thirtyDaysAgo }
    });

    const topicStats = {};
    studyLogs.forEach(log => {
      const key = `${log.subject}|${log.topic}`;
      if (!topicStats[key]) {
        topicStats[key] = { subject: log.subject, topic: log.topic, attempts: 0, correct: 0, total: 0 };
      }
      if (log.questionsAttempted > 0) {
        topicStats[key].attempts++;
        topicStats[key].correct += log.questionsCorrect;
        topicStats[key].total += log.questionsAttempted;
      }
    });

    for (const key in topicStats) {
      const stat = topicStats[key];
      if (stat.attempts > 3 && stat.total > 0) {
        const accuracy = (stat.correct / stat.total) * 100;
        if (accuracy < 60) {
          const existing = await Recommendation.findOne({
            student: studentId,
            type: 'WEAK_TOPIC',
            subject: stat.subject,
            topic: stat.topic,
            createdAt: { $gte: sevenDaysAgo }
          });
          
          if (!existing) {
            await Recommendation.create({
              student: studentId,
              type: 'WEAK_TOPIC',
              message: `You are struggling with ${stat.topic} in ${stat.subject}. Focus on this area with targeted practice.`,
              subject: stat.subject,
              topic: stat.topic
            });
          }
        }
      }
    }

    // 2. CONSISTENCY Check
    const uniqueDays = new Set(
      studyLogs.filter(log => log.date >= sevenDaysAgo)
        .map(log => log.date.toDateString())
    ).size;

    if (uniqueDays < 3) {
      const existing = await Recommendation.findOne({
        student: studentId,
        type: 'CONSISTENCY',
        createdAt: { $gte: sevenDaysAgo }
      });
      
      if (!existing) {
        await Recommendation.create({
          student: studentId,
          type: 'CONSISTENCY',
          message: `You have only studied ${uniqueDays} days this week. Try to study at least 5 days per week for best results.`
        });
      }
    }

    // 3. BURNOUT Detection
    const recentMoods = await Mood.find({
      student: studentId
    }).sort({ date: -1 }).limit(5);

    if (recentMoods.length >= 3) {
      const lowMoodCount = recentMoods.slice(0, 3).filter(m => m.level <= 2).length;
      if (lowMoodCount >= 3) {
        const existing = await Recommendation.findOne({
          student: studentId,
          type: 'BURNOUT',
          createdAt: { $gte: sevenDaysAgo }
        });
        
        if (!existing) {
          await Recommendation.create({
            student: studentId,
            type: 'BURNOUT',
            message: 'Your mood has been consistently low. Consider taking a short break and talking to your professor.'
          });
        }
      }
    }

    // 4. OVERLOAD Detection
    const weekLogs = studyLogs.filter(log => log.date >= sevenDaysAgo);
    const totalHours = weekLogs.reduce((sum, log) => sum + log.duration, 0) / 60;
    
    const last3DaysMoods = await Mood.find({
      student: studentId,
      date: { $gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }
    });
    
    if (last3DaysMoods.length > 0) {
      const avgMood = last3DaysMoods.reduce((sum, m) => sum + m.level, 0) / last3DaysMoods.length;
      
      if (totalHours > 35 && avgMood <= 2) {
        const existing = await Recommendation.findOne({
          student: studentId,
          type: 'OVERLOAD',
          createdAt: { $gte: sevenDaysAgo }
        });
        
        if (!existing) {
          await Recommendation.create({
            student: studentId,
            type: 'OVERLOAD',
            message: 'You have studied over 35 hours this week with low mood. Consider reducing your workload.'
          });
        }
      }
    }

    // 5. STREAK Recognition
    if (uniqueDays === 7) {
      await gamificationService.awardBadge(studentId, 'STREAK_MASTER');
    }

  } catch (error) {
    console.error('Rule engine error:', error.message);
  }
};

module.exports = { runRulesForStudent };
