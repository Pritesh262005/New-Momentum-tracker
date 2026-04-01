const mongoose = require('mongoose');

const studentSubjectNoteSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  material: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectMaterial' },
  content: { type: String, default: '' }
}, { timestamps: true });

studentSubjectNoteSchema.index({ student: 1, subject: 1, material: 1 }, { unique: true });

module.exports = mongoose.model('StudentSubjectNote', studentSubjectNoteSchema);

