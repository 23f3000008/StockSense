const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  signup,
  login,
  logout,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

module.exports = router;
