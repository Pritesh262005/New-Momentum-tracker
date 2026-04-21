const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  periods: [{ type: Number, min: 1, max: 7 }],
  date: { type: Date, default: Date.now },
  markedAt: { type: Date, default: Date.now }
}, { timestamps: true });

attendanceRecordSchema.index({ student: 1, date: 1, periods: 1 }, { unique: true });
attendanceRecordSchema.index({ session: 1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
