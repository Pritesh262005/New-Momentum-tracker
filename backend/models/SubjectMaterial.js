const mongoose = require('mongoose');

const subjectMaterialSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  scope: { type: String, enum: ['DEPARTMENT', 'CLASS', 'STUDENTS'], default: 'DEPARTMENT', index: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }]
}, { timestamps: true });

subjectMaterialSchema.index({ subject: 1, createdAt: -1 });

module.exports = mongoose.model('SubjectMaterial', subjectMaterialSchema);

