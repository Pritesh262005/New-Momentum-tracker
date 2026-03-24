const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatGroup', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 2000 }
}, { timestamps: true });

chatMessageSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

