const mongoose = require('mongoose');

const stockLocationSchema = new mongoose.Schema({
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
  },
  warehouseName: {
    type: String,
    required: true,
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  locationName: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Stock quantity cannot be negative'],
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU / Code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      index: true,
    },
    uom: {
      type: String,
      required: [true, 'Unit of measure is required (e.g. kg, pcs, box, meter)'],
      trim: true,
      default: 'pcs',
    },
    description: {
      type: String,
      default: '',
    },
    // Reordering rules
    minReorderLevel: {
      type: Number,
      default: 10,
      min: [0, 'Reorder level cannot be negative'],
    },
    reorderQuantity: {
      type: Number,
      default: 50,
      min: [1, 'Reorder quantity must be at least 1'],
    },
    costPrice: {
      type: Number,
      default: 0,
      min: [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      default: 0,
      min: [0, 'Selling price cannot be negative'],
    },
    // Stock levels broken down by warehouse and internal location
    stockByLocation: [stockLocationSchema],
    // Total aggregate stock across all locations
    totalStock: {
      type: Number,
      default: 0,
      min: [0, 'Total stock cannot be negative'],
      index: true,
    },
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

// Virtual helper to determine stock status
productSchema.virtual('stockStatus').get(function () {
  if (this.totalStock <= 0) return 'Out of Stock';
  if (this.totalStock <= this.minReorderLevel) return 'Low Stock';
  return 'In Stock';
});

// Pre-save hook to calculate totalStock automatically from stockByLocation
productSchema.pre('save', function (next) {
  if (this.stockByLocation && this.stockByLocation.length > 0) {
    this.totalStock = this.stockByLocation.reduce((acc, loc) => acc + (loc.quantity || 0), 0);
  }
  next();
});

// Compound text index for fast search by name, SKU, and category
productSchema.index({ name: 'text', sku: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
