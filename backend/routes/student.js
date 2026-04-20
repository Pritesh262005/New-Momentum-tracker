const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  createStudyLog,
  getStudyLogs,
  getStudySessionAnalysis,
  logMood,
  getMoods,
  getStudentAnalytics,
  getRecommendations,
  getBadges,
  getLeaderboard,
  getStudentDashboard,
  getStudentTests,
  getStudentResults
} = require('../controllers/studentController');

const studyController = require('../controllers/studyController');

router.use(auth);
router.use(roleCheck('STUDENT'));

router.get('/dashboard', getStudentDashboard);
router.get('/tests', getStudentTests);
router.get('/results', getStudentResults);

router.post('/study-logs', createStudyLog);
router.get('/study-logs', getStudyLogs);
router.get('/study-analysis', getStudySessionAnalysis);

router.post('/moods', logMood);
router.get('/moods', getMoods);

router.get('/analytics', getStudentAnalytics);
router.get('/recommendations', getRecommendations);
router.get('/badges', getBadges);
router.get('/leaderboard', getLeaderboard);

// Study (subjects/materials/notes/AI)
router.get('/study/subjects', studyController.getStudentSubjects);
router.get('/study/subjects/:id/syllabus', studyController.getSubjectSyllabus);
router.get('/study/subjects/:subjectId/materials', studyController.getStudentSubjectMaterials);
router.get('/study/materials/:materialId', studyController.getStudentMaterialDetail);
router.get('/study/materials/:materialId/file', studyController.getMaterialFile);
router.post('/study/materials/:materialId/read', studyController.markMaterialRead);
router.get('/study/notes', studyController.getMyNote);
router.post('/study/notes', studyController.upsertMyNote);

module.exports = router;
