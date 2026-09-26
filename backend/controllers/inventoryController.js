const asyncHandler = require('../utils/asyncHandler');
const { Warehouse, Product } = require('../../database/models');

// @desc    Get all warehouses with their locations
// @route   GET /api/inventory/warehouses
const getWarehouses = asyncHandler(async (req, res) => {
  const warehouses = await Warehouse.find().sort({ name: 1 });
  res.status(200).json({ success: true, count: warehouses.length, data: warehouses });
});

// @desc    Create a warehouse
// @route   POST /api/inventory/warehouses
const createWarehouse = asyncHandler(async (req, res) => {
  const { name, code, address, locations } = req.body;
  const existing = await Warehouse.findOne({ code });
  if (existing) {
    res.status(400);
    throw new Error(`Warehouse with code '${code}' already exists`);
  }

  const warehouse = await Warehouse.create({
    name,
    code,
    address,
    locations: locations || [{ name: 'Main Receiving Dock', type: 'receiving_dock' }],
  });

  res.status(201).json({ success: true, data: warehouse });
});

// @desc    Get inventory summary across all warehouses and locations
// @route   GET /api/inventory/summary
const getInventorySummary = asyncHandler(async (req, res) => {
  const products = await Product.find().select('name sku category totalStock stockByLocation minReorderLevel uom');
  const warehouses = await Warehouse.find().select('name code locations');

  let totalItemsInStock = 0;
  let lowStockCount = 0;

  products.forEach((p) => {
    totalItemsInStock += p.totalStock;
    if (p.totalStock <= p.minReorderLevel) {
      lowStockCount++;
    }
  });

  res.status(200).json({
    success: true,
    totalProducts: products.length,
    totalItemsInStock,
    lowStockCount,
    warehousesCount: warehouses.length,
    products,
    warehouses,
  });
});

module.exports = {
  getWarehouses,
  createWarehouse,
  getInventorySummary,
};
