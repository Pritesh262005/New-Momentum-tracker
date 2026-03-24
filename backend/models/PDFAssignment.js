const mongoose = require('mongoose');

const pdfAssignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  professor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject: { type: String, required: true },
  dueDate: { type: Date, required: true },
  maxMarks: { type: Number, default: 100 }
}, { timestamps: true });

module.exports = mongoose.model('PDFAssignment', pdfAssignmentSchema);
