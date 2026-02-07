const express = require('express');
const { register, login, getMe } = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/register', upload.single('verificationDocument'), register);
router.post('/login', login);

module.exports = router;
