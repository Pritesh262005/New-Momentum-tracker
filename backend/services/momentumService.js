const StudyLog = require('../models/StudyLog');
const Mood = require('../models/Mood');
const MomentumScore = require('../models/MomentumScore');
const User = require('../models/User');
const ExamResult = require('../models/ExamResult');

const calculateMomentumScore = async (studentId, weekStart, weekEnd) => {
  try {
    // Fetch study logs for the week
    const studyLogs = await StudyLog.find({
      student: studentId,
      date: { $gte: weekStart, $lte: weekEnd }
    });

    // Fetch mood entries for the week
    const moods = await Mood.find({
      student: studentId,
      date: { $gte: weekStart, $lte: weekEnd }
    });

    // Calculate C (Consistency)
    const uniqueDays = new Set(studyLogs.map(log => log.date.toDateString())).size;
    const C = (uniqueDays / 7) * 100;

    // Calculate F (Focus) - average accuracy
    let studyFocus = null;
    const logsWithQuestions = studyLogs.filter(log => log.questionsAttempted > 0);
    if (logsWithQuestions.length > 0) {
      const totalAccuracy = logsWithQuestions.reduce((sum, log) => {
        return sum + (log.questionsCorrect / log.questionsAttempted) * 100;
      }, 0);
      studyFocus = totalAccuracy / logsWithQuestions.length;
    }

    // Exam performance during the week (percentage avg).
    // Use both examDate (when exam happened) and updatedAt (when marks were entered/updated)
    // so late mark entry can still affect the current week's momentum.
    let examFocus = null;
    const examResults = await ExamResult.find({
      student: studentId,
      $or: [
        { examDate: { $gte: weekStart, $lte: weekEnd } },
        { updatedAt: { $gte: weekStart, $lte: weekEnd } }
      ]
    }).select('avg');

    if (examResults.length > 0) {
      const avgExam = examResults.reduce((sum, r) => sum + (r.avg || 0), 0) / examResults.length;
      examFocus = Math.max(0, Math.min(100, avgExam));
    }

    // Blend study focus and exam focus for a stable 0..100 Focus signal
    let F = 50;
    if (studyFocus !== null && examFocus !== null) {
      F = (0.7 * studyFocus) + (0.3 * examFocus);
    } else if (studyFocus !== null) {
      F = studyFocus;
    } else if (examFocus !== null) {
      F = examFocus;
    }

    // Calculate I (Improvement)
    let I = 50;
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    const lastWeekLogs = await StudyLog.find({
      student: studentId,
      date: { $gte: lastWeekStart, $lte: lastWeekEnd },
      questionsAttempted: { $gt: 0 }
    });

    if (lastWeekLogs.length > 0 && logsWithQuestions.length > 0) {
      const lastWeekAvg = lastWeekLogs.reduce((sum, log) => 
        sum + (log.questionsCorrect / log.questionsAttempted) * 100, 0) / lastWeekLogs.length;
      const thisWeekAvg = F;
      const improvement = thisWeekAvg - lastWeekAvg;
      I = Math.max(0, Math.min(100, 50 + improvement * 10));
    }

    // Calculate M (Mood)
    let M = 60;
    if (moods.length > 0) {
      const avgMood = moods.reduce((sum, mood) => sum + mood.level, 0) / moods.length;
      M = avgMood * 20;
    }

    // Final momentum score
    const MS = (0.4 * C) + (0.3 * I) + (0.2 * F) + (0.1 * M);
    const finalScore = Math.round(Math.max(0, Math.min(100, MS)) * 100) / 100;

    // Upsert momentum score
    const scoreDoc = await MomentumScore.findOneAndUpdate(
      { student: studentId, weekStart },
      {
        student: studentId,
        score: finalScore,
        consistency: Math.round(C * 100) / 100,
        improvement: Math.round(I * 100) / 100,
        focus: Math.round(F * 100) / 100,
        mood: Math.round(M * 100) / 100,
        weekStart,
        weekEnd
      },
      { upsert: true, new: true }
    );

    return scoreDoc;
  } catch (error) {
    console.error('Momentum calculation error:', error.message);
    throw error;
  }
};

const calculateAllStudentsMomentum = async () => {
  try {
    const students = await User.find({ role: 'STUDENT', isActive: true });
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    for (const student of students) {
      await calculateMomentumScore(student._id, weekStart, weekEnd);
    }

    console.log(`✅ Calculated momentum for ${students.length} students`);
  } catch (error) {
    console.error('Batch momentum calculation error:', error.message);
  }
};

module.exports = {
  calculateMomentumScore,
  calculateAllStudentsMomentum
};
