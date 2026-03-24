const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  description: String,
  credits: { type: Number, default: 3 },
  semester: Number,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
