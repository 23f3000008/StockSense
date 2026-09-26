const asyncHandler = require('../utils/asyncHandler');
const { InternalTransfer } = require('../../database/models');
const { processTransferValidation } = require('../../database/services/stockService');

// @desc    Get all internal transfers
// @route   GET /api/transfers
const getTransfers = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const transfers = await InternalTransfer.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: transfers.length, data: transfers });
});

// @desc    Get single internal transfer
// @route   GET /api/transfers/:id
const getTransferById = asyncHandler(async (req, res) => {
  const transfer = await InternalTransfer.findById(req.params.id);
  if (!transfer) {
    res.status(404);
    throw new Error('Transfer not found');
  }
  res.status(200).json({ success: true, data: transfer });
});

// @desc    Create internal transfer
// @route   POST /api/transfers
const createTransfer = asyncHandler(async (req, res) => {
  const count = await InternalTransfer.countDocuments();
  const transferNumber = req.body.transferNumber || `TRF-${String(count + 1).padStart(4, '0')}`;

  const transfer = await InternalTransfer.create({
    transferNumber,
    ...req.body,
    status: req.body.status || 'Draft',
  });

  res.status(201).json({ success: true, data: transfer });
});

// @desc    Validate internal transfer
// @route   POST /api/transfers/:id/validate
const validateTransfer = asyncHandler(async (req, res) => {
  const userName = req.user ? req.user.name : 'Authorized User';
  const userId = req.user ? req.user._id : null;

  const updatedTransfer = await processTransferValidation(req.params.id, userId, userName);
  res.status(200).json({
    success: true,
    message: 'Transfer validated and inventory relocated successfully',
    data: updatedTransfer,
  });
});

module.exports = {
  getTransfers,
  getTransferById,
  createTransfer,
  validateTransfer,
};
