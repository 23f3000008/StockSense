const asyncHandler = require('../utils/asyncHandler');
const { Receipt, Warehouse } = require('../../database/models');
const { processReceiptValidation } = require('../../database/services/stockService');
const { generateOperationReference } = require('../../database/utils/referenceGenerator');

/**
 * Helper to format a receipt document for wireframe views
 */
const formatReceipt = (receipt) => {
  const doc = receipt.toObject ? receipt.toObject() : receipt;
  const wh = doc.warehouseName || (doc.warehouse && doc.warehouse.code) || 'WH';
  const destLoc = (doc.items && doc.items.length > 0 && doc.items[0].destinationLocation)
    ? doc.items[0].destinationLocation
    : 'Stock1';

  return {
    ...doc,
    reference: doc.receiptNumber,
    from: doc.from || 'vendor',
    to: doc.to || `${wh}/${destLoc}`,
    contact: doc.contact || doc.supplierName || '',
    scheduleDate: doc.scheduledDate,
    status: doc.status,
    totalQuantityExpected: (doc.items || []).reduce((sum, item) => sum + (item.quantityExpected || 0), 0),
    totalQuantityReceived: (doc.items || []).reduce((sum, item) => sum + (item.quantityReceived || 0), 0),
    itemCount: (doc.items || []).length,
  };
};

// @desc    Get all receipts (supports search, kanban/list view, filter=late|to-receive|operations, status)
// @route   GET /api/receipts
const getReceipts = asyncHandler(async (req, res) => {
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

  // Semantic filters from Dashboard KPIs
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (queryFilter === 'late') {
    queryConditions.push({
      status: { $nin: ['Done', 'Canceled'] },
      scheduledDate: { $lt: startOfToday },
    });
  } else if (queryFilter === 'to-receive') {
    queryConditions.push({
      status: { $nin: ['Done', 'Canceled'] },
    });
  } else if (queryFilter === 'operations') {
    queryConditions.push({
      status: { $nin: ['Done', 'Canceled'] },
      scheduledDate: { $gte: startOfToday },
    });
  }

  // Search by reference & contacts (and destination location, notes, po ref)
  if (search && search.trim()) {
    const term = search.trim();
    const searchRegex = new RegExp(term, 'i');
    queryConditions.push({
      $or: [
        { receiptNumber: searchRegex },
        { supplierName: searchRegex },
        { supplierContact: searchRegex },
        { contact: searchRegex },
        { from: searchRegex },
        { to: searchRegex },
        { purchaseOrderRef: searchRegex },
        { notes: searchRegex },
        { 'items.productName': searchRegex },
        { 'items.destinationLocation': searchRegex },
      ],
    });
  }

  const filter = queryConditions.length > 0 ? { $and: queryConditions } : {};
  const receipts = await Receipt.find(filter).sort({ receiptNumber: 1 });
  const formattedData = receipts.map(formatReceipt);

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

// @desc    Get single receipt
// @route   GET /api/receipts/:id
const getReceiptById = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id);
  if (!receipt) {
    res.status(404);
    throw new Error('Receipt not found');
  }
  res.status(200).json({ success: true, data: formatReceipt(receipt) });
});

// @desc    Create incoming receipt (auto-increment format: <Warehouse>/IN/<ID>)
// @route   POST /api/receipts
const createReceipt = asyncHandler(async (req, res) => {
  let { receiptNumber, reference, warehouse, warehouseName, from, to, contact, supplierName, items } = req.body;

  // Resolve reference number following <Warehouse>/<Operation>/<ID>
  let finalReference = receiptNumber || reference;
  if (!finalReference) {
    finalReference = await generateOperationReference(warehouse, 'IN');
  }

  // If warehouse name not passed, resolve from DB
  let resolvedWhName = warehouseName;
  if (!resolvedWhName && warehouse) {
    const wh = await Warehouse.findById(warehouse);
    if (wh) resolvedWhName = wh.code ? wh.code.split('-')[0] : wh.name;
  }
  if (!resolvedWhName) resolvedWhName = 'WH';

  const defaultContact = contact || supplierName || 'Azure Interior';
  const defaultSupplier = supplierName || contact || 'Azure Interior';
  const defaultFrom = from || 'vendor';
  const primaryDestLoc = (items && items.length > 0 && items[0].destinationLocation)
    ? items[0].destinationLocation
    : 'Stock1';
  const defaultTo = to || `${resolvedWhName}/${primaryDestLoc}`;

  const receipt = await Receipt.create({
    receiptNumber: finalReference,
    supplierName: defaultSupplier,
    contact: defaultContact,
    from: defaultFrom,
    to: defaultTo,
    warehouse: warehouse || (await Warehouse.findOne())?._id,
    warehouseName: resolvedWhName,
    ...req.body,
    receiptNumber: finalReference,
    status: req.body.status || 'Draft',
    createdBy: req.user ? req.user._id : null,
  });

  res.status(201).json({ success: true, data: formatReceipt(receipt) });
});

// @desc    Update receipt
// @route   PUT /api/receipts/:id
const updateReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id);
  if (!receipt) {
    res.status(404);
    throw new Error('Receipt not found');
  }

  // Cannot modify already validated / done receipts unless manager
  if (receipt.status === 'Done' && req.body.status !== 'Done') {
    res.status(400);
    throw new Error('Cannot edit an already validated (Done) receipt');
  }

  Object.assign(receipt, req.body);
  await receipt.save();

  res.status(200).json({ success: true, data: formatReceipt(receipt) });
});

// @desc    Quick status update (for Kanban board drag & drop)
// @route   PATCH /api/receipts/:id/status
const updateReceiptStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status || !['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status. Allowed: Draft, Waiting, Ready, Done, Canceled');
  }

  const receipt = await Receipt.findById(req.params.id);
  if (!receipt) {
    res.status(404);
    throw new Error('Receipt not found');
  }

  // If changing to Done, execute validation to update stock
  if (status === 'Done' && receipt.status !== 'Done') {
    const userName = req.user ? req.user.name : 'Authorized User';
    const userId = req.user ? req.user._id : null;
    const validated = await processReceiptValidation(req.params.id, userId, userName);
    return res.status(200).json({
      success: true,
      message: 'Receipt validated and moved to Done',
      data: formatReceipt(validated),
    });
  }

  receipt.status = status;
  await receipt.save();

  res.status(200).json({
    success: true,
    message: `Receipt status changed to ${status}`,
    data: formatReceipt(receipt),
  });
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
    data: formatReceipt(updatedReceipt),
  });
});

// @desc    Delete receipt (Draft or Canceled only)
// @route   DELETE /api/receipts/:id
const deleteReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id);
  if (!receipt) {
    res.status(404);
    throw new Error('Receipt not found');
  }

  if (receipt.status === 'Done') {
    res.status(400);
    throw new Error('Cannot delete a validated (Done) receipt with committed stock entries');
  }

  await Receipt.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: 'Receipt deleted successfully' });
});

module.exports = {
  getReceipts,
  getReceiptById,
  createReceipt,
  updateReceipt,
  updateReceiptStatus,
  validateReceipt,
  deleteReceipt,
};
