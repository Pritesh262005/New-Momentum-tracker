const Subject = require('../models/Subject');
const User = require('../models/User');
const Class = require('../models/Class');
const SubjectMaterial = require('../models/SubjectMaterial');
const StudentSubjectNote = require('../models/StudentSubjectNote');
const StudentNotification = require('../models/StudentNotification');

const isValidObjectId = (id) => typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);

const ensureSameDepartmentSubject = async (subjectId, departmentId) => {
  const subject = await Subject.findById(subjectId).select('_id name department').lean();
  if (!subject) return { ok: false, status: 404, message: 'Subject not found' };
  if (departmentId && subject.department?.toString() !== departmentId.toString()) {
    return { ok: false, status: 403, message: 'Subject is not in your department' };
  }
  return { ok: true, subject };
};

const getStudentSubjects = async (req, res, next) => {
  try {
    const student = req.user;
    const departmentId = student.department;
    if (!departmentId) return res.json({ success: true, data: [] });

    const [subjects, unreadAgg] = await Promise.all([
      Subject.find({ department: departmentId, isActive: true }).sort({ semester: 1, name: 1 }).lean(),
      StudentNotification.aggregate([
        { $match: { student: student._id, isRead: false, type: 'SUBJECT_MATERIAL' } },
        { $group: { _id: '$subject', count: { $sum: 1 } } }
      ])
    ]);

    const unreadBySubject = new Map(unreadAgg.map((r) => [r._id.toString(), r.count]));
    const rows = (subjects || []).map((s) => ({
      _id: s._id,
      name: s.name,
      code: s.code,
      description: s.description,
      credits: s.credits,
      semester: s.semester,
      unreadCount: unreadBySubject.get(s._id.toString()) || 0
    }));

    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

const getStudentSubjectMaterials = async (req, res, next) => {
  try {
    const student = req.user;
    const { subjectId } = req.params;
    if (!isValidObjectId(subjectId)) return res.status(400).json({ success: false, message: 'Invalid subject id' });

    const chk = await ensureSameDepartmentSubject(subjectId, student.department);
    if (!chk.ok) return res.status(chk.status).json({ success: false, message: chk.message });

    const [materials, unread] = await Promise.all([
      SubjectMaterial.find({ subject: subjectId, recipients: student._id })
        .select('_id title createdAt createdBy')
        .populate('createdBy', 'name role')
        .sort({ createdAt: -1 })
        .lean(),
      StudentNotification.find({ student: student._id, subject: subjectId, isRead: false, type: 'SUBJECT_MATERIAL' })
        .select('material')
        .lean()
    ]);

    const unreadSet = new Set((unread || []).map((n) => n.material.toString()));
    const rows = (materials || []).map((m) => ({
      _id: m._id,
      title: m.title,
      createdAt: m.createdAt,
      createdBy: m.createdBy,
      unread: unreadSet.has(m._id.toString())
    }));

    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

const getStudentMaterialDetail = async (req, res, next) => {
  try {
    const student = req.user;
    const { materialId } = req.params;
    if (!isValidObjectId(materialId)) return res.status(400).json({ success: false, message: 'Invalid material id' });

    const material = await SubjectMaterial.findOne({ _id: materialId, recipients: student._id })
      .populate('subject', 'name code')
      .populate('createdBy', 'name role')
      .lean();

    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });

    res.json({ success: true, data: material });
  } catch (e) {
    next(e);
  }
};

const markMaterialRead = async (req, res, next) => {
  try {
    const student = req.user;
    const { materialId } = req.params;
    if (!isValidObjectId(materialId)) return res.status(400).json({ success: false, message: 'Invalid material id' });

    await StudentNotification.updateOne(
      { student: student._id, material: materialId, type: 'SUBJECT_MATERIAL' },
      { $set: { isRead: true } }
    );

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

const getMyNote = async (req, res, next) => {
  try {
    const student = req.user;
    const { subjectId, materialId } = req.query;
    if (!isValidObjectId(subjectId)) return res.status(400).json({ success: false, message: 'Invalid subject id' });
    if (materialId && !isValidObjectId(materialId)) return res.status(400).json({ success: false, message: 'Invalid material id' });

    const chk = await ensureSameDepartmentSubject(subjectId, student.department);
    if (!chk.ok) return res.status(chk.status).json({ success: false, message: chk.message });

    const note = await StudentSubjectNote.findOne({
      student: student._id,
      subject: subjectId,
      material: materialId || null
    }).lean();

    res.json({ success: true, data: note || { content: '' } });
  } catch (e) {
    next(e);
  }
};

const upsertMyNote = async (req, res, next) => {
  try {
    const student = req.user;
    const { subjectId, materialId, content } = req.body;
    if (!isValidObjectId(subjectId)) return res.status(400).json({ success: false, message: 'Invalid subject id' });
    if (materialId && !isValidObjectId(materialId)) return res.status(400).json({ success: false, message: 'Invalid material id' });

    const chk = await ensureSameDepartmentSubject(subjectId, student.department);
    if (!chk.ok) return res.status(chk.status).json({ success: false, message: chk.message });

    const note = await StudentSubjectNote.findOneAndUpdate(
      { student: student._id, subject: subjectId, material: materialId || null },
      { $set: { content: String(content || '') } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ success: true, data: note });
  } catch (e) {
    next(e);
  }
};

const getUploaderTargets = async (req, res, next) => {
  try {
    const user = req.user;
    const departmentId = user.department;

    const [subjects, classes] = await Promise.all([
      Subject.find({ department: departmentId, isActive: true }).sort({ name: 1 }).lean(),
      Class.find(
        user.role === 'TEACHER' ? { department: departmentId, teacher: user._id } : { department: departmentId }
      )
        .select('_id name semester year')
        .lean()
    ]);

    const students = await User.find({ role: 'STUDENT', department: departmentId, isActive: true })
      .select('_id name rollNumber')
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, data: { subjects, classes, students } });
  } catch (e) {
    next(e);
  }
};

const createMaterial = async (req, res, next) => {
  try {
    const user = req.user;
    const { subjectId, title, body, scope, classId, studentIds } = req.body;
    if (!isValidObjectId(subjectId)) return res.status(400).json({ success: false, message: 'Invalid subject id' });
    const t = String(title || '').trim();
    if (!t) return res.status(400).json({ success: false, message: 'Title is required' });

    const chk = await ensureSameDepartmentSubject(subjectId, user.department);
    if (!chk.ok) return res.status(chk.status).json({ success: false, message: chk.message });

    const safeScope = ['DEPARTMENT', 'CLASS', 'STUDENTS'].includes(scope) ? scope : 'DEPARTMENT';

    let recipients = [];
    let classRef = null;
    let studentsRef = [];

    if (safeScope === 'CLASS') {
      if (!isValidObjectId(classId)) return res.status(400).json({ success: false, message: 'classId is required' });
      const cls = await Class.findById(classId).select('_id department students teacher').lean();
      if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
      if (cls.department?.toString() !== user.department?.toString()) {
        return res.status(403).json({ success: false, message: 'Class is not in your department' });
      }
      if (user.role === 'TEACHER' && cls.teacher?.toString() !== user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only send to your own classes' });
      }
      classRef = cls._id;
      recipients = (cls.students || []).map((s) => s.toString());
    } else if (safeScope === 'STUDENTS') {
      const ids = Array.isArray(studentIds) ? studentIds.filter(isValidObjectId) : [];
      if (ids.length === 0) return res.status(400).json({ success: false, message: 'studentIds is required' });
      const found = await User.find({ _id: { $in: ids }, role: 'STUDENT', department: user.department, isActive: true })
        .select('_id')
        .lean();
      recipients = found.map((s) => s._id.toString());
      studentsRef = recipients;
      if (recipients.length === 0) return res.status(400).json({ success: false, message: 'No valid students selected' });
    } else {
      const deptStudents = await User.find({ role: 'STUDENT', department: user.department, isActive: true })
        .select('_id')
        .lean();
      recipients = deptStudents.map((s) => s._id.toString());
    }

    const material = await SubjectMaterial.create({
      subject: subjectId,
      title: t,
      body: String(body || ''),
      createdBy: user._id,
      scope: safeScope,
      class: classRef,
      students: studentsRef,
      recipients
    });

    const message = `New notes shared: ${t}`;
    const notificationDocs = recipients.map((id) => ({
      student: id,
      type: 'SUBJECT_MATERIAL',
      subject: subjectId,
      material: material._id,
      message
    }));

    if (notificationDocs.length > 0) {
      await StudentNotification.insertMany(notificationDocs, { ordered: false }).catch(() => {});
    }

    res.status(201).json({ success: true, data: material });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getStudentSubjects,
  getStudentSubjectMaterials,
  getStudentMaterialDetail,
  markMaterialRead,
  getMyNote,
  upsertMyNote,
  getUploaderTargets,
  createMaterial
};
