const mongoose = require('mongoose');

const chatGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 80 },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  audience: { type: String, enum: ['ALL', 'STUDENTS', 'TEACHERS'], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isSystem: { type: Boolean, default: false }
}, { timestamps: true });

chatGroupSchema.index({ department: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ChatGroup', chatGroupSchema);

