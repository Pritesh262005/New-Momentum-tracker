const mongoose = require('mongoose');

const examSubjectSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true }
}, { _id: false });

const examSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 200 },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  date: { type: Date, required: true },
  subjects: { type: [examSubjectSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

examSchema.index({ department: 1, date: -1 });

module.exports = mongoose.model('Exam', examSchema);

