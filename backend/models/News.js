const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  content: { type: String, required: true, maxlength: 10000 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorRole: { type: String, enum: ['ADMIN', 'HOD', 'TEACHER', 'PROFESSOR'], required: true },
  targetType: { 
    type: String, 
    enum: [
      'ALL_USERS', 'ALL_HOD', 'SPECIFIC_HOD', 'ALL_DEPARTMENTS', 'SPECIFIC_DEPARTMENT',
      'ALL_TEACHERS', 'ALL_STUDENTS', 'DEPT_ALL', 'DEPT_TEACHERS', 'DEPT_STUDENTS',
      'SPECIFIC_DEPT_HOD', 'CLASS_STUDENTS'
    ],
    required: true
  },
  targetDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetClass: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  isPinned: { type: Boolean, default: false },
  commentsEnabled: { type: Boolean, default: true },
  commentsLocked: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tags: [{ type: String }],
  attachments: [{
    fileName: String,
    filePath: String,
    fileSize: Number
  }],
  expiresAt: { type: Date }
}, { timestamps: true });

newsSchema.index({ targetType: 1 });
newsSchema.index({ targetDepartment: 1 });
newsSchema.index({ author: 1 });
newsSchema.index({ createdAt: -1 });

module.exports = mongoose.model('News', newsSchema);
