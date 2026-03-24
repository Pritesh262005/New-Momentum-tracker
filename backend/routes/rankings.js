const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getTop10,
  getDepartmentRankings,
  getClassRankings
} = require('../controllers/rankingController');

router.use(auth);

router.get('/top10', getTop10);
router.get('/department', getDepartmentRankings);
router.get('/class', getClassRankings);

module.exports = router;
