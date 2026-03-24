const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['WEAK_TOPIC', 'CONSISTENCY', 'BURNOUT', 'OVERLOAD', 'STREAK'],
    required: true
  },
  message: { type: String, required: true },
  subject: { type: String },
  topic: { type: String },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Recommendation', recommendationSchema);
