const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['inventory_manager', 'warehouse_staff'],
        message: '{VALUE} is not a valid role. Choose inventory_manager or warehouse_staff.',
      },
      default: 'inventory_manager',
    },
    phone: {
      type: String,
      default: '',
    },
    warehouseAssigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // OTP-based password reset
    otpCodeHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare hashed password
userSchema.methods.matchPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.setOtp = async function (rawOtp, expiresInMinutes = 10) {
  const salt = await bcrypt.genSalt(10);
  this.otpCodeHash = await bcrypt.hash(rawOtp, salt);
  this.otpExpiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  this.otpAttempts = 0;
};

userSchema.methods.verifyOtp = async function (rawOtp) {
  if (!this.otpCodeHash || !this.otpExpiresAt) return false;
  if (this.otpExpiresAt.getTime() < Date.now()) return false;
  return bcrypt.compare(rawOtp, this.otpCodeHash);
};

userSchema.methods.clearOtp = function () {
  this.otpCodeHash = undefined;
  this.otpExpiresAt = undefined;
  this.otpAttempts = 0;
};

module.exports = mongoose.model('User', userSchema);

