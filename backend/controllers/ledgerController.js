const asyncHandler = require('../utils/asyncHandler');
const {
  StockLedger,
  Receipt,
  DeliveryOrder,
  InternalTransfer,
  StockAdjustment,
  Product,
  Warehouse,
} = require('../../database/models');

// Helper to format date as D/M/YYYY or local string
function formatDate(d) {
  if (!d) return '';
  const dateObj = new Date(d);
  return `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
}

// @desc    Get Move History (with search by reference/contacts, multi-product row unrolling, and list/kanban views)
// @route   GET /api/ledger or GET /api/moves
const getMoveHistory = asyncHandler(async (req, res) => {
  const { search, status, direction, contact, reference, view = 'list' } = req.query;

  // 1. Fetch pending & active operations to combine with ledger history
  const [receipts, deliveries, transfers, adjustments, ledgerLogs] = await Promise.all([
    Receipt.find().sort({ createdAt: -1 }),
    DeliveryOrder.find().sort({ createdAt: -1 }),
    InternalTransfer.find().sort({ createdAt: -1 }),
    StockAdjustment.find().sort({ createdAt: -1 }),
    StockLedger.find().sort({ timestamp: -1 }),
  ]);

  const moves = [];

  // A. Process Inbound Receipts (IN moves - green)
  receipts.forEach((rec) => {
    const fromLoc = rec.supplierName ? `${rec.supplierName} (vendor)` : 'vendor';
    const toWh = rec.warehouseName || 'WH';

    (rec.items || []).forEach((item) => {
      const destLocation = item.destinationLocation || 'Stock1';
      moves.push({
        id: `${rec._id}-${item._id || item.sku}`,
        operationId: rec._id,
        operationType: 'Receipt',
        reference: rec.receiptNumber,
        date: formatDate(rec.createdAt),
        rawDate: rec.createdAt,
        contact: rec.supplierName || 'Unknown Vendor',
        from: 'vendor',
        to: `${toWh}/${destLocation}`,
        product: item.productName || item.sku,
        sku: item.sku,
        quantity: item.quantityReceived > 0 ? item.quantityReceived : item.quantityExpected,
        uom: item.uom || 'pcs',
        status: rec.status || 'Draft',
        direction: 'IN',
        color: 'green',
      });
    });
  });

  // B. Process Outbound Deliveries (OUT moves - red)
  deliveries.forEach((del) => {
    const fromWh = del.warehouseName || 'WH';
    const toLoc = del.customerName || 'vendor';

    (del.items || []).forEach((item) => {
      const srcLocation = item.sourceLocation || 'Stock1';
      moves.push({
        id: `${del._id}-${item._id || item.sku}`,
        operationId: del._id,
        operationType: 'Delivery',
        reference: del.orderNumber,
        date: formatDate(del.createdAt),
        rawDate: del.createdAt,
        contact: del.customerName || 'Customer',
        from: `${fromWh}/${srcLocation}`,
        to: 'vendor',
        product: item.productName || item.sku,
        sku: item.sku,
        quantity: item.quantityOrdered,
        uom: item.uom || 'pcs',
        status: del.status || 'Draft',
        direction: 'OUT',
        color: 'red',
      });
    });
  });

  // C. Process Internal Transfers (INTERNAL moves)
  transfers.forEach((trf) => {
    (trf.items || []).forEach((item) => {
      moves.push({
        id: `${trf._id}-${item._id || item.sku}`,
        operationId: trf._id,
        operationType: 'Internal Transfer',
        reference: trf.transferNumber,
        date: formatDate(trf.createdAt),
        rawDate: trf.createdAt,
        contact: 'Internal Logistics',
        from: `${trf.sourceWarehouseName}/${trf.sourceLocation}`,
        to: `${trf.destWarehouseName}/${trf.destLocation}`,
        product: item.productName || item.sku,
        sku: item.sku,
        quantity: item.quantity,
        uom: item.uom || 'pcs',
        status: trf.status || 'Draft',
        direction: 'INTERNAL',
        color: 'blue',
      });
    });
  });

  // D. Process Stock Adjustments
  adjustments.forEach((adj) => {
    const isIncrease = adj.difference >= 0;
    moves.push({
      id: `${adj._id}`,
      operationId: adj._id,
      operationType: 'Adjustment',
      reference: adj.adjustmentNumber,
      date: formatDate(adj.createdAt),
      rawDate: adj.createdAt,
      contact: 'Inventory Recount',
      from: isIncrease ? 'Physical Recount' : `${adj.warehouseName}/${adj.locationName}`,
      to: isIncrease ? `${adj.warehouseName}/${adj.locationName}` : 'Inventory Discrepancy',
      product: adj.productName || adj.sku,
      sku: adj.sku,
      quantity: Math.abs(adj.difference),
      uom: adj.uom || 'pcs',
      status: adj.status || 'Draft',
      direction: isIncrease ? 'IN' : 'OUT',
      color: isIncrease ? 'green' : 'red',
    });
  });

  // E. Process explicit StockLedger records if not already captured
  ledgerLogs.forEach((log) => {
    const existingRef = moves.some((m) => m.reference === log.referenceNumber && m.sku === log.sku);
    if (!existingRef) {
      const isOut = log.quantityDelta < 0;
      moves.push({
        id: log._id.toString(),
        operationId: log.referenceDocId || log._id,
        operationType: log.transactionType,
        reference: log.referenceNumber,
        date: formatDate(log.timestamp),
        rawDate: log.timestamp,
        contact: log.contact || log.performedBy || 'System',
        from: `${log.sourceWarehouse}/${log.sourceLocation}`,
        to: `${log.destinationWarehouse}/${log.destinationLocation}`,
        product: log.productName,
        sku: log.sku,
        quantity: Math.abs(log.quantityDelta),
        uom: log.uom || 'pcs',
        status: log.status || 'Done',
        direction: isOut ? 'OUT' : 'IN',
        color: isOut ? 'red' : 'green',
      });
    }
  });

  // 2. Sort all moves by date descending
  moves.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

  // 3. Filter moves based on query params
  let filteredMoves = moves;

  if (search) {
    const searchLower = search.trim().toLowerCase();
    filteredMoves = filteredMoves.filter(
      (m) =>
        m.reference.toLowerCase().includes(searchLower) ||
        m.contact.toLowerCase().includes(searchLower) ||
        m.product.toLowerCase().includes(searchLower) ||
        m.sku.toLowerCase().includes(searchLower)
    );
  }

  if (contact) {
    filteredMoves = filteredMoves.filter((m) =>
      m.contact.toLowerCase().includes(contact.toLowerCase())
    );
  }

  if (reference) {
    filteredMoves = filteredMoves.filter((m) =>
      m.reference.toLowerCase().includes(reference.toLowerCase())
    );
  }

  if (status) {
    filteredMoves = filteredMoves.filter(
      (m) => m.status.toLowerCase() === status.toLowerCase()
    );
  }

  if (direction) {
    filteredMoves = filteredMoves.filter(
      (m) => m.direction.toUpperCase() === direction.toUpperCase()
    );
  }

  // 4. If Kanban view requested, group by Status: Draft, Waiting, Ready, Done
  if (view.toLowerCase() === 'kanban') {
    const kanbanGroups = {
      Draft: [],
      Waiting: [],
      Ready: [],
      Done: [],
    };

    filteredMoves.forEach((move) => {
      const col = kanbanGroups[move.status] ? move.status : 'Done';
      kanbanGroups[col].push(move);
    });

    return res.status(200).json({
      success: true,
      view: 'kanban',
      totalMoves: filteredMoves.length,
      data: kanbanGroups,
    });
  }

  // 5. Default List View
  res.status(200).json({
    success: true,
    view: 'list',
    count: filteredMoves.length,
    data: filteredMoves,
  });
});

// @desc    Create a new manual stock move (NEW button on Move History)
// @route   POST /api/ledger or POST /api/moves
const createMove = asyncHandler(async (req, res) => {
  const {
    direction = 'IN',
    contact,
    productId,
    quantity,
    fromWarehouse,
    fromLocation,
    toWarehouse,
    toLocation,
    status = 'Ready',
    notes,
  } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    res.status(400);
    throw new Error('Valid productId and quantity (> 0) are required.');
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }

  const isIncoming = direction.toUpperCase() === 'IN';
  const prefix = isIncoming ? 'WH/IN' : 'WH/OUT';
  const count = (await StockLedger.countDocuments()) + 1;
  const reference = `${prefix}/${String(count).padStart(4, '0')}`;

  const userName = req.user ? req.user.name : 'Inventory Manager';
  const userId = req.user ? req.user._id : null;

  const newMove = await StockLedger.create({
    transactionType: isIncoming ? 'Receipt' : 'Delivery',
    referenceNumber: reference,
    contact: contact || (isIncoming ? 'Vendor' : 'Customer'),
    status: status,
    direction: isIncoming ? 'IN' : 'OUT',
    product: product._id,
    productName: product.name,
    sku: product.sku,
    category: product.category,
    uom: product.uom,
    sourceWarehouse: isIncoming ? 'vendor' : fromWarehouse || 'Main Central Warehouse',
    sourceLocation: isIncoming ? 'vendor' : fromLocation || 'Stock1',
    destinationWarehouse: isIncoming ? toWarehouse || 'Main Central Warehouse' : 'vendor',
    destinationLocation: isIncoming ? toLocation || 'Stock1' : 'vendor',
    quantityDelta: isIncoming ? Number(quantity) : -Number(quantity),
    balanceAfterTransaction: product.totalStock,
    performedBy: userName,
    userId: userId,
    notes: notes || `Direct move created via Move History`,
  });

  res.status(201).json({
    success: true,
    message: 'Stock move recorded successfully',
    data: {
      id: newMove._id,
      reference: newMove.referenceNumber,
      date: formatDate(newMove.timestamp),
      contact: newMove.contact,
      from: `${newMove.sourceWarehouse}/${newMove.sourceLocation}`,
      to: `${newMove.destinationWarehouse}/${newMove.destinationLocation}`,
      product: newMove.productName,
      sku: newMove.sku,
      quantity: Math.abs(newMove.quantityDelta),
      status: newMove.status,
      direction: newMove.direction,
      color: newMove.direction === 'IN' ? 'green' : 'red',
    },
  });
});

module.exports = {
  getMoveHistory,
  createMove,
};
