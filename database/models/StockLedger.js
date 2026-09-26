const mongoose = require('mongoose');

const stockLedgerSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      enum: ['Receipt', 'Delivery', 'Internal Transfer', 'Adjustment', 'Initial Setup'],
      required: true,
      index: true,
    },
    referenceNumber: {
      type: String,
      required: true,
      index: true,
    },
    referenceDocId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    contact: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'],
      default: 'Done',
      index: true,
    },
    direction: {
      type: String,
      enum: ['IN', 'OUT', 'INTERNAL', 'ADJUSTMENT'],
      default: 'IN',
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      default: '',
      index: true,
    },
    uom: {
      type: String,
      default: 'pcs',
    },
    // Location tracing
    sourceWarehouse: {
      type: String,
      default: 'N/A',
      index: true,
    },
    sourceLocation: {
      type: String,
      default: 'N/A',
    },
    destinationWarehouse: {
      type: String,
      default: 'N/A',
      index: true,
    },
    destinationLocation: {
      type: String,
      default: 'N/A',
    },
    // Quantities
    quantityDelta: {
      type: Number,
      required: true, // + for additions, - for subtractions, 0 for pure internal transfers
    },
    balanceAfterTransaction: {
      type: Number,
      required: true,
    },
    performedBy: {
      type: String,
      default: 'System',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for high performance filtered history lookups
stockLedgerSchema.index({ product: 1, timestamp: -1 });
stockLedgerSchema.index({ transactionType: 1, timestamp: -1 });
stockLedgerSchema.index({ sku: 1, timestamp: -1 });

module.exports = mongoose.model('StockLedger', stockLedgerSchema);
