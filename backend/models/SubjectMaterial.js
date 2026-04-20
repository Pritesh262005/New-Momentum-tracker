const mongoose = require('mongoose');

const subjectMaterialSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  title: { type: String, required: true, maxlength: 200 },
  unitNumber: { type: Number, min: 1, max: 12, default: 1, index: true },
  materialType: { type: String, enum: ['TEXT', 'PDF', 'TEXT_AND_PDF'], default: 'TEXT' },
  body: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  attachment: {
    fileName: { type: String },
    filePath: { type: String },
    fileSize: { type: Number },
    mimeType: { type: String }
  },

  scope: { type: String, enum: ['DEPARTMENT', 'CLASS', 'STUDENTS', 'YEAR_SEMESTER'], default: 'DEPARTMENT', index: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  targetYear: { type: Number, min: 1, max: 4 },
  targetSemester: { type: Number, min: 1, max: 8 },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }]
}, { timestamps: true });

subjectMaterialSchema.index({ subject: 1, createdAt: -1 });

module.exports = mongoose.model('SubjectMaterial', subjectMaterialSchema);
