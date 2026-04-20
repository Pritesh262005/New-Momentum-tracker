const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const teacherController = require('../controllers/teacherController');
const studyController = require('../controllers/studyController');
const { syllabusUpload } = require('../controllers/hodController');

router.use(auth);
router.use(roleCheck('TEACHER'));

router.get('/dashboard', teacherController.getTeacherDashboard);
router.get('/students', teacherController.getClassStudents);
router.get('/students/:id', teacherController.getStudentDetail);
router.get('/tests', teacherController.getTeacherTests);
router.get('/results', teacherController.getTeacherResults);
router.get('/subjects', teacherController.getSubjects);
router.put('/subjects/:id', syllabusUpload.single('syllabusPdf'), teacherController.updateSubject);
router.get('/subjects/:id/syllabus', teacherController.getSubjectSyllabus);
router.post('/tests/import-question-bank', teacherController.questionBankUpload.single('pdfFile'), teacherController.importQuestionsFromPdf);
router.post('/tests', teacherController.createTest);
router.delete('/tests/:id', teacherController.deleteTest);
router.get('/leaderboard', teacherController.getLeaderboard);

// Study notes upload
router.get('/study/targets', studyController.getUploaderTargets);
router.get('/study/materials', studyController.getUploaderMaterials);
router.get('/study/materials/:materialId/file', studyController.getMaterialFile);
router.post('/study/materials', studyController.materialUpload.single('pdfFile'), studyController.createMaterial);

module.exports = router;
