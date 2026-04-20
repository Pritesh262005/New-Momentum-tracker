const mongoose = require('mongoose');

const mcqTestSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 150 },
  description: { type: String, maxlength: 500 },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  targetYear: { type: Number, min: 1, max: 4 },
  targetSemester: { type: Number, min: 1, max: 8 },
  questions: [{
    questionText: { type: String, required: true },
    options: {
      type: [String],
      validate: {
        validator: function(v) { return v.length === 4; },
        message: 'Must have exactly 4 options'
      }
    },
    correctAnswer: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String },
    marks: { type: Number, default: 1, min: 1, max: 10 },
    difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' }
  }],
  totalMarks: { type: Number },
  passingMarks: { type: Number, required: true, min: 1 },
  duration: { type: Number, required: true, min: 5, max: 180 },
  startDateTime: { type: Date, required: true },
  endDateTime: { type: Date, required: true },
  isPublished: { type: Boolean, default: false },
  randomizeQuestions: { type: Boolean, default: false },
  randomizeOptions: { type: Boolean, default: false },
  showResultImmediately: { type: Boolean, default: true },
  allowReview: { type: Boolean, default: true },
  maxAttempts: { type: Number, default: 1 },
  instructions: { type: String }
}, { timestamps: true });

mcqTestSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalMarks = this.questions.reduce((sum, q) => sum + q.marks, 0);
  }
  if (this.targetSemester && !this.targetYear) {
    this.targetYear = Math.ceil(Number(this.targetSemester) / 2);
  }
  next();
});

module.exports = mongoose.model('MCQTest', mcqTestSchema);
