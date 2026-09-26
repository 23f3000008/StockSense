const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const { generateAuthToken, generateResetToken, verifyResetToken, setAuthCookie, clearAuthCookie } = require('../utils/tokens');
const { generateOtp, sendOtpEmail } = require('../utils/otpAndEmail');

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES) || 10;

function publicUser(user) {
  return {
    id: user._id,
    loginId: user.loginId || '',
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

// POST /api/auth/signup
// Wireframe specifications:
// 1. login ID should be unique and must be in between 6-12 characters
// 2. Email Id should not be a duplicate in database
// 3. Password must contain small case, large case, special character, length > 8 characters
// 4. Re-enter password verification
const signup = asyncHandler(async (req, res) => {
  const {
    loginId: rawLoginId,
    loginID,
    email: rawEmail,
    emailId,
    password,
    reEnterPassword,
    confirmPassword,
    name: rawName,
  } = req.body;

  const loginId = (rawLoginId || loginID || '').trim();
  const email = (rawEmail || emailId || '').trim();
  const rePassword = reEnterPassword !== undefined ? reEnterPassword : confirmPassword;

  // 1. Validate Login ID (6-12 characters, unique, alphanumeric/underscore)
  if (!loginId) {
    res.status(400);
    throw new Error('Login ID is required.');
  }
  if (loginId.length < 6 || loginId.length > 12) {
    res.status(400);
    throw new Error('Login ID must be between 6 and 12 characters.');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(loginId)) {
    res.status(400);
    throw new Error('Login ID can only contain letters, numbers, and underscores.');
  }

  const existingLogin = await User.findOne({ loginId: loginId.toLowerCase() });
  if (existingLogin) {
    res.status(409);
    throw new Error('Login ID is already taken. Please choose another.');
  }

  // 2. Validate Email ID (valid format, unique)
  if (!email) {
    res.status(400);
    throw new Error('Email ID is required.');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400);
    throw new Error('Please enter a valid email address.');
  }

  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    res.status(409);
    throw new Error('Email ID already exists in the system.');
  }

  // 3. Validate Password (>8 characters, small case, large case, special character)
  if (!password) {
    res.status(400);
    throw new Error('Password is required.');
  }
  if (password.length <= 8) {
    res.status(400);
    throw new Error('Password length must be more than 8 characters.');
  }
  if (!/[a-z]/.test(password)) {
    res.status(400);
    throw new Error('Password must contain at least one lowercase letter.');
  }
  if (!/[A-Z]/.test(password)) {
    res.status(400);
    throw new Error('Password must contain at least one uppercase letter.');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    res.status(400);
    throw new Error('Password must contain at least one special character.');
  }

  // Check re-entered password if provided
  if (rePassword !== undefined && password !== rePassword) {
    res.status(400);
    throw new Error('Passwords do not match.');
  }

  const name = rawName && rawName.trim() ? rawName.trim() : loginId;

  const user = await User.create({
    loginId: loginId.toLowerCase(),
    name,
    email: email.toLowerCase(),
    password,
    role: req.body.role || 'inventory_manager',
  });

  const token = generateAuthToken(user._id);
  setAuthCookie(res, token);

  res.status(201).json({
    success: true,
    message: 'User registered successfully.',
    token,
    user: publicUser(user),
  });
});

// POST /api/auth/login
// Wireframe specifications:
// - Check for Login Credentials (by Login Id or Email)
// - Match creds, and allow to login a user
// - If Creds does not match throw error msg: 'Invalid Login Id or Password'
const login = asyncHandler(async (req, res) => {
  const { loginId: rawLoginId, loginID, email: rawEmail, identifier: rawIdentifier, password } = req.body;
  const identifier = (rawLoginId || loginID || rawEmail || rawIdentifier || '').trim().toLowerCase();

  if (!identifier || !password) {
    res.status(401);
    throw new Error('Invalid Login Id or Password');
  }

  // Find user by either loginId or email
  const user = await User.findOne({
    $or: [{ loginId: identifier }, { email: identifier }],
  }).select('+password');

  const valid = user && (await user.matchPassword(password));
  if (!valid) {
    res.status(401);
    throw new Error('Invalid Login Id or Password');
  }

  const token = generateAuthToken(user._id);
  setAuthCookie(res, token);

  res.status(200).json({
    success: true,
    message: 'Login successful.',
    token,
    user: publicUser(user),
  });
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
