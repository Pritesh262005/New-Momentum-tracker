const express = require('express');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { explainMcqWrongAnswer, generateMcqAttemptFeedback } = require('../controllers/aiTutorController');

const router = express.Router();

router.use(auth);

// Student-facing AI Tutor helpers (admins/teachers can also access for support)
router.post('/mcq/explain', roleCheck('STUDENT', 'ADMIN', 'HOD', 'TEACHER', 'PROFESSOR'), explainMcqWrongAnswer);
router.post('/mcq/feedback', roleCheck('STUDENT', 'ADMIN', 'HOD', 'TEACHER', 'PROFESSOR'), generateMcqAttemptFeedback);

module.exports = router;
