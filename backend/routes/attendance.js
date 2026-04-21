const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const attendanceController = require('../controllers/attendanceController');

router.use(auth);

// Teacher routes
router.post('/session', roleCheck('TEACHER'), attendanceController.createSession);
router.get('/session/:sessionId', roleCheck('TEACHER'), attendanceController.getSessionStatus);
router.get('/history/teacher', roleCheck('TEACHER'), attendanceController.getTeacherAttendanceHistory);

// Student routes
router.post('/mark', roleCheck('STUDENT'), attendanceController.markAttendance);
router.get('/history/student', roleCheck('STUDENT'), attendanceController.getStudentAttendanceHistory);

module.exports = router;
