const MCQAttempt = require('../models/MCQAttempt');
const { explainWrongMcq, generateMcqFeedback } = require('../services/aiTutorService');

const canAccessAttempt = (req, attempt) => {
  if (!attempt?.student) return false;
  const isOwner = attempt.student.toString() === req.user._id.toString();
  if (isOwner) return true;
  return ['ADMIN', 'HOD', 'TEACHER', 'PROFESSOR'].includes(req.user.role);
};

exports.explainMcqWrongAnswer = async (req, res, next) => {
  try {
    const { attemptId, questionIndex } = req.body || {};
    if (!attemptId || questionIndex === null || questionIndex === undefined) {
      return res.status(400).json({ success: false, message: 'attemptId and questionIndex are required' });
    }

    const attempt = await MCQAttempt.findById(attemptId).populate({
      path: 'test',
      populate: { path: 'subject', select: 'name' }
    });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
    if (!canAccessAttempt(req, attempt)) return res.status(403).json({ success: false, message: 'Not authorized' });

    const idx = Number(questionIndex);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: 'questionIndex must be a non-negative integer' });
    }

    const q = attempt.test?.questions?.[idx];
    if (!q) return res.status(404).json({ success: false, message: 'Question not found' });

    const answer = (attempt.answers || []).find((a) => a.questionIndex === idx) || null;
    const selectedIndex = Number.isInteger(answer?.selectedOption) ? answer.selectedOption : null;
    const correctIndex = q.correctAnswer;

    const model = process.env.HF_TUTOR_MODEL || 'google/flan-t5-small';
    const explanation = await explainWrongMcq({
      model,
      questionText: q.questionText,
      options: q.options,
      correctIndex,
      selectedIndex,
      teacherExplanation: q.explanation || null
    });

    return res.json({
      success: true,
      data: {
        attemptId,
        questionIndex: idx,
        correctIndex,
        selectedIndex,
        explanation
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.generateMcqAttemptFeedback = async (req, res, next) => {
  try {
    const { attemptId } = req.body || {};
    if (!attemptId) return res.status(400).json({ success: false, message: 'attemptId is required' });

    const attempt = await MCQAttempt.findById(attemptId).populate({
      path: 'test',
      populate: { path: 'subject', select: 'name' }
    });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
    if (!canAccessAttempt(req, attempt)) return res.status(403).json({ success: false, message: 'Not authorized' });

    const model = process.env.HF_TUTOR_MODEL || 'google/flan-t5-small';
    const feedback = await generateMcqFeedback({
      model,
      title: attempt.test?.title || 'Test',
      subjectName: attempt.test?.subject?.name || '',
      percentage: Math.round((attempt.percentage || 0) * 100) / 100,
      correctAnswers: attempt.answers?.filter((a) => a.isCorrect).length || 0,
      wrongAnswers: attempt.answers?.filter((a) => a.isCorrect === false).length || 0
    });

    return res.json({
      success: true,
      data: {
        attemptId,
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
