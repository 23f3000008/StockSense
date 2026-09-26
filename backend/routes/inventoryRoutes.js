const express = require('express');
const router = express.Router();
const {
  getWarehouses,
  createWarehouse,
  getInventorySummary,
  getStockView,
  updateStock,
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

// Warehouse routes
router.route('/warehouses')
  .get(protect, getWarehouses)
  .post(protect, createWarehouse);

// Global summary
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
