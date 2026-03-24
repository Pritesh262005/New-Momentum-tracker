const mongoose = require('mongoose');

const momentumScoreSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, min: 0, max: 100 },
  consistency: { type: Number },
  improvement: { type: Number },
  focus: { type: Number },
  mood: { type: Number },
  weekStart: { type: Date },
  weekEnd: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('MomentumScore', momentumScoreSchema);
