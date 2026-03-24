const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.use(auth);

router.get('/groups', chatController.getGroups);
router.post('/groups', chatController.createGroup);
router.get('/groups/:id/messages', chatController.getMessages);
router.post('/groups/:id/messages', chatController.sendMessage);

module.exports = router;

