const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'HOD', 'TEACHER', 'STUDENT'], required: true },
  userId: { type: String, unique: true, sparse: true },
  rollNumber: { type: String },
  phone: { type: String },
  address: { type: String },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  isActive: { type: Boolean, default: true },
  isFirstLogin: { type: Boolean, default: true },
  isTempPassword: { type: Boolean, default: true },
  tempPasswordExpiry: { type: Date },
  isEmailVerified: { type: Boolean, default: false },
  profilePicture: { type: String },
  xpPoints: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  lastStudyDate: { type: Date },
  lastLoginAt: { type: Date },
  loginCount: { type: Number, default: 0 },
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deactivationReason: { type: String },
  reactivationDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
