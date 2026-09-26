const express = require('express');
const router = express.Router();
const {
  getWarehouses,
  createWarehouse,
  getInventorySummary,
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

router.route('/warehouses')
  .get(protect, getWarehouses)
  .post(protect, createWarehouse);

router.route('/summary')
  .get(protect, getInventorySummary);

module.exports = router;
