const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');

const assignmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/assignments';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `assignment_${Date.now()}_${sanitized}`);
  }
});

const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/submissions';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `submission_${req.user._id}_${req.params.id}_${Date.now()}.pdf`);
  }
});

const assignmentUpload = multer({
  storage: assignmentStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  }
});

const submissionUpload = multer({
  storage: submissionStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  }
});

exports.createAssignment = [assignmentUpload.single('assignmentFile'), async (req, res, next) => {
  try {
    const { title, description, subject, classId, dueDate, totalMarks, instructions, allowLateSubmission, latePenaltyPercent } = req.body;

    if (req.user.role !== 'ADMIN' && !req.user.department) {
      return res.status(400).json({ success: false, message: 'Your account is missing department' });
    }

    const assignment = await Assignment.create({
      title, description, subject,
      ...(classId ? { class: classId } : {}),
      createdBy: req.user._id,
      department: req.user.department,
      ...(req.file ? {
        assignmentFile: {
          fileName: req.file.originalname,
          filePath: req.file.path,
          fileSize: req.file.size
        }
      } : {}),
      dueDate, totalMarks, instructions, allowLateSubmission, latePenaltyPercent
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
}];

exports.publishAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    assignment.isPublished = true;
    assignment.publishedAt = new Date();
    await assignment.save();

    res.json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

exports.updateAssignment = [assignmentUpload.single('assignmentFile'), async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const submissionCount = await AssignmentSubmission.countDocuments({ assignment: req.params.id });
    if (submissionCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot update assignment with submissions' });
    }

    if (req.file) {
      if (assignment.assignmentFile?.filePath && fs.existsSync(assignment.assignmentFile.filePath)) {
        fs.unlinkSync(assignment.assignmentFile.filePath);
      }
      assignment.assignmentFile = {
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size
      };
    }

    Object.assign(assignment, req.body);
    await assignment.save();

    res.json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
}];

exports.deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const gradedCount = await AssignmentSubmission.countDocuments({ assignment: req.params.id, status: 'GRADED' });
    if (gradedCount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete assignment with graded submissions' });
    }

    const submissions = await AssignmentSubmission.find({ assignment: req.params.id });
    submissions.forEach(sub => {
      if (fs.existsSync(sub.submissionFile.filePath)) {
        fs.unlinkSync(sub.submissionFile.filePath);
      }
    });

    if (assignment.assignmentFile?.filePath && fs.existsSync(assignment.assignmentFile.filePath)) {
      fs.unlinkSync(assignment.assignmentFile.filePath);
    }

    await AssignmentSubmission.deleteMany({ assignment: req.params.id });
    await assignment.deleteOne();

    res.json({ success: true, message: 'Assignment deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getTeacherAssignments = async (req, res, next) => {
  try {
    const assignments = await Assignment.find({ createdBy: req.user._id })
      .populate('class', 'name')
      .sort({ createdAt: -1 });

    const assignmentsWithStats = await Promise.all(assignments.map(async (assignment) => {
      const submissions = await AssignmentSubmission.find({ assignment: assignment._id });
      const graded = submissions.filter(s => s.status === 'GRADED');
      const avgScore = graded.length > 0 ? graded.reduce((sum, s) => sum + s.percentage, 0) / graded.length : 0;

      return {
        ...assignment.toObject(),
        submissionCount: submissions.length,
        gradedCount: graded.length,
        avgScore: Math.round(avgScore)
      };
    }));

    res.json({ success: true, data: assignmentsWithStats });
  } catch (error) {
    next(error);
  }
};

exports.getAssignmentFile = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (!assignment.assignmentFile?.filePath) {
      return res.status(404).json({ success: false, message: 'No assignment file uploaded' });
    }

    const isOwner = assignment.createdBy.toString() === req.user._id.toString();
    const isDeptMatch = assignment.department?.toString() && assignment.department.toString() === req.user.department?.toString();
    const isClassMatch = assignment.class?.toString() && assignment.class.toString() === req.user.class?.toString();
    const canAccess = isOwner || (req.user.role === 'STUDENT' && isDeptMatch && (!assignment.class || isClassMatch));

    if (!canAccess) return res.status(403).json({ success: false, message: 'Access denied' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(path.resolve(assignment.assignmentFile.filePath));
  } catch (error) {
    next(error);
  }
};

exports.getStudentAssignments = async (req, res, next) => {
  try {
    const dept = req.user.department;
    if (!dept) return res.json({ success: true, data: [] });

    const assignments = await Assignment.find({
      department: dept,
      isPublished: true,
      $or: [
        { class: { $exists: false } },
        { class: null },
        ...(req.user.class ? [{ class: req.user.class }] : [])
      ]
    })
      .populate('createdBy', 'name')
      .populate('class', 'name')
      .sort({ dueDate: 1 });

    const assignmentsWithStatus = await Promise.all(assignments.map(async (assignment) => {
      const submission = await AssignmentSubmission.findOne({ assignment: assignment._id, student: req.user._id });
      
      let status = 'NOT_SUBMITTED';
      let grade = null;
      if (submission) {
        status = submission.status;
        if (submission.status === 'GRADED') {
          grade = { score: submission.finalGrade, total: assignment.totalMarks, percentage: submission.percentage, letter: submission.letterGrade };
        }
      }

      return { ...assignment.toObject(), submissionStatus: status, grade };
    }));

    res.json({ success: true, data: assignmentsWithStatus });
  } catch (error) {
    next(error);
  }
};

exports.submitAssignment = [submissionUpload.single('submissionFile'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Submission file required' });
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment || !assignment.isPublished) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const isDeptMatch = assignment.department?.toString() && assignment.department.toString() === req.user.department?.toString();
    const isClassMatch = assignment.class?.toString() && assignment.class.toString() === req.user.class?.toString();
    if (!isDeptMatch || (assignment.class && !isClassMatch)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const existing = await AssignmentSubmission.findOne({ assignment: req.params.id, student: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Already submitted' });
    }

    const now = new Date();
    const isLate = now > new Date(assignment.dueDate);

    if (isLate && !assignment.allowLateSubmission) {
      return res.status(403).json({ success: false, message: 'Deadline passed' });
    }

    const lateByHours = isLate ? Math.floor((now - new Date(assignment.dueDate)) / (1000 * 60 * 60)) : 0;

    const submission = await AssignmentSubmission.create({
      assignment: req.params.id,
      student: req.user._id,
      submissionFile: {
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size
      },
      isLate,
      lateByHours
    });

    res.status(201).json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
}];

exports.resubmitAssignment = [submissionUpload.single('submissionFile'), async (req, res, next) => {
  try {
    const submission = await AssignmentSubmission.findOne({ assignment: req.params.id, student: req.user._id });
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    if (submission.status !== 'RETURNED') {
      return res.status(400).json({ success: false, message: 'Can only resubmit returned assignments' });
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    const isDeptMatch = assignment.department?.toString() && assignment.department.toString() === req.user.department?.toString();
    const isClassMatch = assignment.class?.toString() && assignment.class.toString() === req.user.class?.toString();
    if (!isDeptMatch || (assignment.class && !isClassMatch)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File required' });
    }

    if (fs.existsSync(submission.submissionFile.filePath)) {
      fs.unlinkSync(submission.submissionFile.filePath);
    }

    submission.submissionFile = {
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      uploadedAt: new Date()
    };
    submission.status = 'SUBMITTED';
    submission.grade = null;
    submission.finalGrade = null;
    submission.feedback = null;

    await submission.save();
    res.json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
}];

exports.getSubmissions = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'HOD') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const submissions = await AssignmentSubmission.find({ assignment: req.params.id })
      .populate('student', 'name rollNumber email')
      .sort({ isLate: -1, submittedAt: 1 });

    res.json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
};

exports.getSubmissionFile = async (req, res, next) => {
  try {
    const submission = await AssignmentSubmission.findById(req.params.submissionId).populate('assignment');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    const canAccess = submission.assignment.createdBy.toString() === req.user._id.toString() ||
                      submission.student.toString() === req.user._id.toString();

    if (!canAccess) return res.status(403).json({ success: false, message: 'Access denied' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(path.resolve(submission.submissionFile.filePath));
  } catch (error) {
    next(error);
  }
};

exports.gradeSubmission = async (req, res, next) => {
  try {
    const { grade, feedback, rubricScores, returnForRevision } = req.body;
    const submission = await AssignmentSubmission.findById(req.params.submissionId).populate('assignment');

    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    if (submission.assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'HOD') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (grade < 0 || grade > submission.assignment.totalMarks) {
      return res.status(400).json({ success: false, message: 'Invalid grade' });
    }

    const penalty = submission.isLate ? (grade * submission.assignment.latePenaltyPercent / 100) : 0;
    submission.grade = grade;
    submission.finalGrade = grade - penalty;
    submission.percentage = (submission.finalGrade / submission.assignment.totalMarks) * 100;
    submission.letterGrade = submission.percentage >= 90 ? 'A' : submission.percentage >= 80 ? 'B' : submission.percentage >= 70 ? 'C' : submission.percentage >= 60 ? 'D' : 'F';
    submission.feedback = feedback;
    submission.rubricScores = rubricScores || [];
    submission.status = returnForRevision ? 'RETURNED' : 'GRADED';
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();
    if (returnForRevision) submission.returnedAt = new Date();

    await submission.save();
    res.json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};

exports.getMySubmission = async (req, res, next) => {
  try {
    const submission = await AssignmentSubmission.findOne({ assignment: req.params.id, student: req.user._id })
      .populate('assignment gradedBy', 'name');

    if (!submission) return res.status(404).json({ success: false, message: 'No submission found' });

    res.json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
