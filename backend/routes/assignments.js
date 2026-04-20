const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  createAssignment,
  publishAssignment,
  updateAssignment,
  deleteAssignment,
  getTeacherAssignments,
  getAssignmentFile,
  getStudentAssignments,
  submitAssignment,
  resubmitAssignment,
  getSubmissions,
  getPlagiarismReport,
  getSubmissionFile,
  gradeSubmission,
  getMySubmission
} = require('../controllers/assignmentController');

router.use(auth);

router.post('/', roleCheck('TEACHER', 'HOD', 'PROFESSOR'), createAssignment);
router.patch('/:id/publish', roleCheck('TEACHER', 'HOD', 'PROFESSOR'), publishAssignment);
router.put('/:id', roleCheck('TEACHER', 'HOD', 'PROFESSOR'), updateAssignment);
router.delete('/:id', roleCheck('TEACHER', 'HOD', 'PROFESSOR'), deleteAssignment);
router.get('/my-assignments', roleCheck('TEACHER', 'HOD', 'PROFESSOR'), getTeacherAssignments);
router.get('/student', roleCheck('STUDENT'), getStudentAssignments);
router.get('/:id/file', getAssignmentFile);
router.post('/:id/submit', roleCheck('STUDENT'), submitAssignment);
router.put('/:id/resubmit', roleCheck('STUDENT'), resubmitAssignment);
router.get('/:id/submissions', roleCheck('TEACHER', 'HOD', 'PROFESSOR'), getSubmissions);
router.get('/:id/plagiarism', roleCheck('TEACHER', 'HOD', 'PROFESSOR'), getPlagiarismReport);
router.get('/submissions/:submissionId/file', getSubmissionFile);
router.put('/submissions/:submissionId/grade', roleCheck('TEACHER', 'HOD', 'PROFESSOR'), gradeSubmission);
router.get('/:id/my-submission', roleCheck('STUDENT'), getMySubmission);

module.exports = router;
