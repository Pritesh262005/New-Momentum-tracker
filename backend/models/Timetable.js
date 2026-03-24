const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  day: { 
    type: String, 
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  periods: [{
    periodNumber: { type: Number },
    startTime: { type: String },
    endTime: { type: String },
    subject: { type: String },
    professor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);
