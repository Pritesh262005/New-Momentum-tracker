const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  getHODDashboard,
  getHODAnalytics,
  getTeachers,
  getTests,
  getStudents,
  getStudentDetail,
  promoteSemester,
  getDepartmentReport,
  compareProfessors,
  getSubjects,
  createSubject,
  updateSubject,
  getSubjectSyllabus,
  syllabusUpload,
  getLeaderboard
} = require('../controllers/hodController');
const studyController = require('../controllers/studyController');

router.use(auth);
router.use(roleCheck('HOD'));

router.get('/dashboard', getHODDashboard);
router.get('/analytics', getHODAnalytics);
router.get('/teachers', getTeachers);
router.get('/tests', getTests);
router.get('/students', getStudents);
router.get('/students/:id', getStudentDetail);
router.post('/semester/promote', promoteSemester);
router.get('/report', getDepartmentReport);
router.get('/professors/compare', compareProfessors);
router.get('/subjects', getSubjects);
router.post('/subjects', syllabusUpload.single('syllabusPdf'), createSubject);
router.put('/subjects/:id', syllabusUpload.single('syllabusPdf'), updateSubject);
router.get('/subjects/:id/syllabus', getSubjectSyllabus);
router.get('/leaderboard', getLeaderboard);

// Study notes upload
router.get('/study/targets', studyController.getUploaderTargets);
router.get('/study/materials', studyController.getUploaderMaterials);
router.get('/study/materials/:materialId/file', studyController.getMaterialFile);
router.post('/study/materials', studyController.materialUpload.single('pdfFile'), studyController.createMaterial);

module.exports = router;
