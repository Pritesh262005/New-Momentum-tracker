const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const Subject = require('../models/Subject');
const User = require('../models/User');

// Helper to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const createSession = async (req, res, next) => {
  try {
    const { subjectId, periods, year, semester, durationMinutes = 10 } = req.body;

    if (!periods || !Array.isArray(periods) || periods.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one period' });
    }

    const teacher = await User.findById(req.user._id);
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + durationMinutes * 60000);

    const session = await AttendanceSession.create({
      teacher: req.user._id,
      subject: subjectId,
      periods,
      otp,
      expiresAt,
      department: teacher.department,
      year,
      semester,
      date: new Date().setHours(0, 0, 0, 0)
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId: session._id,
        otp,
        expiresAt,
        periods
      }
    });
  } catch (error) {
    next(error);
  }
};

const markAttendance = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const studentId = req.user._id;

    const session = await AttendanceSession.findOne({
      otp,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Check if already marked for this session or these periods today
    const existing = await AttendanceRecord.findOne({
      student: studentId,
      date: session.date,
      periods: { $in: session.periods }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Attendance already marked for these periods today' });
    }

    const record = await AttendanceRecord.create({
      student: studentId,
      session: session._id,
      subject: session.subject,
      periods: session.periods,
      date: session.date
    });

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

const getSessionStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await AttendanceSession.findById(sessionId).populate('subject', 'name');
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const count = await AttendanceRecord.countDocuments({ session: sessionId });

    res.json({
      success: true,
      data: {
        presentCount: count,
        otp: session.otp,
        expiresAt: session.expiresAt,
        isActive: session.isActive && session.expiresAt > new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherAttendanceHistory = async (req, res, next) => {
  try {
    const sessions = await AttendanceSession.find({ teacher: req.user._id })
      .populate('subject', 'name code')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const history = await Promise.all(sessions.map(async (s) => {
      const count = await AttendanceRecord.countDocuments({ session: s._id });
      return { ...s, presentCount: count };
    }));

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

const getStudentAttendanceHistory = async (req, res, next) => {
  try {
    const history = await AttendanceRecord.find({ student: req.user._id })
      .populate('subject', 'name code')
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  markAttendance,
  getSessionStatus,
  getTeacherAttendanceHistory,
  getStudentAttendanceHistory
};
