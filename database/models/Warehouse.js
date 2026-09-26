const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Location name is required (e.g. Rack A, Production Floor)'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Location code is required (e.g. LOC-A1, PROD-FLR)'],
    trim: true,
    uppercase: true,
  },
  type: {
    type: String,
    enum: ['rack', 'shelf', 'bin', 'floor', 'dock', 'staging', 'general'],
    default: 'general',
  },
  description: {
    type: String,
    default: '',
  },
  capacityUnits: {
    type: Number,
    default: 1000,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Warehouse name is required (e.g. Main Central Warehouse)'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Warehouse code is required (e.g. WH-MAIN)'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      zipCode: { type: String, default: '' },
    },
    contactPerson: {
      type: String,
      default: '',
    },
    contactPhone: {
      type: String,
      default: '',
    },
    locations: [locationSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Warehouse', warehouseSchema);
