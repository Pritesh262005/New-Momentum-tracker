const Badge = require('../models/Badge');
const User = require('../models/User');
const StudyLog = require('../models/StudyLog');
const MomentumScore = require('../models/MomentumScore');

const BADGE_XP = {
  STREAK_MASTER: 100,
  ACCURACY_EXPERT: 150,
  TIME_CHAMPION: 120,
  MOMENTUM_KING: 200,
  TOP_PERFORMER: 500
};

const BADGE_DESCRIPTIONS = {
  STREAK_MASTER: '7 consecutive days of study',
  ACCURACY_EXPERT: '90%+ average accuracy',
  TIME_CHAMPION: '20+ hours of study per week',
  MOMENTUM_KING: 'Momentum score above 80',
  TOP_PERFORMER: 'Top 10 institution-wide'
};

const awardBadge = async (studentId, badgeType) => {
  try {
    const existingBadge = await Badge.findOne({
      student: studentId,
      type: badgeType
    });

    if (existingBadge) {
      return null;
    }

    const badge = await Badge.create({
      student: studentId,
      type: badgeType,
      description: BADGE_DESCRIPTIONS[badgeType]
    });

    const user = await User.findById(studentId);
    user.badges.push(badge._id);
    user.xpPoints += BADGE_XP[badgeType];
    await user.save();

    console.log(`🏆 Badge awarded: ${badgeType} to student ${studentId}`);
    return badge;
  } catch (error) {
    console.error('Badge award error:', error.message);
    return null;
  }
};

const checkAndAwardBadges = async (studentId) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Check ACCURACY_EXPERT
    const weekLogs = await StudyLog.find({
      student: studentId,
      date: { $gte: sevenDaysAgo },
      questionsAttempted: { $gt: 0 }
    });

    if (weekLogs.length > 0) {
      const avgAccuracy = weekLogs.reduce((sum, log) => 
        sum + (log.questionsCorrect / log.questionsAttempted) * 100, 0) / weekLogs.length;
      
      if (avgAccuracy >= 90) {
        await awardBadge(studentId, 'ACCURACY_EXPERT');
      }
    }

    // Check TIME_CHAMPION
    const totalHours = weekLogs.reduce((sum, log) => sum + log.duration, 0) / 60;
    if (totalHours >= 20) {
      await awardBadge(studentId, 'TIME_CHAMPION');
    }

    // Check MOMENTUM_KING
    const latestScore = await MomentumScore.findOne({
      student: studentId
    }).sort({ createdAt: -1 });

    if (latestScore && latestScore.score > 80) {
      await awardBadge(studentId, 'MOMENTUM_KING');
    }

  } catch (error) {
    console.error('Badge check error:', error.message);
  }
};

module.exports = {
  awardBadge,
  checkAndAwardBadges
};
