const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

// Reads the httpOnly "token" cookie, verifies it, and attaches req.user.
// Also accepts an Authorization: Bearer header as a fallback for
// non-browser clients (mobile apps, Postman, etc).
const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authenticated. Please log in.');
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'stocksense_dev_jwt_secret_key_2026';
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401);
      throw new Error('User no longer exists.');
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Session expired or invalid. Please log in again.');
  }
});

module.exports = { protect };
