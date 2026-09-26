const asyncHandler = require('../utils/asyncHandler');
const { Receipt } = require('../../database/models');
const { processReceiptValidation } = require('../../database/services/stockService');

// @desc    Get all receipts (supports filter=late, filter=to-receive, filter=operations)
// @route   GET /api/receipts
const getReceipts = asyncHandler(async (req, res) => {
  const { status, filter: queryFilter } = req.query;
  const filter = {};

  if (status) filter.status = status;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (queryFilter === 'late') {
    filter.status = { $nin: ['Done', 'Canceled'] };
    filter.scheduledDate = { $lt: startOfToday };
  } else if (queryFilter === 'to-receive') {
    filter.status = { $nin: ['Done', 'Canceled'] };
  } else if (queryFilter === 'operations') {
    filter.status = { $nin: ['Done', 'Canceled'] };
    filter.scheduledDate = { $gte: startOfToday };
  }

  const receipts = await Receipt.find(filter).sort({ scheduledDate: 1, createdAt: -1 });
  res.status(200).json({ success: true, count: receipts.length, data: receipts });
});

// @desc    Get single receipt
// @route   GET /api/receipts/:id
const getReceiptById = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id);
  if (!receipt) {
    res.status(404);
    throw new Error('Receipt not found');
  }
  res.status(200).json({ success: true, data: receipt });
});

// @desc    Create incoming receipt (Draft / Ready)
// @route   POST /api/receipts
const createReceipt = asyncHandler(async (req, res) => {
  const count = await Receipt.countDocuments();
  const receiptNumber = req.body.receiptNumber || `REC-${String(count + 1).padStart(4, '0')}`;

  const receipt = await Receipt.create({
    receiptNumber,
    ...req.body,
    status: req.body.status || 'Draft',
  });

  res.status(201).json({ success: true, data: receipt });
});

// @desc    Validate receipt (Atomic stock increment & Ledger log)
// @route   POST /api/receipts/:id/validate
const validateReceipt = asyncHandler(async (req, res) => {
  const userName = req.user ? req.user.name : 'Authorized User';
  const userId = req.user ? req.user._id : null;

  const updatedReceipt = await processReceiptValidation(req.params.id, userId, userName);
  res.status(200).json({
    success: true,
    message: 'Receipt validated and stock updated successfully',
    data: updatedReceipt,
  });
});

module.exports = {
  getReceipts,
  getReceiptById,
  createReceipt,
  validateReceipt,
};
