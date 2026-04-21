const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  periods: [{ type: Number, min: 1, max: 7 }],
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  date: { type: Date, default: Date.now },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  year: { type: Number, required: true },
  semester: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

attendanceSessionSchema.index({ otp: 1 });
attendanceSessionSchema.index({ teacher: 1, date: -1 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
