const asyncHandler = require('../utils/asyncHandler');
const { StockAdjustment } = require('../../database/models');
const { processStockAdjustment } = require('../../database/services/stockService');

// @desc    Get all adjustments
// @route   GET /api/adjustments
const getAdjustments = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const adjustments = await StockAdjustment.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: adjustments.length, data: adjustments });
});

// @desc    Get single adjustment
// @route   GET /api/adjustments/:id
const getAdjustmentById = asyncHandler(async (req, res) => {
  const adjustment = await StockAdjustment.findById(req.params.id);
  if (!adjustment) {
    res.status(404);
    throw new Error('Adjustment record not found');
  }
  res.status(200).json({ success: true, data: adjustment });
});

// @desc    Create an adjustment record
// @route   POST /api/adjustments
const createAdjustment = asyncHandler(async (req, res) => {
  const count = await StockAdjustment.countDocuments();
  const adjustmentNumber = req.body.adjustmentNumber || `ADJ-${String(count + 1).padStart(4, '0')}`;

  const adjustment = await StockAdjustment.create({
    adjustmentNumber,
    ...req.body,
    status: req.body.status || 'Draft',
  });

  res.status(201).json({ success: true, data: adjustment });
});

// @desc    Validate stock adjustment
// @route   POST /api/adjustments/:id/validate
const validateAdjustment = asyncHandler(async (req, res) => {
  const userName = req.user ? req.user.name : 'Authorized User';
  const userId = req.user ? req.user._id : null;

  const updatedAdjustment = await processStockAdjustment(req.params.id, userId, userName);
  res.status(200).json({
    success: true,
    message: 'Stock adjustment applied and ledger synced successfully',
    data: updatedAdjustment,
  });
});

module.exports = {
  getAdjustments,
  getAdjustmentById,
  createAdjustment,
  validateAdjustment,
};
