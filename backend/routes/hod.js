const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  getHODDashboard,
  getTeachers,
  getTests,
  getStudents,
  getDepartmentReport,
  compareProfessors,
  getSubjects,
  createSubject
} = require('../controllers/hodController');
const studyController = require('../controllers/studyController');

router.use(auth);
router.use(roleCheck('HOD'));

router.get('/dashboard', getHODDashboard);
router.get('/teachers', getTeachers);
router.get('/tests', getTests);
router.get('/students', getStudents);
router.get('/report', getDepartmentReport);
router.get('/professors/compare', compareProfessors);
router.get('/subjects', getSubjects);
router.post('/subjects', createSubject);

// Study notes upload
router.get('/study/targets', studyController.getUploaderTargets);
router.post('/study/materials', studyController.createMaterial);

module.exports = router;
