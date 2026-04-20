const MCQTest = require('../models/MCQTest');
const MCQAttempt = require('../models/MCQAttempt');
const gamificationService = require('../services/gamificationService');

exports.createTest = async (req, res, next) => {
  try {
    const { title, description, subject, classId, questions, duration, startDateTime, endDateTime, passingMarks, randomizeQuestions, randomizeOptions, showResultImmediately, allowReview, maxAttempts, instructions } = req.body;

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    if (questions.length < 5) {
      return res.status(400).json({ success: false, message: 'Test must have at least 5 questions' });
    }

    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    if (passingMarks > totalMarks) {
      return res.status(400).json({ success: false, message: 'Passing marks cannot exceed total marks' });
    }

    const test = await MCQTest.create({
      title, description, subject, class: classId,
      createdBy: req.user._id,
      department: req.user.department,
      questions, duration, startDateTime, endDateTime, passingMarks,
      randomizeQuestions, randomizeOptions, showResultImmediately, allowReview, maxAttempts, instructions
    });

    const response = test.toObject();
    response.questions = response.questions.map(q => ({
      questionText: q.questionText,
      options: q.options,
      marks: q.marks,
      difficulty: q.difficulty
    }));

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
};

exports.updateTest = async (req, res, next) => {
  try {
    const test = await MCQTest.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

    if (test.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (test.isPublished) {
      return res.status(400).json({ success: false, message: 'Cannot edit published test' });
    }

    Object.assign(test, req.body);
    await test.save();

    res.json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

exports.publishTest = async (req, res, next) => {
  try {
    const test = await MCQTest.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

    if (test.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (test.questions.length < 5) {
      return res.status(400).json({ success: false, message: 'Test must have at least 5 questions' });
    }

    if (new Date(test.startDateTime) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Start time must be in the future' });
    }

    test.isPublished = true;
    await test.save();

    res.json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

exports.unpublishTest = async (req, res, next) => {
  try {
    const test = await MCQTest.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

    if (test.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const attempts = await MCQAttempt.countDocuments({ test: req.params.id, status: 'SUBMITTED' });
    if (attempts > 0) {
      return res.status(400).json({ success: false, message: 'Cannot unpublish test with submitted attempts' });
    }

    test.isPublished = false;
    await test.save();

    res.json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

exports.deleteTest = async (req, res, next) => {
  try {
    const test = await MCQTest.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

    if (test.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }



    await MCQAttempt.deleteMany({ test: req.params.id });
    await test.deleteOne();

    res.json({ success: true, message: 'Test deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getTeacherTests = async (req, res, next) => {
  try {
    const tests = await MCQTest.find({ createdBy: req.user._id })
      .populate('class', 'name')
      .sort({ createdAt: -1 });

    const testsWithStats = await Promise.all(tests.map(async (test) => {
      const attempts = await MCQAttempt.find({ test: test._id, status: 'SUBMITTED' });
      const avgScore = attempts.length > 0 ? attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length : 0;
      const passRate = attempts.length > 0 ? (attempts.filter(a => a.isPassed).length / attempts.length) * 100 : 0;

      return {
        ...test.toObject(),
        attemptCount: attempts.length,
        avgScore: Math.round(avgScore),
        passRate: Math.round(passRate)
      };
    }));

    res.json({ success: true, data: testsWithStats });
  } catch (error) {
    next(error);
  }
};

exports.getAvailableTests = async (req, res, next) => {
  try {
    const now = new Date();
    const tests = await MCQTest.find({
      department: req.user.department,
      isPublished: true,
      startDateTime: { $lte: now },
      endDateTime: { $gte: now },
      $or: [
        { class: { $exists: false } },
        { class: null },
        ...(req.user.class ? [{ class: req.user.class }] : [])
      ]
    }).populate('createdBy', 'name');

    const testsWithStatus = await Promise.all(tests.map(async (test) => {
      const attempts = await MCQAttempt.find({ test: test._id, student: req.user._id });
      let status = 'NOT_STARTED';
      if (attempts.some(a => a.status === 'IN_PROGRESS')) status = 'IN_PROGRESS';
      else if (attempts.some(a => a.status === 'SUBMITTED')) status = 'SUBMITTED';

      const testObj = test.toObject();
      testObj.questions = testObj.questions.map(q => ({
        questionText: q.questionText,
        options: q.options,
        marks: q.marks,
        difficulty: q.difficulty
      }));

      return { ...testObj, attemptStatus: status };
    }));

    res.json({ success: true, data: testsWithStatus });
  } catch (error) {
    next(error);
  }
};

exports.startAttempt = async (req, res, next) => {
  try {
    const test = await MCQTest.findById(req.params.id);
    if (!test || !test.isPublished) {
      return res.status(404).json({ success: false, message: 'Test not available' });
    }

    const now = new Date();
    if (now < test.startDateTime || now > test.endDateTime) {
      return res.status(400).json({ success: false, message: 'Test not in active time window' });
    }
    if (test.department?.toString() !== req.user.department?.toString()) {
      return res.status(403).json({ success: false, message: 'This test is not in your department' });
    }
    if (test.class && test.class.toString() !== req.user.class?.toString()) {
      return res.status(403).json({ success: false, message: 'This test is not assigned to your class' });
    }

    const existingAttempts = await MCQAttempt.countDocuments({ test: req.params.id, student: req.user._id });
    if (existingAttempts >= test.maxAttempts) {
      return res.status(400).json({ success: false, message: 'Maximum attempts reached' });
    }

    const inProgress = await MCQAttempt.findOne({ test: req.params.id, student: req.user._id, status: 'IN_PROGRESS' });
    if (inProgress) {
      return res.status(400).json({ success: false, message: 'Resume existing attempt', attemptId: inProgress._id });
    }

    let questionOrder = test.questions.map((_, idx) => idx);
    if (test.randomizeQuestions) {
      questionOrder = questionOrder.sort(() => Math.random() - 0.5);
    }

    const attempt = await MCQAttempt.create({
      test: req.params.id,
      student: req.user._id,
      attemptNumber: existingAttempts + 1,
      questionOrder,
      startedAt: new Date(),
      ipAddress: req.ip
    });

    const questions = questionOrder.map(idx => ({
      index: idx,
      questionText: test.questions[idx].questionText,
      options: test.questions[idx].options,
      marks: test.questions[idx].marks,
      difficulty: test.questions[idx].difficulty
    }));

    res.json({ success: true, data: { attemptId: attempt._id, questions, duration: test.duration, questionOrder } });
  } catch (error) {
    next(error);
  }
};

exports.saveAnswer = async (req, res, next) => {
  try {
    const { questionIndex, selectedOption, timeTaken } = req.body;
    const attempt = await MCQAttempt.findById(req.params.attemptId);

    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'Invalid attempt' });
    }

    const answerIndex = attempt.answers.findIndex(a => a.questionIndex === questionIndex);
    if (answerIndex > -1) {
      attempt.answers[answerIndex].selectedOption = selectedOption;
      attempt.answers[answerIndex].timeTaken = timeTaken;
    } else {
      attempt.answers.push({ questionIndex, selectedOption, timeTaken });
    }

    await attempt.save();
    res.json({ success: true, saved: true });
  } catch (error) {
    next(error);
  }
};

exports.submitAttempt = async (req, res, next) => {
  try {
    const attempt = await MCQAttempt.findById(req.params.attemptId).populate('test');
    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'Invalid attempt' });
    }

    const test = attempt.test;
    let totalScore = 0;

    attempt.answers.forEach(ans => {
      const question = test.questions[ans.questionIndex];
      const isCorrect = question.correctAnswer === ans.selectedOption;
      ans.isCorrect = isCorrect;
      ans.marksAwarded = isCorrect ? question.marks : 0;
      totalScore += ans.marksAwarded;
    });

    attempt.totalScore = totalScore;
    attempt.totalMarks = test.totalMarks;
    attempt.percentage = (totalScore / test.totalMarks) * 100;
    attempt.grade = MCQAttempt.calculateGrade(attempt.percentage);
    attempt.isPassed = totalScore >= test.passingMarks;
    attempt.status = 'SUBMITTED';
    attempt.submittedAt = new Date();
    attempt.timeUsed = Math.floor((attempt.submittedAt - attempt.startedAt) / 1000);

    await attempt.save();
    await gamificationService.checkAndAwardBadges(req.user._id);

    if (test.showResultImmediately) {
      const result = attempt.toObject();
      result.test = test;
      return res.json({ success: true, data: result });
    }

    res.json({ success: true, message: 'Test submitted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.autoTimeout = async (req, res, next) => {
  try {
    const attempt = await MCQAttempt.findById(req.params.attemptId).populate('test');
    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'Invalid attempt' });
    }

    attempt.status = 'TIMED_OUT';
    const test = attempt.test;
    let totalScore = 0;

    attempt.answers.forEach(ans => {
      const question = test.questions[ans.questionIndex];
      const isCorrect = question.correctAnswer === ans.selectedOption;
      ans.isCorrect = isCorrect;
      ans.marksAwarded = isCorrect ? question.marks : 0;
      totalScore += ans.marksAwarded;
    });

    attempt.totalScore = totalScore;
    attempt.totalMarks = test.totalMarks;
    attempt.percentage = (totalScore / test.totalMarks) * 100;
    attempt.grade = MCQAttempt.calculateGrade(attempt.percentage);
    attempt.isPassed = totalScore >= test.passingMarks;
    attempt.submittedAt = new Date();

    await attempt.save();

    res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

exports.getResult = async (req, res, next) => {
  try {
    const attempt = await MCQAttempt.findById(req.params.attemptId).populate('test student');
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

    if (attempt.student._id.toString() !== req.user._id.toString() && req.user.role !== 'PROFESSOR') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

exports.getTestResults = async (req, res, next) => {
  try {
    const test = await MCQTest.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

    if (test.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const attempts = await MCQAttempt.find({ test: req.params.id, status: 'SUBMITTED' })
      .populate('student', 'name rollNumber');

    const stats = {
      totalAttempts: attempts.length,
      avgScore: attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length || 0,
      highest: Math.max(...attempts.map(a => a.percentage), 0),
      lowest: Math.min(...attempts.map(a => a.percentage), 100),
      passRate: (attempts.filter(a => a.isPassed).length / attempts.length) * 100 || 0,
      gradeDistribution: {
        'A+': attempts.filter(a => a.grade === 'A+').length,
        'A': attempts.filter(a => a.grade === 'A').length,
        'B': attempts.filter(a => a.grade === 'B').length,
        'C': attempts.filter(a => a.grade === 'C').length,
        'D': attempts.filter(a => a.grade === 'D').length,
        'F': attempts.filter(a => a.grade === 'F').length
      }
    };

    res.json({ success: true, data: { stats, attempts } });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
