const mongoose = require('mongoose');

const mcqAttemptSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'MCQTest', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attemptNumber: { type: Number, default: 1 },
  questionOrder: [{ type: Number }],
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId },
    questionIndex: { type: Number },
    selectedOption: { type: Number, min: 0, max: 3 },
    isCorrect: { type: Boolean },
    marksAwarded: { type: Number },
    timeTaken: { type: Number }
  }],
  totalScore: { type: Number },
  totalMarks: { type: Number },
  percentage: { type: Number },
  grade: { type: String },
  isPassed: { type: Boolean },
  startedAt: { type: Date, required: true },
  submittedAt: { type: Date },
  timeUsed: { type: Number },
  status: { type: String, enum: ['IN_PROGRESS', 'SUBMITTED', 'TIMED_OUT', 'ABANDONED'], default: 'IN_PROGRESS' },
  ipAddress: { type: String }
}, { timestamps: true });

mcqAttemptSchema.index({ test: 1, student: 1, attemptNumber: 1 }, { unique: true });

mcqAttemptSchema.statics.calculateGrade = function(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

module.exports = mongoose.model('MCQAttempt', mcqAttemptSchema);
