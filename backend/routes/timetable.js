const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  createTimetable,
  getClassTimetable
} = require('../controllers/timetableController');

router.use(auth);

router.post('/create', roleCheck('PROFESSOR', 'HOD'), createTimetable);
router.get('/class/:classId', getClassTimetable);

module.exports = router;
