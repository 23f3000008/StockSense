const express = require('express');
const router = express.Router();
const {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  addWarehouseLocation,
  deleteWarehouseLocation,
  getInventorySummary,
  getStockView,
  updateStock,
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

// Warehouse CRUD & Details
router.route('/warehouses')
  .get(protect, getWarehouses)
  .post(protect, createWarehouse);

router.route('/warehouses/:id')
  .get(protect, getWarehouseById)
  .put(protect, updateWarehouse)
  .delete(protect, deleteWarehouse);

// Internal Sub-Locations under a Warehouse
router.route('/warehouses/:id/locations')
  .post(protect, addWarehouseLocation);

router.route('/warehouses/:id/locations/:locationId')
  .delete(protect, deleteWarehouseLocation);

// Global Inventory Summary
router.route('/summary')
  .get(protect, getInventorySummary);

// Stock page view (Product, per unit cost, On hand, free to Use)
router.route('/stock')
  .get(protect, getStockView);

// Direct stock update from Stock view (with Move History Ledger audit)
router.route('/stock/update')
  .post(protect, updateStock);

router.route('/stock/:productId')
  .put(protect, updateStock);

module.exports = router;
