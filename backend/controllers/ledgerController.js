const asyncHandler = require('../utils/asyncHandler');
const { StockLedger } = require('../../database/models');

// @desc    Get Stock Ledger audit records (Move History)
// @route   GET /api/ledger
const getStockLedger = asyncHandler(async (req, res) => {
  const { sku, transactionType, limit = 50 } = req.query;
  const filter = {};

  if (sku) filter.sku = sku;
  if (transactionType) filter.transactionType = transactionType;

  const records = await StockLedger.find(filter)
    .sort({ timestamp: -1 })
    .limit(Number(limit));

  res.status(200).json({ success: true, count: records.length, data: records });
});

module.exports = {
  getStockLedger,
};
