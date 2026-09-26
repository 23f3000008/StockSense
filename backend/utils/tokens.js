const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'stocksense_dev_jwt_secret_key_2026';
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || 'stocksense_dev_reset_secret_key_2026';

// Long-lived session token, set as an httpOnly cookie after signup/login.
function generateAuthToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
}

// Short-lived token issued only after a correct OTP, required by /reset-password.
// Keeps the reset step from being replayed once the OTP has already been used.
function generateResetToken(userId) {
  return jwt.sign({ id: userId, purpose: 'password-reset' }, RESET_TOKEN_SECRET, {
    expiresIn: process.env.RESET_TOKEN_EXPIRE || '15m',
  });
}

function verifyResetToken(token) {
  const decoded = jwt.verify(token, RESET_TOKEN_SECRET);
  if (decoded.purpose !== 'password-reset') throw new Error('Invalid token purpose');
  return decoded;
}

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd, // requires HTTPS in production
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearAuthCookie(res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
}

module.exports = { generateAuthToken, generateResetToken, verifyResetToken, setAuthCookie, clearAuthCookie };
