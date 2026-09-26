const asyncHandler = require('../utils/asyncHandler');
const { DeliveryOrder, Warehouse } = require('../../database/models');
const { processDeliveryOrderValidation } = require('../../database/services/stockService');
const { generateOperationReference } = require('../../database/utils/referenceGenerator');

/**
 * Helper to format a delivery order document for wireframe views
 */
const formatDelivery = (delivery) => {
  const doc = delivery.toObject ? delivery.toObject() : delivery;
  const wh = doc.warehouseName || (doc.warehouse && doc.warehouse.code) || 'WH';
  const srcLoc = (doc.items && doc.items.length > 0 && doc.items[0].sourceLocation)
    ? doc.items[0].sourceLocation
    : 'Stock1';

  return {
    ...doc,
    reference: doc.orderNumber,
    from: doc.from || `${wh}/${srcLoc}`,
    to: doc.to || doc.customerName || '',
    contact: doc.contact || doc.customerName || '',
    scheduleDate: doc.scheduledDate,
    status: doc.status,
    totalQuantityOrdered: (doc.items || []).reduce((sum, item) => sum + (item.quantityOrdered || 0), 0),
    totalQuantityPicked: (doc.items || []).reduce((sum, item) => sum + (item.quantityPicked || 0), 0),
    totalQuantityPacked: (doc.items || []).reduce((sum, item) => sum + (item.quantityPacked || 0), 0),
    itemCount: (doc.items || []).length,
  };
};

// @desc    Get all delivery orders (supports search, kanban/list view, filter=late|to-deliver|waiting|operations)
// @route   GET /api/deliveries
const getDeliveries = asyncHandler(async (req, res) => {
  const { status, filter: queryFilter, search, view = 'list', warehouse } = req.query;
  const queryConditions = [];

  // Warehouse filter
  if (warehouse) {
    queryConditions.push({ warehouse });
  }

  // Exact status filter
  if (status) {
    queryConditions.push({ status });
  }

  // Semantic filters matching Dashboard KPIs
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (queryFilter === 'late') {
    queryConditions.push({
      status: { $nin: ['Done', 'Canceled'] },
      scheduledDate: { $lt: startOfToday },
    });
  } else if (queryFilter === 'to-deliver') {
    queryConditions.push({
      status: { $in: ['Ready', 'Waiting', 'Draft'] },
    });
  } else if (queryFilter === 'waiting') {
    queryConditions.push({
      status: 'Waiting',
    });
  } else if (queryFilter === 'operations') {
    queryConditions.push({
      status: { $nin: ['Done', 'Canceled'] },
      scheduledDate: { $gte: startOfToday },
    });
  }

  // Search by reference & contacts
  if (search && search.trim()) {
    const term = search.trim();
    const searchRegex = new RegExp(term, 'i');
    queryConditions.push({
      $or: [
        { orderNumber: searchRegex },
        { customerName: searchRegex },
        { contact: searchRegex },
        { from: searchRegex },
        { to: searchRegex },
        { shippingAddress: searchRegex },
        { salesOrderRef: searchRegex },
        { carrier: searchRegex },
        { notes: searchRegex },
        { 'items.productName': searchRegex },
        { 'items.sourceLocation': searchRegex },
      ],
    });
  }

  const filter = queryConditions.length > 0 ? { $and: queryConditions } : {};
  const deliveries = await DeliveryOrder.find(filter).sort({ orderNumber: 1 });
  const formattedData = deliveries.map(formatDelivery);

  // If Kanban view requested, group by status
  if (view === 'kanban') {
    const statuses = ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];
    const columns = {};
    const counts = {};

    statuses.forEach((s) => {
      columns[s] = [];
      counts[s] = 0;
    });

    formattedData.forEach((item) => {
      const col = columns[item.status] ? item.status : 'Draft';
      columns[col].push(item);
      counts[col] = (counts[col] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      view: 'kanban',
      total: formattedData.length,
      counts,
      columns,
      data: formattedData,
    });
  }

  // Default List View
  res.status(200).json({
    success: true,
    view: 'list',
    count: formattedData.length,
    data: formattedData,
  });
});

// @desc    Get single delivery order
// @route   GET /api/deliveries/:id
const getDeliveryById = asyncHandler(async (req, res) => {
  const delivery = await DeliveryOrder.findById(req.params.id);
  if (!delivery) {
    res.status(404);
    throw new Error('Delivery order not found');
  }
  res.status(200).json({ success: true, data: formatDelivery(delivery) });
});

// @desc    Create delivery order (auto-increment format: <Warehouse>/OUT/<ID>)
// @route   POST /api/deliveries
const createDelivery = asyncHandler(async (req, res) => {
  let { orderNumber, reference, warehouse, warehouseName, from, to, contact, customerName, items } = req.body;

  // Resolve reference number following <Warehouse>/<Operation>/<ID>
  let finalReference = orderNumber || reference;
  if (!finalReference) {
    finalReference = await generateOperationReference(warehouse, 'OUT');
  }

  // If warehouse name not passed, resolve from DB
  let resolvedWhName = warehouseName;
  if (!resolvedWhName && warehouse) {
    const wh = await Warehouse.findById(warehouse);
    if (wh) resolvedWhName = wh.code ? wh.code.split('-')[0] : wh.name;
  }
  if (!resolvedWhName) resolvedWhName = 'WH';

  const defaultCustomer = customerName || contact || 'Azure Interior';
  const defaultContact = contact || customerName || 'Azure Interior';
  const primarySrcLoc = (items && items.length > 0 && items[0].sourceLocation)
    ? items[0].sourceLocation
    : 'Stock1';
  const defaultFrom = from || `${resolvedWhName}/${primarySrcLoc}`;
  const defaultTo = to || defaultCustomer;

  const delivery = await DeliveryOrder.create({
    orderNumber: finalReference,
    customerName: defaultCustomer,
    contact: defaultContact,
    from: defaultFrom,
    to: defaultTo,
    warehouse: warehouse || (await Warehouse.findOne())?._id,
    warehouseName: resolvedWhName,
    ...req.body,
    orderNumber: finalReference,
    status: req.body.status || 'Draft',
    createdBy: req.user ? req.user._id : null,
  });

  res.status(201).json({ success: true, data: formatDelivery(delivery) });
});

// @desc    Update delivery order
// @route   PUT /api/deliveries/:id
const updateDelivery = asyncHandler(async (req, res) => {
  const delivery = await DeliveryOrder.findById(req.params.id);
  if (!delivery) {
    res.status(404);
    throw new Error('Delivery order not found');
  }

  if (delivery.status === 'Done' && req.body.status !== 'Done') {
    res.status(400);
    throw new Error('Cannot edit an already validated (Done) delivery order');
  }

  Object.assign(delivery, req.body);
  await delivery.save();

  res.status(200).json({ success: true, data: formatDelivery(delivery) });
});

// @desc    Quick status update (for Kanban board drag & drop)
// @route   PATCH /api/deliveries/:id/status
const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status || !['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status. Allowed: Draft, Waiting, Ready, Done, Canceled');
  }

  const delivery = await DeliveryOrder.findById(req.params.id);
  if (!delivery) {
    res.status(404);
    throw new Error('Delivery order not found');
  }

  // If transitioning to Done, trigger stock validation
  if (status === 'Done' && delivery.status !== 'Done') {
    const userName = req.user ? req.user.name : 'Authorized User';
    const userId = req.user ? req.user._id : null;
    const validated = await processDeliveryOrderValidation(req.params.id, userId, userName);
    return res.status(200).json({
      success: true,
      message: 'Delivery order validated and stock deducted',
      data: formatDelivery(validated),
    });
  }

  delivery.status = status;
  await delivery.save();

  res.status(200).json({
    success: true,
    message: `Delivery status changed to ${status}`,
    data: formatDelivery(delivery),
  });
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
    data: formatDelivery(updatedDelivery),
  });
});

// @desc    Delete delivery order (Draft or Canceled only)
// @route   DELETE /api/deliveries/:id
const deleteDelivery = asyncHandler(async (req, res) => {
  const delivery = await DeliveryOrder.findById(req.params.id);
  if (!delivery) {
    res.status(404);
    throw new Error('Delivery order not found');
  }

  if (delivery.status === 'Done') {
    res.status(400);
    throw new Error('Cannot delete a validated (Done) delivery order with deducted inventory');
  }

  await DeliveryOrder.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: 'Delivery order deleted successfully' });
});

module.exports = {
  getDeliveries,
  getDeliveryById,
  createDelivery,
  updateDelivery,
  updateDeliveryStatus,
  validateDelivery,
  deleteDelivery,
};
