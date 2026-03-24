const express = require('express');
const router = express.Router();
const { login, changePassword, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/login', login);
router.post('/change-password', auth, changePassword);
router.get('/me', auth, getMe);

module.exports = router;
