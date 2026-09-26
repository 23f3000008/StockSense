const mongoose = require('mongoose');

const receiptItemSchema = new mongoose.Schema({
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
  quantityExpected: {
    type: Number,
    required: true,
    min: [0.01, 'Quantity expected must be greater than 0'],
  },
  quantityReceived: {
    type: Number,
    default: 0,
    min: [0, 'Quantity received cannot be negative'],
  },
  unitPrice: {
    type: Number,
    default: 0,
  },
  destinationLocation: {
    type: String,
    default: 'Receiving Dock',
  },
});

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    supplierName: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    supplierContact: {
      type: String,
      default: '',
    },
    purchaseOrderRef: {
      type: String,
      default: '',
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Destination warehouse is required'],
    },
    warehouseName: {
      type: String,
      required: true,
    },
    items: [receiptItemSchema],
    status: {
      type: String,
      enum: ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'],
      default: 'Draft',
      index: true,
    },
    scheduledDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    from: {
      type: String,
      default: 'vendor',
      trim: true,
    },
    to: {
      type: String,
      default: '',
      trim: true,
    },
    contact: {
      type: String,
      default: '',
      trim: true,
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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: reference -> receiptNumber
receiptSchema.virtual('reference').get(function () {
  return this.receiptNumber;
});

// Virtual helper for 'To' location string (e.g. WH/Stock1)
receiptSchema.virtual('toFormatted').get(function () {
  if (this.to) return this.to;
  const wh = this.warehouseName || 'WH';
  const destLoc = (this.items && this.items.length > 0 && this.items[0].destinationLocation)
    ? this.items[0].destinationLocation
    : 'Stock1';
  return `${wh}/${destLoc}`;
});

// Virtual helper for contact display
receiptSchema.virtual('contactDisplay').get(function () {
  return this.contact || this.supplierName || '';
});

module.exports = mongoose.model('Receipt', receiptSchema);
