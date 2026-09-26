const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  uom: {
    type: String,
    default: 'pcs',
  },
  quantity: {
    type: Number,
    required: true,
    min: [0.01, 'Quantity must be greater than 0'],
  },
});

const internalTransferSchema = new mongoose.Schema(
  {
    transferNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    // Source details
    sourceWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Source warehouse is required'],
    },
    sourceWarehouseName: {
      type: String,
      required: true,
    },
    sourceLocation: {
      type: String,
      required: [true, 'Source location/rack is required (e.g. Rack A)'],
      trim: true,
    },
    // Destination details
    destWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Destination warehouse is required'],
    },
    destWarehouseName: {
      type: String,
      required: true,
    },
    destLocation: {
      type: String,
      required: [true, 'Destination location/rack is required (e.g. Production Floor / Rack B)'],
      trim: true,
    },
    items: [transferItemSchema],
    scheduledDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'],
      default: 'Draft',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    validatedAt: {
      type: Date,
      default: null,
    },
    validatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InternalTransfer', internalTransferSchema);
