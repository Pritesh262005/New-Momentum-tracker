const mongoose = require('mongoose');

const hierarchicalMeetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  level: { type: String, enum: ['ADMIN_LEVEL', 'DEPARTMENT_LEVEL'], required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  scheduledAt: { type: Date, required: true },
  duration: { type: Number },
  location: { type: String },
  isOnline: { type: Boolean, default: false },
  meetingLink: { type: String },
  notes: { type: String },
  status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], default: 'SCHEDULED' },
  attendance: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attended: { type: Boolean }
  }]
}, { timestamps: true });

module.exports = mongoose.model('HierarchicalMeeting', hierarchicalMeetingSchema);
