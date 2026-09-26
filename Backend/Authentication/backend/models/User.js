const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'],
    },
    password: { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
    role: { type: String, enum: ['Inventory Manager', 'Warehouse Staff'], default: 'Inventory Manager' },

    // OTP-based password reset
    otpCodeHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

// Hash password before save, only when modified
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.setOtp = async function setOtp(rawOtp, expiresInMinutes) {
  const salt = await bcrypt.genSalt(10);
  this.otpCodeHash = await bcrypt.hash(rawOtp, salt);
  this.otpExpiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  this.otpAttempts = 0;
};

userSchema.methods.verifyOtp = async function verifyOtp(rawOtp) {
  if (!this.otpCodeHash || !this.otpExpiresAt) return false;
  if (this.otpExpiresAt.getTime() < Date.now()) return false;
  return bcrypt.compare(rawOtp, this.otpCodeHash);
};

userSchema.methods.clearOtp = function clearOtp() {
  this.otpCodeHash = undefined;
  this.otpExpiresAt = undefined;
  this.otpAttempts = 0;
};

module.exports = mongoose.model('User', userSchema);
