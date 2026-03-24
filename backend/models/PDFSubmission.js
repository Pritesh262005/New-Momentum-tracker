const mongoose = require('mongoose');

const pdfSubmissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'PDFAssignment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filePath: { type: String, required: true },
  fileName: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  isLate: { type: Boolean, default: false },
  grade: { type: Number, min: 0, max: 100 },
  feedback: { type: String },
  gradedAt: { type: Date },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

pdfSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('PDFSubmission', pdfSubmissionSchema);
