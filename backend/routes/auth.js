const express = require('express');
const {
    register,
    login,
    verifyEmail,
    resendVerification,
    getMe,
    updateProfile
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/register', upload.single('verificationDocument'), register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
