const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const { generateAuthToken, generateResetToken, verifyResetToken, setAuthCookie, clearAuthCookie } = require('../utils/tokens');
const { generateOtp, sendOtpEmail } = require('../utils/otpAndEmail');

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES) || 10;

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

// POST /api/auth/signup
const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are all required.');
  }
  if (password.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters.');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409);
    throw new Error('An account with this email already exists.');
  }

  const user = await User.create({ name, email, password });
  const token = generateAuthToken(user._id);
  setAuthCookie(res, token);

  res.status(201).json({ success: true, user: publicUser(user) });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required.');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  const valid = user && (await user.matchPassword(password));
  if (!valid) {
    res.status(401);
    throw new Error('Invalid email or password.');
  }

  const token = generateAuthToken(user._id);
  setAuthCookie(res, token);

  res.status(200).json({ success: true, user: publicUser(user) });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({ success: true, message: 'Logged out.' });
});

// GET /api/auth/me  (protected - used by the frontend to check session on load)
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: publicUser(req.user) });
});

// POST /api/auth/forgot-password
// Always responds with the same generic message, whether or not the email
// exists, so the endpoint can't be used to enumerate registered accounts.
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Email is required.');
  }

  const genericResponse = {
    success: true,
    message: 'If an account exists for that email, a reset code has been sent.',
  };

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(200).json(genericResponse);

  const otp = generateOtp();
  await user.setOtp(otp, OTP_EXPIRE_MINUTES);
  await user.save();

  try {
    await sendOtpEmail(user.email, otp);
  } catch (err) {
    // Don't leak SMTP failures to the client; log server-side for debugging.
    console.error('Failed to send OTP email:', err.message);
  }

  res.status(200).json(genericResponse);
});

// POST /api/auth/verify-otp
// Confirms the code, then issues a short-lived resetToken so the following
// reset-password call can't be replayed with an already-used OTP.
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400);
    throw new Error('Email and OTP are required.');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+otpCodeHash +otpExpiresAt +otpAttempts');
  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired code.');
  }

  if (user.otpAttempts >= 5) {
    res.status(429);
    throw new Error('Too many attempts. Request a new code.');
  }

  const isValid = await user.verifyOtp(otp);
  if (!isValid) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();
    res.status(400);
    throw new Error('Invalid or expired code.');
  }

  user.clearOtp();
  await user.save();

  const resetToken = generateResetToken(user._id);
  res.status(200).json({ success: true, resetToken });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    res.status(400);
    throw new Error('Reset token and new password are required.');
  }
  if (newPassword.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters.');
  }

  let decoded;
  try {
    decoded = verifyResetToken(resetToken);
  } catch (err) {
    res.status(400);
    throw new Error('This reset link has expired. Please request a new code.');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(400);
    throw new Error('Account not found.');
  }

  user.password = newPassword; // re-hashed by the pre-save hook
  await user.save();

  res.status(200).json({ success: true, message: 'Password updated. You can now log in.' });
});

module.exports = { signup, login, logout, getMe, forgotPassword, verifyOtp, resetPassword };
