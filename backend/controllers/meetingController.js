const HierarchicalMeeting = require('../models/HierarchicalMeeting');
const User = require('../models/User');
const { sendMeetingInviteEmail } = require('../services/emailService');
const auditLogger = require('../utils/auditLogger');

exports.createAdminMeeting = async (req, res, next) => {
  try {
    const { title, description, participantIds, scheduledAt, duration, isOnline, meetingLink, location } = req.body;

    const participants = await User.find({ _id: { $in: participantIds }, role: 'HOD' });
    if (participants.length !== participantIds.length) {
      return res.status(400).json({ success: false, message: 'All participants must be HODs' });
    }

    const meeting = await HierarchicalMeeting.create({
      title, description, organizer: req.user._id, level: 'ADMIN_LEVEL',
      participants: participantIds, scheduledAt, duration, isOnline, meetingLink, location
    });

    for (const participant of participants) await sendMeetingInviteEmail(participant, meeting);
    await auditLogger(req.user._id, 'ADMIN_MEETING_CREATED', { meetingId: meeting._id }, req.ip);

    res.status(201).json({ success: true, data: meeting });
  } catch (error) {
    next(error);
  }
};

exports.createDepartmentMeeting = async (req, res, next) => {
  try {
    const { title, description, participantIds, scheduledAt, duration, isOnline, meetingLink, location } = req.body;

    const participants = await User.find({
      _id: { $in: participantIds }, role: 'PROFESSOR', department: req.user.department
    });

    if (participants.length !== participantIds.length) {
      return res.status(400).json({ success: false, message: 'All participants must be professors in your department' });
    }

    const meeting = await HierarchicalMeeting.create({
      title, description, organizer: req.user._id, level: 'DEPARTMENT_LEVEL',
      department: req.user.department, participants: participantIds,
      scheduledAt, duration, isOnline, meetingLink, location
    });

    for (const participant of participants) await sendMeetingInviteEmail(participant, meeting);

    res.status(201).json({ success: true, data: meeting });
  } catch (error) {
    next(error);
  }
};

exports.getAllMeetings = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role !== 'ADMIN') {
      filter.$or = [{ organizer: req.user._id }, { participants: req.user._id }];
    }

    const meetings = await HierarchicalMeeting.find(filter)
      .populate('organizer participants', 'name email').sort({ scheduledAt: -1 });
    res.json({ success: true, data: meetings });
  } catch (error) {
    next(error);
  }
};

exports.getMeetingById = async (req, res, next) => {
  try {
    const meeting = await HierarchicalMeeting.findById(req.params.id)
      .populate('organizer participants', 'name email role');
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, data: meeting });
  } catch (error) {
    next(error);
  }
};

exports.markAttendance = async (req, res, next) => {
  try {
    const { meetingId, userId, attended } = req.body;
    const meeting = await HierarchicalMeeting.findById(meetingId);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const canMark = req.user.role === 'ADMIN' || meeting.organizer.toString() === req.user._id.toString();
    if (!canMark) return res.status(403).json({ success: false, message: 'Not authorized' });

    const existingIndex = meeting.attendance.findIndex(a => a.user.toString() === userId);
    if (existingIndex > -1) meeting.attendance[existingIndex].attended = attended;
    else meeting.attendance.push({ user: userId, attended });

    await meeting.save();
    res.json({ success: true, data: meeting });
  } catch (error) {
    next(error);
  }
};

exports.getMeetingAttendance = async (req, res, next) => {
  try {
    const meeting = await HierarchicalMeeting.findById(req.params.meetingId)
      .populate('attendance.user', 'name email role');
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, data: meeting.attendance });
  } catch (error) {
    next(error);
  }
};
