const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Location name is required (e.g. Rack A, Production Floor)'],
    trim: true,
  },
  code: {
    type: String,
    trim: true,
    uppercase: true,
    default: function () {
      return (this.name || 'LOC').toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 12);
    },
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
      type: mongoose.Schema.Types.Mixed,
      default: '',
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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias: shortCode -> code
warehouseSchema.virtual('shortCode').get(function () {
  return this.code;
});

// Virtual helper: formattedAddress
warehouseSchema.virtual('formattedAddress').get(function () {
  if (!this.address) return '';
  if (typeof this.address === 'string') return this.address;
  const parts = [
    this.address.street,
    this.address.city,
    this.address.state,
    this.address.country,
    this.address.zipCode,
  ].filter(Boolean);
  return parts.join(', ');
});

module.exports = mongoose.model('Warehouse', warehouseSchema);
