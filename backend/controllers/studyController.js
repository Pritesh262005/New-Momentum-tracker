const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Class = require('../models/Class');
const SubjectMaterial = require('../models/SubjectMaterial');
const StudentSubjectNote = require('../models/StudentSubjectNote');
const StudentNotification = require('../models/StudentNotification');

const isValidObjectId = (id) => typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
const isPdfFile = (file) => file?.mimetype === 'application/pdf' || String(file?.originalname || '').toLowerCase().endsWith('.pdf');
const semesterToYear = (semester) => Math.ceil(Number(semester) / 2);
const clampYear = (year) => {
  const value = Number(year);
  return Number.isInteger(value) && value >= 1 && value <= 4 ? value : null;
};
const clampSemester = (semester) => {
  const value = Number(semester);
  return Number.isInteger(value) && value >= 1 && value <= 8 ? value : null;
};
const sanitizeAssignedYearGroups = (groups) => (
  Array.isArray(groups) ? groups : []
).map((group) => ({
  year: clampYear(group?.year),
  semesters: Array.isArray(group?.semesters)
    ? [...new Set(group.semesters.map((semester) => clampSemester(semester)).filter(Boolean))]
    : []
})).filter((group) => group.year);
const buildTeacherYearSemesterMongoFilter = (user, prefix = '') => {
  const groups = sanitizeAssignedYearGroups(user?.assignedYearGroups);
  if (groups.length === 0) return {};
  const yearKey = prefix ? `${prefix}.year` : 'year';
  const semesterKey = prefix ? `${prefix}.semester` : 'semester';
  return {
    $or: groups.map((group) => (
      group.semesters.length > 0
        ? { [yearKey]: group.year, [semesterKey]: { $in: group.semesters } }
        : { [yearKey]: group.year }
    ))
  };
};
const teacherCanAccessYearSemester = (user, year, semester) => {
  const groups = sanitizeAssignedYearGroups(user?.assignedYearGroups);
  if (groups.length === 0) return true;
  return groups.some((group) => group.year === year && (group.semesters.length === 0 || group.semesters.includes(semester)));
};

const isPathInside = (filePath, baseDir) => {
  if (!filePath || !baseDir) return false;
  const base = path.resolve(baseDir) + path.sep;
  const target = path.resolve(filePath);
  return target.startsWith(base);
};

const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/study-materials';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const sanitized = String(file.originalname || 'material.pdf').replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `material_${req.user?._id || 'user'}_${Date.now()}_${sanitized}`);
  }
});

const materialUpload = multer({
  storage: materialStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isPdfFile(file)) cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  }
});

const ensureSameDepartmentSubject = async (subjectId, departmentId) => {
  const subject = await Subject.findById(subjectId).select('_id name department').lean();
  if (!subject) return { ok: false, status: 404, message: 'Subject not found' };
  if (departmentId && subject.department?.toString() !== departmentId.toString()) {
    return { ok: false, status: 403, message: 'Subject is not in your department' };
  }
  return { ok: true, subject };
};

const materialSummary = (material, unreadSet = new Set()) => ({
  _id: material._id,
  title: material.title,
  unitNumber: material.unitNumber || 1,
  materialType: material.materialType || 'TEXT',
  createdAt: material.createdAt,
  createdBy: material.createdBy,
  hasAttachment: Boolean(material.attachment?.filePath),
  attachmentName: material.attachment?.fileName || '',
  unread: unreadSet.has(String(material._id))
});

const getStudentSubjects = async (req, res, next) => {
  try {
    const student = req.user;
    const departmentId = student.department;
    if (!departmentId) return res.json({ success: true, data: [] });

    const { year, semester } = req.query;

    const filter = {
      department: departmentId,
      isActive: true,
      year: year ? parseInt(year) : (student.year ?? semesterToYear(student.semester ?? 1)),
    };
    if (semester) {
      filter.semester = parseInt(semester);
    } else if (!year) {
      filter.semester = student.semester ?? 1;
    }

    const [subjects, unreadAgg] = await Promise.all([
      Subject.find(filter).sort({ semester: 1, name: 1 }).lean(),
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
      year: s.year,
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
        .select('_id title unitNumber materialType attachment createdAt createdBy')
        .populate('createdBy', 'name role')
        .sort({ unitNumber: 1, createdAt: -1 })
        .lean(),
      StudentNotification.find({ student: student._id, subject: subjectId, isRead: false, type: 'SUBJECT_MATERIAL' })
        .select('material')
        .lean()
    ]);

    const unreadSet = new Set((unread || []).map((n) => n.material.toString()));
    const rows = (materials || []).map((m) => materialSummary(m, unreadSet));

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

    res.json({
      success: true,
      data: {
        ...material,
        hasAttachment: Boolean(material.attachment?.filePath),
        attachmentName: material.attachment?.fileName || ''
      }
    });
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
      Subject.find({ department: departmentId, isActive: true, ...buildTeacherYearSemesterMongoFilter(user) }).sort({ year: 1, semester: 1, name: 1 }).lean(),
      Class.find(
        user.role === 'TEACHER' ? { department: departmentId, teacher: user._id } : { department: departmentId }
      )
        .select('_id name semester year')
        .lean()
    ]);

    const students = await User.find({ role: 'STUDENT', department: departmentId, isActive: true, ...buildTeacherYearSemesterMongoFilter(user) })
      .select('_id name rollNumber year semester')
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, data: { subjects, classes, students } });
  } catch (e) {
    next(e);
  }
};

const getUploaderMaterials = async (req, res, next) => {
  try {
    const filter = { subject: req.query.subjectId, recipients: { $exists: true } };
    if (!isValidObjectId(req.query.subjectId)) {
      return res.status(400).json({ success: false, message: 'Invalid subject id' });
    }

    const chk = await ensureSameDepartmentSubject(req.query.subjectId, req.user.department);
    if (!chk.ok) return res.status(chk.status).json({ success: false, message: chk.message });

    filter.subject = req.query.subjectId;

    const materials = await SubjectMaterial.find(filter)
      .select('_id title unitNumber materialType attachment createdAt createdBy scope')
      .populate('createdBy', 'name role')
      .sort({ unitNumber: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: materials.map((m) => ({
        _id: m._id,
        title: m.title,
        unitNumber: m.unitNumber || 1,
        materialType: m.materialType || 'TEXT',
        scope: m.scope,
        createdAt: m.createdAt,
        createdBy: m.createdBy,
        hasAttachment: Boolean(m.attachment?.filePath),
        attachmentName: m.attachment?.fileName || ''
      }))
    });
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
    if (req.file && !isPdfFile(req.file)) return res.status(400).json({ success: false, message: 'Only PDF files allowed' });

    const chk = await ensureSameDepartmentSubject(subjectId, user.department);
    if (!chk.ok) return res.status(chk.status).json({ success: false, message: chk.message });

    const safeScope = ['DEPARTMENT', 'CLASS', 'STUDENTS', 'YEAR_SEMESTER'].includes(scope) ? scope : 'DEPARTMENT';
    const unitNumber = Math.max(1, Math.min(12, Number(req.body.unitNumber || 1)));

    let recipients = [];
    let classRef = null;
    let studentsRef = [];
    let targetYear = null;
    let targetSemester = null;

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
      targetYear = cls.year || semesterToYear(cls.semester || 1);
      targetSemester = cls.semester || null;
    } else if (safeScope === 'YEAR_SEMESTER') {
      targetYear = clampYear(req.body.targetYear);
      targetSemester = clampSemester(req.body.targetSemester);
      if (!targetYear || !targetSemester) {
        return res.status(400).json({ success: false, message: 'targetYear and targetSemester are required' });
      }
      if (semesterToYear(targetSemester) !== targetYear) {
        return res.status(400).json({ success: false, message: 'Target semester does not belong to target year' });
      }
      if (user.role === 'TEACHER' && !teacherCanAccessYearSemester(user, targetYear, targetSemester)) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this year/semester group' });
      }
      const found = await User.find({
        role: 'STUDENT',
        department: user.department,
        isActive: true,
        year: targetYear,
        semester: targetSemester
      }).select('_id').lean();
      recipients = found.map((s) => s._id.toString());
      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: 'No students found in the selected year/semester group' });
      }
    } else if (safeScope === 'STUDENTS') {
      const ids = Array.isArray(studentIds)
        ? studentIds.filter(isValidObjectId)
        : String(studentIds || '')
            .split(',')
            .map((id) => id.trim())
            .filter(isValidObjectId);
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

    const hasText = String(body || '').trim().length > 0;
    const hasPdf = Boolean(req.file);
    const materialType = hasPdf && hasText ? 'TEXT_AND_PDF' : hasPdf ? 'PDF' : 'TEXT';

    const material = await SubjectMaterial.create({
      subject: subjectId,
      title: t,
      unitNumber,
      materialType,
      body: String(body || ''),
      createdBy: user._id,
      scope: safeScope,
      class: classRef,
      targetYear,
      targetSemester,
      students: studentsRef,
      recipients,
      ...(req.file
        ? {
            attachment: {
              fileName: req.file.originalname,
              filePath: req.file.path,
              fileSize: req.file.size,
              mimeType: req.file.mimetype
            }
          }
        : {})
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

const getMaterialFile = async (req, res, next) => {
  try {
    const material = await SubjectMaterial.findById(req.params.materialId).populate('subject', 'department');
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });
    if (!material.attachment?.filePath) {
      return res.status(404).json({ success: false, message: 'No PDF uploaded for this material' });
    }

    const isOwner = material.createdBy?.toString() === req.user._id.toString();
    const isRecipient = req.user.role === 'STUDENT' && (material.recipients || []).some((id) => id.toString() === req.user._id.toString());
    const canAccessTeacherSide = req.user.role !== 'STUDENT'
      && material.subject?.department?.toString() === req.user.department?.toString();
    const canAccess = isOwner || isRecipient || canAccessTeacherSide;
    if (!canAccess) return res.status(403).json({ success: false, message: 'Access denied' });

    if (!isPathInside(material.attachment.filePath, 'uploads/study-materials')) {
      return res.status(400).json({ success: false, message: 'Invalid material file path' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${material.attachment.fileName || 'material.pdf'}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(path.resolve(material.attachment.filePath));
  } catch (e) {
    next(e);
  }
};

const getSubjectSyllabus = async (req, res, next) => {
  try {
    const { id } = req.params;
    // ensure student can access this subject
    const subject = await Subject.findOne({ _id: id, department: req.user.department });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    if (!subject.syllabusFilePath) {
      return res.status(404).json({ success: false, message: 'Syllabus PDF not available' });
    }

    const absPath = path.resolve(subject.syllabusFilePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${subject.syllabusFileName || 'syllabus.pdf'}"`);
    res.sendFile(absPath);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  materialUpload,
  getStudentSubjects,
  getStudentSubjectMaterials,
  getStudentMaterialDetail,
  markMaterialRead,
  getMyNote,
  upsertMyNote,
  getUploaderTargets,
  getUploaderMaterials,
  createMaterial,
  getMaterialFile,
  getSubjectSyllabus
};
