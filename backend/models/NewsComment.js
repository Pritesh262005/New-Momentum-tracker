const mongoose = require('mongoose');

const newsCommentSchema = new mongoose.Schema({
  news: { type: mongoose.Schema.Types.ObjectId, ref: 'News', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isEdited: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('NewsComment', newsCommentSchema);
