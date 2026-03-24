const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  createTest,
  updateTest,
  publishTest,
  unpublishTest,
  deleteTest,
  getTeacherTests,
  getAvailableTests,
  startAttempt,
  saveAnswer,
  submitAttempt,
  autoTimeout,
  getResult,
  getTestResults
} = require('../controllers/mcqController');

router.use(auth);

router.post('/create', roleCheck('PROFESSOR'), createTest);
router.put('/:id', roleCheck('PROFESSOR'), updateTest);
router.patch('/:id/publish', roleCheck('PROFESSOR'), publishTest);
router.patch('/:id/unpublish', roleCheck('PROFESSOR'), unpublishTest);
router.delete('/:id', roleCheck('PROFESSOR'), deleteTest);
router.get('/my-tests', roleCheck('PROFESSOR'), getTeacherTests);
router.get('/available', roleCheck('STUDENT'), getAvailableTests);
router.post('/:id/start', roleCheck('STUDENT'), startAttempt);
router.patch('/attempt/:attemptId/answer', roleCheck('STUDENT'), saveAnswer);
router.post('/attempt/:attemptId/submit', roleCheck('STUDENT'), submitAttempt);
router.post('/attempt/:attemptId/timeout', roleCheck('STUDENT'), autoTimeout);
router.get('/attempt/:attemptId/result', getResult);
router.get('/:id/results', roleCheck('PROFESSOR'), getTestResults);

module.exports = router;
