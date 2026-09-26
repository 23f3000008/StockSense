const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['password_reset', 'email_verification', 'account_login'],
      default: 'password_reset',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Document will automatically be removed by MongoDB when expiresAt is reached
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Otp', otpSchema);
