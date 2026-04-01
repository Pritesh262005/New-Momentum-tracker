const mongoose = require('mongoose');

const studentNotificationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['SUBJECT_MATERIAL'], required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  material: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectMaterial', required: true, index: true },
  message: { type: String, default: '' },
  isRead: { type: Boolean, default: false, index: true }
}, { timestamps: true });

studentNotificationSchema.index({ student: 1, isRead: 1, createdAt: -1 });
studentNotificationSchema.index({ student: 1, material: 1 }, { unique: true });

module.exports = mongoose.model('StudentNotification', studentNotificationSchema);

