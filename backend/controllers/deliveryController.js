const asyncHandler = require('../utils/asyncHandler');
const { DeliveryOrder } = require('../../database/models');
const { processDeliveryOrderValidation } = require('../../database/services/stockService');

// @desc    Get all delivery orders (supports filter=late, filter=to-deliver, filter=waiting, filter=operations)
// @route   GET /api/deliveries
const getDeliveries = asyncHandler(async (req, res) => {
  const { status, filter: queryFilter } = req.query;
  const filter = {};

  if (status) filter.status = status;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (queryFilter === 'late') {
    filter.status = { $nin: ['Done', 'Canceled'] };
    filter.scheduledDate = { $lt: startOfToday };
  } else if (queryFilter === 'to-deliver') {
    filter.status = { $in: ['Ready', 'Waiting', 'Draft'] };
  } else if (queryFilter === 'waiting') {
    filter.status = 'Waiting';
  } else if (queryFilter === 'operations') {
    filter.status = { $nin: ['Done', 'Canceled'] };
    filter.scheduledDate = { $gte: startOfToday };
  }

  const deliveries = await DeliveryOrder.find(filter).sort({ scheduledDate: 1, createdAt: -1 });
  res.status(200).json({ success: true, count: deliveries.length, data: deliveries });
});

// @desc    Get single delivery order
// @route   GET /api/deliveries/:id
const getDeliveryById = asyncHandler(async (req, res) => {
  const delivery = await DeliveryOrder.findById(req.params.id);
  if (!delivery) {
    res.status(404);
    throw new Error('Delivery order not found');
  }
  res.status(200).json({ success: true, data: delivery });
});

// @desc    Create delivery order
// @route   POST /api/deliveries
const createDelivery = asyncHandler(async (req, res) => {
  const count = await DeliveryOrder.countDocuments();
  const orderNumber = req.body.orderNumber || `DEL-${String(count + 1).padStart(4, '0')}`;

  const delivery = await DeliveryOrder.create({
    orderNumber,
    ...req.body,
    status: req.body.status || 'Draft',
  });

  res.status(201).json({ success: true, data: delivery });
});

// @desc    Validate delivery order (Stock reduction & Ledger entry)
// @route   POST /api/deliveries/:id/validate
const validateDelivery = asyncHandler(async (req, res) => {
  const userName = req.user ? req.user.name : 'Authorized User';
  const userId = req.user ? req.user._id : null;

  const updatedDelivery = await processDeliveryOrderValidation(req.params.id, userId, userName);
  res.status(200).json({
    success: true,
    message: 'Delivery order validated and stock deducted successfully',
    data: updatedDelivery,
  });
});

module.exports = {
  getDeliveries,
  getDeliveryById,
  createDelivery,
  validateDelivery,
};
