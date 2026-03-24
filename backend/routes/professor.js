const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  getProfessorDashboard,
  getClassStudents,
  getStudentDetail
} = require('../controllers/professorController');

router.use(auth);
router.use(roleCheck('PROFESSOR'));

router.get('/dashboard', getProfessorDashboard);
router.get('/students', getClassStudents);
router.get('/students/:id', getStudentDetail);

module.exports = router;
