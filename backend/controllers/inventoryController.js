const asyncHandler = require('../utils/asyncHandler');
const { Warehouse, Product, DeliveryOrder, StockLedger, StockAdjustment } = require('../../database/models');

// @desc    Get all warehouses with their locations
// @route   GET /api/inventory/warehouses
const getWarehouses = asyncHandler(async (req, res) => {
  const warehouses = await Warehouse.find().sort({ name: 1 });
  res.status(200).json({ success: true, count: warehouses.length, data: warehouses });
});

// @desc    Create a warehouse
// @route   POST /api/inventory/warehouses
const createWarehouse = asyncHandler(async (req, res) => {
  const { name, code, address, locations } = req.body;
  const existing = await Warehouse.findOne({ code });
  if (existing) {
    res.status(400);
    throw new Error(`Warehouse with code '${code}' already exists`);
  }

  const warehouse = await Warehouse.create({
    name,
    code,
    address,
    locations: locations || [{ name: 'Main Storage', type: 'shelf' }],
  });

  res.status(201).json({ success: true, data: warehouse });
});

// @desc    Get inventory summary across all warehouses and locations
// @route   GET /api/inventory/summary
const getInventorySummary = asyncHandler(async (req, res) => {
  const products = await Product.find().select('name sku category totalStock stockByLocation minReorderLevel uom costPrice');
  const warehouses = await Warehouse.find().select('name code locations');

  let totalItemsInStock = 0;
  let lowStockCount = 0;

  products.forEach((p) => {
    totalItemsInStock += p.totalStock;
    if (p.totalStock <= p.minReorderLevel) {
      lowStockCount++;
    }
  });

  res.status(200).json({
    success: true,
    totalProducts: products.length,
    totalItemsInStock,
    lowStockCount,
    warehousesCount: warehouses.length,
    products,
    warehouses,
  });
});

// @desc    Get Stock page view (Product, per unit cost, On hand, free to Use) with warehouse & location details
// @route   GET /api/inventory/stock
const getStockView = asyncHandler(async (req, res) => {
  const { warehouseId, locationName, search, category } = req.query;

  // Build product search query
  const query = {};
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }

  const products = await Product.find(query).sort({ name: 1 });

  // Calculate reserved quantities from pending delivery orders (Draft, Waiting, Ready)
  const pendingOrders = await DeliveryOrder.find({
    status: { $in: ['Draft', 'Waiting', 'Ready'] },
  }).select('items warehouse');

  // Map of productId -> reserved quantity
  const reservedMap = {};
  pendingOrders.forEach((order) => {
    // If filtering by warehouse, only count reservations for that warehouse
    if (!warehouseId || order.warehouse.toString() === warehouseId.toString()) {
      order.items.forEach((item) => {
        const prodId = item.product.toString();
        const unfulfilled = item.quantityOrdered - (item.quantityPacked || 0);
        reservedMap[prodId] = (reservedMap[prodId] || 0) + Math.max(0, unfulfilled);
      });
    }
  });

  // Fetch warehouse context info if provided
  let warehouseContext = null;
  if (warehouseId) {
    warehouseContext = await Warehouse.findById(warehouseId).select('name code locations');
  }

  // Construct table response rows
  const stockRows = products.map((prod) => {
    let onHand = prod.totalStock;

    // If filtered by specific warehouse or location, compute contextual on-hand
    if (warehouseId || locationName) {
      const matchingLocations = prod.stockByLocation.filter((loc) => {
        const whMatch = !warehouseId || loc.warehouse.toString() === warehouseId.toString();
        const locMatch = !locationName || loc.locationName.toLowerCase() === locationName.toLowerCase();
        return whMatch && locMatch;
      });
      onHand = matchingLocations.reduce((acc, loc) => acc + (loc.quantity || 0), 0);
    }

    const reserved = reservedMap[prod._id.toString()] || 0;
    const freeToUse = Math.max(0, onHand - reserved);

    return {
      _id: prod._id,
      product: prod.name,
      sku: prod.sku,
      category: prod.category,
      uom: prod.uom,
      perUnitCost: prod.costPrice || 0,
      onHand: onHand,
      reserved: reserved,
      freeToUse: freeToUse,
      minReorderLevel: prod.minReorderLevel,
      stockByLocation: prod.stockByLocation,
    };
  });

  res.status(200).json({
    success: true,
    count: stockRows.length,
    warehouseContext,
    filter: {
      warehouseId: warehouseId || null,
      locationName: locationName || null,
      search: search || null,
    },
    data: stockRows,
  });
});

// @desc    Directly update product stock from Stock view (with Move History Ledger audit)
// @route   POST /api/inventory/stock/update
// @route   PUT /api/inventory/stock/:productId
const updateStock = asyncHandler(async (req, res) => {
  const productId = req.params.productId || req.body.productId;
  const { warehouseId, locationName, newQuantity, reason } = req.body;

  if (!productId || newQuantity === undefined || newQuantity === null) {
    res.status(400);
    throw new Error('productId and newQuantity are required.');
  }

  const parsedQty = Number(newQuantity);
  if (isNaN(parsedQty) || parsedQty < 0) {
    res.status(400);
    throw new Error('newQuantity must be a non-negative number.');
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }

  // Determine warehouse
  let targetWarehouse = null;
  if (warehouseId) {
    targetWarehouse = await Warehouse.findById(warehouseId);
  } else if (product.stockByLocation.length > 0) {
    targetWarehouse = await Warehouse.findById(product.stockByLocation[0].warehouse);
  } else {
    targetWarehouse = await Warehouse.findOne();
  }

  if (!targetWarehouse) {
    res.status(400);
    throw new Error('No valid warehouse found to assign stock to.');
  }

  const targetLocationName = locationName ||
    (targetWarehouse.locations && targetWarehouse.locations.length > 0
      ? targetWarehouse.locations[0].name
      : 'Main Storage');

  // Find existing location entry or create one
  let locEntry = product.stockByLocation.find(
    (loc) => loc.warehouse.toString() === targetWarehouse._id.toString() && loc.locationName === targetLocationName
  );

  const previousQty = locEntry ? locEntry.quantity : 0;
  const delta = parsedQty - previousQty;

  if (locEntry) {
    locEntry.quantity = parsedQty;
  } else {
    product.stockByLocation.push({
      warehouse: targetWarehouse._id,
      warehouseName: targetWarehouse.name,
      locationName: targetLocationName,
      quantity: parsedQty,
    });
  }

  // Recalculate total aggregate stock
  product.totalStock = product.stockByLocation.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  await product.save();

  // Create immutable audit trail entry in StockLedger (Move History)
  const count = await StockLedger.countDocuments();
  const refNumber = `ADJ-STK-${String(count + 1).padStart(4, '0')}`;
  const userName = req.user ? req.user.name : 'Inventory Manager';
  const userId = req.user ? req.user._id : null;

  const ledgerRecord = await StockLedger.create({
    transactionType: 'Adjustment',
    referenceNumber: refNumber,
    product: product._id,
    productName: product.name,
    sku: product.sku,
    category: product.category,
    uom: product.uom,
    sourceWarehouse: delta < 0 ? targetWarehouse.name : 'Physical Recount',
    sourceLocation: delta < 0 ? targetLocationName : 'Count Audit',
    destinationWarehouse: delta >= 0 ? targetWarehouse.name : 'Stock Discrepancy',
    destinationLocation: delta >= 0 ? targetLocationName : 'Discrepancy Write-off',
    quantityDelta: delta,
    balanceAfterTransaction: product.totalStock,
    performedBy: userName,
    userId: userId,
    notes: reason || `Updated on-hand stock in ${targetWarehouse.name} (${targetLocationName}): ${previousQty} -> ${parsedQty}`,
  });

  // Calculate current reserved quantity
  const pendingOrders = await DeliveryOrder.find({
    status: { $in: ['Draft', 'Waiting', 'Ready'] },
    'items.product': product._id,
  }).select('items');

  let reserved = 0;
  pendingOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (item.product.toString() === product._id.toString()) {
        reserved += Math.max(0, item.quantityOrdered - (item.quantityPacked || 0));
      }
    });
  });

  res.status(200).json({
    success: true,
    message: `Stock updated successfully for ${product.name}`,
    data: {
      _id: product._id,
      product: product.name,
      sku: product.sku,
      category: product.category,
      uom: product.uom,
      perUnitCost: product.costPrice || 0,
      onHand: product.totalStock,
      reserved: reserved,
      freeToUse: Math.max(0, product.totalStock - reserved),
      warehouse: {
        id: targetWarehouse._id,
        name: targetWarehouse.name,
        locationName: targetLocationName,
        previousQuantity: previousQty,
        newQuantity: parsedQty,
        quantityDelta: delta,
      },
      stockByLocation: product.stockByLocation,
      ledgerAudit: {
        referenceNumber: ledgerRecord.referenceNumber,
        timestamp: ledgerRecord.timestamp,
        quantityDelta: ledgerRecord.quantityDelta,
        balanceAfterTransaction: ledgerRecord.balanceAfterTransaction,
        performedBy: ledgerRecord.performedBy,
        notes: ledgerRecord.notes,
      },
    },
  });
});

module.exports = {
  getWarehouses,
  createWarehouse,
  getInventorySummary,
  getStockView,
  updateStock,
};
