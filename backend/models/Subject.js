const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  description: String,
  credits: { type: Number, default: 3 },
  year: { type: Number, min: 1, max: 4, required: true },
  semester: { type: Number, min: 1, max: 8, required: true },
  syllabusFileName: { type: String },
  syllabusFilePath: { type: String },
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

subjectSchema.pre('validate', function(next) {
  if (this.semester && !this.year) {
    this.year = Math.ceil(Number(this.semester) / 2);
  }

  if (this.year && this.semester) {
    const expectedYear = Math.ceil(Number(this.semester) / 2);
    if (expectedYear !== Number(this.year)) {
      return next(new Error('Subject year must match semester'));
    }
  }
  next();
});

subjectSchema.index({ department: 1, year: 1, semester: 1, name: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
