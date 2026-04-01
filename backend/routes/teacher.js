const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const teacherController = require('../controllers/teacherController');
const studyController = require('../controllers/studyController');

router.use(auth);
router.use(roleCheck('TEACHER'));

router.get('/dashboard', teacherController.getTeacherDashboard);
router.get('/students', teacherController.getClassStudents);
router.get('/students/:id', teacherController.getStudentDetail);
router.get('/tests', teacherController.getTeacherTests);
router.get('/results', teacherController.getTeacherResults);
router.get('/subjects', teacherController.getSubjects);
router.post('/tests', teacherController.createTest);

// Study notes upload
router.get('/study/targets', studyController.getUploaderTargets);
router.post('/study/materials', studyController.createMaterial);

module.exports = router;
