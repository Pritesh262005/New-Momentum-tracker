const ChatGroup = require('../models/ChatGroup');
const ChatMessage = require('../models/ChatMessage');

const isTeacherLike = (role) => ['TEACHER', 'HOD', 'PROFESSOR'].includes(role);

const canAccessGroup = (user, group) => {
  if (!user?.department || !group?.department) return false;
  if (group.department.toString() !== user.department.toString()) return false;

  if (group.audience === 'STUDENTS') return user.role === 'STUDENT';
  if (group.audience === 'TEACHERS') return isTeacherLike(user.role);
  // Legacy/back-compat: treat ALL as teacher-like only (prevents mixed student/teacher chats).
  if (group.audience === 'ALL') return isTeacherLike(user.role);
  return false;
};

const ensureDefaultGroups = async (departmentId, createdBy) => {
  const defaults = [
    { name: 'Department Students', audience: 'STUDENTS' },
    { name: 'Department Teachers', audience: 'TEACHERS' }
  ];

  await Promise.all(defaults.map(async (g) => {
    const existing = await ChatGroup.findOne({ department: departmentId, name: g.name });
    if (existing) return;
    await ChatGroup.create({
      department: departmentId,
      name: g.name,
      audience: g.audience,
      createdBy,
      isSystem: true
    });
  }));
};

exports.getGroups = async (req, res, next) => {
  try {
    if (!req.user.department) return res.json({ success: true, data: [] });

    await ensureDefaultGroups(req.user.department, req.user._id);

    const groups = await ChatGroup.find({ department: req.user.department }).sort({ isSystem: -1, name: 1 });
    const visible = groups.filter((g) => canAccessGroup(req.user, g));
    res.json({ success: true, data: visible });
  } catch (error) {
    next(error);
  }
};

exports.createGroup = async (req, res, next) => {
  try {
    if (!isTeacherLike(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    if (!req.user.department) {
      return res.status(400).json({ success: false, message: 'Your account is missing department' });
    }

    const group = await ChatGroup.create({
      department: req.user.department,
      name: name.trim(),
      audience: 'TEACHERS',
      createdBy: req.user._id,
      isSystem: false
    });

    res.status(201).json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 50));
    const before = req.query.before ? new Date(req.query.before) : null;

    const group = await ChatGroup.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!canAccessGroup(req.user, group)) return res.status(403).json({ success: false, message: 'Access denied' });

    const query = { group: group._id };
    if (before && !Number.isNaN(before.getTime())) query.createdAt = { $lt: before };

    const messages = await ChatMessage.find(query)
      .populate('sender', 'name role')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ success: false, message: 'Message text required' });

    const group = await ChatGroup.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!canAccessGroup(req.user, group)) return res.status(403).json({ success: false, message: 'Access denied' });

    const msg = await ChatMessage.create({
      group: group._id,
      sender: req.user._id,
      text
    });

    const populated = await ChatMessage.findById(msg._id).populate('sender', 'name role');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
