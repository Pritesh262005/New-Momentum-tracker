const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const examController = require('../controllers/examController');

router.use(auth);

router.post('/', roleCheck('HOD'), examController.createExam);
router.get('/', examController.listExams);
router.get('/:id', examController.getExam);
router.get('/:id/results', roleCheck('ADMIN', 'HOD', 'TEACHER'), examController.getExamResults);
router.put('/:id/marks', roleCheck('ADMIN', 'HOD', 'TEACHER'), examController.upsertMarks);
router.get('/:id/my-result', roleCheck('STUDENT'), examController.getMyExamResult);

module.exports = router;

