const express = require('express');
const router = express.Router();
const {
  getAdjustments,
  getAdjustmentById,
  createAdjustment,
  validateAdjustment,
} = require('../controllers/adjustmentController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getAdjustments)
  .post(protect, createAdjustment);

router.route('/:id')
  .get(protect, getAdjustmentById);

router.route('/:id/validate')
  .post(protect, validateAdjustment);

module.exports = router;
