const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  createNews,
  getAllNews,
  getNewsById,
  getNewsAttachment,
  updateNews,
  deleteNews,
  toggleLike,
  addComment,
  deleteComment,
  lockComments
} = require('../controllers/newsController');

router.use(auth);

router.post('/', roleCheck('ADMIN', 'HOD', 'TEACHER'), createNews);
router.get('/', getAllNews);
router.get('/:id', getNewsById);
router.get('/:id/attachments/:index', getNewsAttachment);
router.put('/:id', updateNews);
router.delete('/:id', deleteNews);
router.post('/:id/like', toggleLike);
router.post('/:id/comment', addComment);
router.delete('/comment/:commentId', deleteComment);
router.patch('/:id/lock-comments', lockComments);

module.exports = router;
