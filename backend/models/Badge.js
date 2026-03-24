const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['STREAK_MASTER', 'ACCURACY_EXPERT', 'TIME_CHAMPION', 'MOMENTUM_KING', 'TOP_PERFORMER'],
    required: true
  },
  awardedAt: { type: Date, default: Date.now },
  description: { type: String }
});

module.exports = mongoose.model('Badge', badgeSchema);
