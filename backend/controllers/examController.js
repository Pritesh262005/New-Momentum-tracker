const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { calculateMomentumScore } = require('../services/momentumService');
const gamificationService = require('../services/gamificationService');

const computeAggregates = (marks) => {
  const totalMaxMarks = marks.reduce((sum, m) => sum + (m.maxMarks || 0), 0);
  const totalMarks = marks.reduce((sum, m) => sum + (m.marks || 0), 0);
  const avg = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
  return {
    totalMarks: Math.round(totalMarks * 100) / 100,
    totalMaxMarks: Math.round(totalMaxMarks * 100) / 100,
    avg: Math.round(Math.max(0, Math.min(100, avg)) * 100) / 100
  };
};

exports.createExam = async (req, res, next) => {
  try {
    const { name, date, subjectIds } = req.body;

    if (!name || !date) {
      return res.status(400).json({ success: false, message: 'name and date are required' });
    }
    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one subject' });
    }

    const subjects = await Subject.find({
      _id: { $in: subjectIds },
      department: req.user.department,
      isActive: true
    }).select('name code');

    if (subjects.length !== subjectIds.length) {
      return res.status(400).json({ success: false, message: 'One or more subjects are invalid for your department' });
    }

    const exam = await Exam.create({
      name,
      department: req.user.department,
      date: new Date(date),
      subjects: subjects.map((s) => ({ subject: s._id, name: s.name, code: s.code })),
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

exports.listExams = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.user.role !== 'ADMIN') {
      filter.department = req.user.department;
    }

    const exams = await Exam.find(filter)
      .populate('department', 'name code')
      .sort({ date: -1, createdAt: -1 });

    res.json({ success: true, data: exams });
  } catch (error) {
    next(error);
  }
};

exports.getExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('department', 'name code');
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    if (req.user.role !== 'ADMIN' && exam.department.toString() !== req.user.department?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

exports.upsertMarks = async (req, res, next) => {
  try {
    const { studentId, marks } = req.body;
    if (!studentId || !Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ success: false, message: 'studentId and marks are required' });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    if (req.user.role !== 'ADMIN' && exam.department.toString() !== req.user.department?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const student = await User.findById(studentId).select('role department class name rollNumber');
    if (!student || student.role !== 'STUDENT') {
      return res.status(400).json({ success: false, message: 'Invalid student' });
    }
    if (req.user.role !== 'ADMIN' && student.department?.toString() !== req.user.department?.toString()) {
      return res.status(403).json({ success: false, message: 'Student is not in your department' });
    }

    // Validate subjects belong to the exam
    const allowedSubjects = new Set(exam.subjects.map((s) => s.subject.toString()));
    for (const entry of marks) {
      if (!entry.subjectId) {
        return res.status(400).json({ success: false, message: 'Each mark entry requires subjectId' });
      }
      if (!allowedSubjects.has(entry.subjectId.toString())) {
        return res.status(400).json({ success: false, message: 'Subject not part of this exam' });
      }
      if (typeof entry.marks !== 'number' || Number.isNaN(entry.marks)) {
        return res.status(400).json({ success: false, message: 'marks must be a number' });
      }
      const maxMarks = entry.maxMarks === undefined ? 100 : entry.maxMarks;
      if (typeof maxMarks !== 'number' || Number.isNaN(maxMarks) || maxMarks <= 0) {
        return res.status(400).json({ success: false, message: 'maxMarks must be a positive number' });
      }
      if (entry.marks < 0 || entry.marks > maxMarks) {
        return res.status(400).json({ success: false, message: 'marks must be between 0 and maxMarks' });
      }
    }

    // Upsert exam result and merge marks by subject
    const existing = await ExamResult.findOne({ exam: exam._id, student: student._id });
    const merged = new Map((existing?.marks || []).map((m) => [m.subject.toString(), m]));
    for (const entry of marks) {
      const subjectKey = entry.subjectId.toString();
      merged.set(subjectKey, {
        subject: entry.subjectId,
        marks: entry.marks,
        maxMarks: entry.maxMarks === undefined ? 100 : entry.maxMarks
      });
    }

    const mergedMarks = Array.from(merged.values());
    const aggregates = computeAggregates(mergedMarks);

    const doc = await ExamResult.findOneAndUpdate(
      { exam: exam._id, student: student._id },
      {
        exam: exam._id,
        student: student._id,
        department: exam.department,
        examDate: exam.date,
        marks: mergedMarks,
        ...aggregates,
        updatedBy: req.user._id
      },
      { upsert: true, new: true }
    )
      .populate('student', 'name rollNumber')
      .populate('marks.subject', 'name code');

    // Recalculate momentum so exam marks affect momentum.
    try {
      const getWeekRange = (d) => {
        const base = new Date(d);
        const weekStart = new Date(base);
        weekStart.setDate(base.getDate() - base.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return { weekStart, weekEnd };
      };

      const examBase = exam.date ? new Date(exam.date) : new Date();
      const nowBase = new Date();

      const examWeek = getWeekRange(examBase);
      const nowWeek = getWeekRange(nowBase);

      await calculateMomentumScore(student._id, examWeek.weekStart, examWeek.weekEnd);
      if (String(nowWeek.weekStart) !== String(examWeek.weekStart)) {
        await calculateMomentumScore(student._id, nowWeek.weekStart, nowWeek.weekEnd);
      }

      await gamificationService.checkAndAwardBadges(student._id);
    } catch (e) {
      console.error('Momentum refresh after exam marks failed:', e.message);
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
};

exports.getExamResults = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    if (req.user.role !== 'ADMIN' && exam.department.toString() !== req.user.department?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const results = await ExamResult.find({ exam: exam._id })
      .populate('student', 'name rollNumber')
      .populate('marks.subject', 'name code')
      .sort({ avg: -1, totalMarks: -1, updatedAt: 1 });

    // Ensure students with no marks still appear for HOD/Teacher tables
    const students = await User.find({ role: 'STUDENT', department: exam.department, isActive: true })
      .select('name rollNumber');

    const byStudent = new Map(results.map((r) => [r.student._id.toString(), r]));
    const merged = students.map((s) => {
      const r = byStudent.get(s._id.toString());
      if (r) return r;
      return {
        _id: null,
        exam: exam._id,
        student: s,
        marks: [],
        avg: 0,
        totalMarks: 0,
        totalMaxMarks: 0
      };
    });

    const sorted = merged.slice().sort((a, b) => (b.avg || 0) - (a.avg || 0) || (b.totalMarks || 0) - (a.totalMarks || 0));
    let currentRank = 0;
    let lastAvg = null;
    sorted.forEach((row, idx) => {
      const avg = row.avg || 0;
      if (lastAvg === null || avg !== lastAvg) {
        currentRank = idx + 1;
        lastAvg = avg;
      }
      row.rank = currentRank;
    });

    res.json({ success: true, data: { exam, results: sorted } });
  } catch (error) {
    next(error);
  }
};

exports.getMyExamResult = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    if (exam.department.toString() !== req.user.department?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await ExamResult.findOne({ exam: exam._id, student: req.user._id })
      .populate('marks.subject', 'name code');

    res.json({ success: true, data: { exam, result } });
  } catch (error) {
    next(error);
  }
};
