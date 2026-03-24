const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  createAdminMeeting,
  createDepartmentMeeting,
  getAllMeetings,
  getMeetingById,
  markAttendance,
  getMeetingAttendance
} = require('../controllers/meetingController');

router.use(auth);

router.post('/admin/create', roleCheck('ADMIN'), createAdminMeeting);
router.post('/hod/create', roleCheck('HOD'), createDepartmentMeeting);
router.get('/all', getAllMeetings);
router.get('/:id', getMeetingById);
router.post('/attendance', markAttendance);
router.get('/attendance/:meetingId', getMeetingAttendance);

module.exports = router;
