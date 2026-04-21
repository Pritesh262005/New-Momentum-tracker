const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submissionFile: {
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  },
  isLate: { type: Boolean, default: false },
  lateByHours: { type: Number },
  status: { type: String, enum: ['SUBMITTED', 'GRADED', 'RETURNED'], default: 'SUBMITTED' },
  grade: { type: Number, min: 0, max: 100 },
  finalGrade: { type: Number },
  percentage: { type: Number },
  letterGrade: { type: String },
  feedback: { type: String },
  rubricScores: [{
    criterion: String,
    score: Number,
    maxScore: Number
  }],
  plagiarism: {
    checkedAt: { type: Date },
    threshold: { type: Number },
    topSimilarity: { type: Number },
    suspicious: { type: Boolean, default: false },
    matches: [{
      submission: { type: mongoose.Schema.Types.ObjectId, ref: 'AssignmentSubmission' },
      student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      studentName: { type: String },
      similarity: { type: Number }
    }]
  },
  grammar: {
    score: { type: Number },
    summary: { type: String },
    details: [String]
  },
  autoGrade: {
    status: { type: String, enum: ['NOT_RUN', 'PASSED', 'FAILED', 'ERROR'], default: 'NOT_RUN' },
    ranAt: { type: Date },
    functionName: { type: String },
    totalTests: { type: Number },
    passedTests: { type: Number },
    percentage: { type: Number },
    summary: { type: String },
    results: [{
      index: { type: Number },
      input: { type: String },
      expected: { type: String },
      actual: { type: String },
      passed: { type: Boolean }
    }]
  },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gradedAt: { type: Date },
  returnedAt: { type: Date }
}, { timestamps: true });

assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
