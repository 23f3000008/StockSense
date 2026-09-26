const asyncHandler = require('../utils/asyncHandler');
const { Product } = require('../../database/models');

// @desc    Get all products (with optional search, category, lowStock filter)
// @route   GET /api/products
const getProducts = asyncHandler(async (req, res) => {
  const { search, category, lowStock } = req.query;
  const filter = {};

  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }

  let products = await Product.find(filter).sort({ name: 1 });

  if (lowStock === 'true') {
    products = products.filter((p) => p.totalStock <= p.minReorderLevel);
  }

  res.status(200).json({ success: true, count: products.length, data: products });
});

// @desc    Get single product by ID
// @route   GET /api/products/:id
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.status(200).json({ success: true, data: product });
});

// @desc    Create a product
// @route   POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const { name, sku, category, uom, minReorderLevel, unitCost } = req.body;
  const existing = await Product.findOne({ sku });
  if (existing) {
    res.status(400);
    throw new Error(`Product with SKU '${sku}' already exists`);
  }

  const product = await Product.create({
    name,
    sku,
    category,
    uom: uom || 'Units',
    minReorderLevel: minReorderLevel || 10,
    unitCost: unitCost || 0,
    totalStock: 0,
    stockByLocation: [],
  });

  res.status(201).json({ success: true, data: product });
});

// @desc    Update a product
// @route   PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.status(200).json({ success: true, data: product });
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.status(200).json({ success: true, message: 'Product removed' });
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
