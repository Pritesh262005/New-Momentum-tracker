const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 150 },
  description: { type: String, required: true },
  subject: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
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

module.exports = mongoose.model('Assignment', assignmentSchema);
