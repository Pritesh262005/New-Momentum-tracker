const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  level: { type: Number, required: true, min: 1, max: 5 },
  note: { type: String },
  date: { type: Date, required: true, default: () => new Date().setHours(0, 0, 0, 0) }
}, { timestamps: true });

moodSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Mood', moodSchema);
