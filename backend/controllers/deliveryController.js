const asyncHandler = require('../utils/asyncHandler');
const { DeliveryOrder } = require('../../database/models');
const { processDeliveryOrderValidation } = require('../../database/services/stockService');

// @desc    Get all delivery orders
// @route   GET /api/deliveries
const getDeliveries = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const deliveries = await DeliveryOrder.find(filter).sort({ createdAt: -1 });
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
