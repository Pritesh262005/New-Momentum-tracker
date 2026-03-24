const mongoose = require('mongoose');

const studyLogSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  duration: { type: Number, required: true, min: 1 },
  questionsAttempted: { type: Number, default: 0, min: 0 },
  questionsCorrect: { type: Number, default: 0, min: 0 },
  notes: { type: String },
  date: { type: Date, required: true, max: Date.now }
}, { timestamps: true });

studyLogSchema.virtual('accuracy').get(function() {
  if (this.questionsAttempted === 0) return 0;
  return (this.questionsCorrect / this.questionsAttempted) * 100;
});

studyLogSchema.pre('save', function(next) {
  if (this.questionsCorrect > this.questionsAttempted) {
    next(new Error('Questions correct cannot exceed questions attempted'));
  }
  next();
});

module.exports = mongoose.model('StudyLog', studyLogSchema);
