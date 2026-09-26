const mongoose = require('mongoose');

const deliveryItemSchema = new mongoose.Schema({
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
  quantityOrdered: {
    type: Number,
    required: true,
    min: [0.01, 'Quantity ordered must be greater than 0'],
  },
  quantityPicked: {
    type: Number,
    default: 0,
    min: [0, 'Quantity picked cannot be negative'],
  },
  quantityPacked: {
    type: Number,
    default: 0,
    min: [0, 'Quantity packed cannot be negative'],
  },
  sourceLocation: {
    type: String,
    default: 'Main Storage',
  },
});

const deliveryOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    shippingAddress: {
      type: String,
      default: '',
    },
    salesOrderRef: {
      type: String,
      default: '',
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Source warehouse is required'],
    },
    warehouseName: {
      type: String,
      required: true,
    },
    items: [deliveryItemSchema],
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
    pickingStatus: {
      type: String,
      enum: ['Not Picked', 'Partially Picked', 'Fully Picked'],
      default: 'Not Picked',
    },
    packingStatus: {
      type: String,
      enum: ['Not Packed', 'Partially Packed', 'Packed'],
      default: 'Not Packed',
    },
    carrier: {
      type: String,
      default: '',
    },
    trackingNumber: {
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
    notes: {
      type: String,
      default: '',
    },
    from: {
      type: String,
      default: '',
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: reference -> orderNumber
deliveryOrderSchema.virtual('reference').get(function () {
  return this.orderNumber;
});

// Virtual helper for 'From' location string (e.g. WH/Stock1)
deliveryOrderSchema.virtual('fromFormatted').get(function () {
  if (this.from) return this.from;
  const wh = this.warehouseName || 'WH';
  const srcLoc = (this.items && this.items.length > 0 && this.items[0].sourceLocation)
    ? this.items[0].sourceLocation
    : 'Stock1';
  return `${wh}/${srcLoc}`;
});

// Virtual helper for contact display
deliveryOrderSchema.virtual('contactDisplay').get(function () {
  return this.contact || this.customerName || '';
});

module.exports = mongoose.model('DeliveryOrder', deliveryOrderSchema);
