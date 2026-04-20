const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 150 },
  description: { type: String, required: true },
  subject: { type: String, required: true },
  submissionType: { type: String, enum: ['PDF', 'CODE_JS'], default: 'PDF' },
  codeSpec: {
    functionName: { type: String, default: 'solve' },
    timeoutMs: { type: Number, default: 3000 },
    tests: [{
      input: { type: String },
      expected: { type: String }
    }]
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  targetYear: { type: Number, min: 1, max: 4 },
  targetSemester: { type: Number, min: 1, max: 8 },
  assignmentFile: {
    fileName: { type: String },
    filePath: { type: String },
    fileSize: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  },
  dueDate: { type: Date, required: true },
  totalMarks: { type: Number, required: true, min: 1, max: 100 },
  instructions: { type: String },
  allowLateSubmission: { type: Boolean, default: false },
  latePenaltyPercent: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date }
}, { timestamps: true });

assignmentSchema.pre('validate', function(next) {
  if (this.targetSemester && !this.targetYear) {
    this.targetYear = Math.ceil(Number(this.targetSemester) / 2);
  }
  if (this.targetYear && this.targetSemester) {
    const expectedYear = Math.ceil(Number(this.targetSemester) / 2);
    if (expectedYear !== Number(this.targetYear)) {
      return next(new Error('Assignment year must match semester'));
    }
  }
  next();
});

module.exports = mongoose.model('Assignment', assignmentSchema);
