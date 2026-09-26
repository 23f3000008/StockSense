const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema(
  {
    adjustmentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse is required'],
    },
    warehouseName: {
      type: String,
      required: true,
    },
    locationName: {
      type: String,
      required: [true, 'Location/rack name is required'],
      trim: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
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
    recordedQuantity: {
      type: Number,
      required: true,
    },
    countedQuantity: {
      type: Number,
      required: true,
      min: [0, 'Counted physical quantity cannot be negative'],
    },
    difference: {
      type: Number,
      required: true, // countedQuantity - recordedQuantity
    },
    reason: {
      type: String,
      enum: ['Damaged Goods', 'Physical Inventory Count', 'Theft / Loss', 'Data Entry Correction', 'Expired', 'Other'],
      default: 'Physical Inventory Count',
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

// Pre-validate hook to calculate difference
stockAdjustmentSchema.pre('validate', function (next) {
  if (this.countedQuantity !== undefined && this.recordedQuantity !== undefined) {
    this.difference = Number((this.countedQuantity - this.recordedQuantity).toFixed(4));
  }
  next();
});

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
