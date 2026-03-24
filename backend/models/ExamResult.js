const mongoose = require('mongoose');

const examMarkSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  marks: { type: Number, min: 0, required: true },
  maxMarks: { type: Number, min: 1, required: true }
}, { _id: false });

const examResultSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  examDate: { type: Date, required: true, index: true },
  marks: { type: [examMarkSchema], default: [] },
  avg: { type: Number, min: 0, max: 100, default: 0 }, // percentage
  totalMarks: { type: Number, default: 0 },
  totalMaxMarks: { type: Number, default: 0 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

examResultSchema.index({ exam: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('ExamResult', examResultSchema);

