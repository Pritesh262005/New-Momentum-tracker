const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  createStudyLog,
  getStudyLogs,
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

router.use(auth);
router.use(roleCheck('STUDENT'));

router.get('/dashboard', getStudentDashboard);
router.get('/tests', getStudentTests);
router.get('/results', getStudentResults);

router.post('/study-logs', createStudyLog);
router.get('/study-logs', getStudyLogs);

router.post('/moods', logMood);
router.get('/moods', getMoods);

router.get('/analytics', getStudentAnalytics);
router.get('/recommendations', getRecommendations);
router.get('/badges', getBadges);
router.get('/leaderboard', getLeaderboard);

module.exports = router;
