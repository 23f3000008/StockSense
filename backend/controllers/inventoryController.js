const asyncHandler = require('../utils/asyncHandler');
const {
  Warehouse,
  Product,
  DeliveryOrder,
  StockLedger,
  StockAdjustment,
} = require('../../database/models');

// @desc    Get all warehouses with their locations & total product count
// @route   GET /api/inventory/warehouses
const getWarehouses = asyncHandler(async (req, res) => {
  const warehouses = await Warehouse.find().sort({ name: 1 });
  
  // Format warehouses to guarantee name, shortCode, address, and locations
  const formatted = warehouses.map((wh) => ({
    _id: wh._id,
    name: wh.name,
    shortCode: wh.code,
    code: wh.code,
    address: wh.address,
    formattedAddress: wh.formattedAddress || (typeof wh.address === 'string' ? wh.address : ''),
    locationsCount: wh.locations ? wh.locations.length : 0,
    locations: wh.locations || [],
    contactPerson: wh.contactPerson,
    contactPhone: wh.contactPhone,
    isActive: wh.isActive,
    createdAt: wh.createdAt,
    updatedAt: wh.updatedAt,
  }));

  res.status(200).json({ success: true, count: formatted.length, data: formatted });
});

// @desc    Get single warehouse by ID (details & internal locations)
// @route   GET /api/inventory/warehouses/:id
const getWarehouseById = asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findById(req.params.id);
  if (!warehouse) {
    res.status(404);
    throw new Error('Warehouse not found');
  }

  // Also query products currently held at this warehouse
  const products = await Product.find({ 'stockByLocation.warehouse': warehouse._id })
    .select('name sku category totalStock stockByLocation uom costPrice');

  const stockSummary = products.map((prod) => {
    const locs = prod.stockByLocation.filter(
      (l) => l.warehouse.toString() === warehouse._id.toString()
    );
    const onHand = locs.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    return {
      productId: prod._id,
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      uom: prod.uom,
      perUnitCost: prod.costPrice || 0,
      onHand,
      locations: locs,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      _id: warehouse._id,
      name: warehouse.name,
      shortCode: warehouse.code,
      code: warehouse.code,
      address: warehouse.address,
      formattedAddress: warehouse.formattedAddress || (typeof warehouse.address === 'string' ? warehouse.address : ''),
      locations: warehouse.locations || [],
      contactPerson: warehouse.contactPerson,
      contactPhone: warehouse.contactPhone,
      isActive: warehouse.isActive,
      productsCount: stockSummary.length,
      currentInventory: stockSummary,
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
    },
  });
});

// @desc    Create a warehouse (Name, Short Code, Address, Locations)
// @route   POST /api/inventory/warehouses
const createWarehouse = asyncHandler(async (req, res) => {
  const { name, code, shortCode, address, locations, contactPerson, contactPhone } = req.body;

  if (!name || (!code && !shortCode)) {
    res.status(400);
    throw new Error('Warehouse Name and Short Code are required.');
  }

  const finalCode = (code || shortCode).trim().toUpperCase();

  const existingCode = await Warehouse.findOne({ code: finalCode });
  if (existingCode) {
    res.status(400);
    throw new Error(`Warehouse with Short Code '${finalCode}' already exists.`);
  }

  const existingName = await Warehouse.findOne({ name: name.trim() });
  if (existingName) {
    res.status(400);
    throw new Error(`Warehouse with Name '${name}' already exists.`);
  }

  const defaultLocations = locations && locations.length > 0
    ? locations
    : [
        {
          name: 'Main Storage',
          code: `${finalCode}-MAIN`,
          type: 'general',
          description: 'Primary storage location',
        },
      ];

  const warehouse = await Warehouse.create({
    name: name.trim(),
    code: finalCode,
    address: address || '',
    contactPerson: contactPerson || '',
    contactPhone: contactPhone || '',
    locations: defaultLocations,
  });

  res.status(201).json({
    success: true,
    message: 'Warehouse created successfully',
    data: {
      _id: warehouse._id,
      name: warehouse.name,
      shortCode: warehouse.code,
      code: warehouse.code,
      address: warehouse.address,
      formattedAddress: warehouse.formattedAddress,
      locations: warehouse.locations,
    },
  });
});

// @desc    Update warehouse details
// @route   PUT /api/inventory/warehouses/:id
const updateWarehouse = asyncHandler(async (req, res) => {
  const { name, code, shortCode, address, locations, contactPerson, contactPhone, isActive } = req.body;
  const warehouse = await Warehouse.findById(req.params.id);

  if (!warehouse) {
    res.status(404);
    throw new Error('Warehouse not found');
  }

  if (name) warehouse.name = name.trim();
  if (code || shortCode) warehouse.code = (code || shortCode).trim().toUpperCase();
  if (address !== undefined) warehouse.address = address;
  if (contactPerson !== undefined) warehouse.contactPerson = contactPerson;
  if (contactPhone !== undefined) warehouse.contactPhone = contactPhone;
  if (isActive !== undefined) warehouse.isActive = isActive;
  if (locations && Array.isArray(locations)) warehouse.locations = locations;

  await warehouse.save();

  res.status(200).json({
    success: true,
    message: 'Warehouse updated successfully',
    data: {
      _id: warehouse._id,
      name: warehouse.name,
      shortCode: warehouse.code,
      code: warehouse.code,
      address: warehouse.address,
      formattedAddress: warehouse.formattedAddress,
      locations: warehouse.locations,
    },
  });
});

// @desc    Delete warehouse
// @route   DELETE /api/inventory/warehouses/:id
const deleteWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findById(req.params.id);
  if (!warehouse) {
    res.status(404);
    throw new Error('Warehouse not found');
  }

  // Check if any product has non-zero stock in this warehouse
  const activeStock = await Product.findOne({
    'stockByLocation.warehouse': warehouse._id,
    'stockByLocation.quantity': { $gt: 0 },
  });

  if (activeStock) {
    res.status(400);
    throw new Error(
      `Cannot delete warehouse '${warehouse.name}'. There are active products in stock. Please transfer or adjust the inventory to 0 first.`
    );
  }

  await warehouse.deleteOne();
  res.status(200).json({ success: true, message: `Warehouse '${warehouse.name}' removed successfully` });
});

// @desc    Add a sub-location to a warehouse
// @route   POST /api/inventory/warehouses/:id/locations
const addWarehouseLocation = asyncHandler(async (req, res) => {
  const { name, code, type, description, capacityUnits } = req.body;
  if (!name) {
    res.status(400);
    throw new Error('Location name is required');
  }

  const warehouse = await Warehouse.findById(req.params.id);
  if (!warehouse) {
    res.status(404);
    throw new Error('Warehouse not found');
  }

  const locCode = code || `${warehouse.code}-${name.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 8)}`;

  warehouse.locations.push({
    name: name.trim(),
    code: locCode,
    type: type || 'general',
    description: description || '',
    capacityUnits: capacityUnits || 1000,
  });

  await warehouse.save();

  res.status(201).json({
    success: true,
    message: `Location '${name}' added to ${warehouse.name}`,
    data: warehouse.locations[warehouse.locations.length - 1],
    locations: warehouse.locations,
  });
});

// @desc    Delete a sub-location from a warehouse
// @route   DELETE /api/inventory/warehouses/:id/locations/:locationId
const deleteWarehouseLocation = asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findById(req.params.id);
  if (!warehouse) {
    res.status(404);
    throw new Error('Warehouse not found');
  }

  const location = warehouse.locations.id(req.params.locationId);
  if (!location) {
    res.status(404);
    throw new Error('Location not found in this warehouse');
  }

  // Check if any product has stock at this location
  const productWithStock = await Product.findOne({
    'stockByLocation.warehouse': warehouse._id,
    'stockByLocation.locationName': location.name,
    'stockByLocation.quantity': { $gt: 0 },
  });

  if (productWithStock) {
    res.status(400);
    throw new Error(
      `Cannot delete location '${location.name}'. Active inventory is stored here. Move or adjust items first.`
    );
  }

  location.deleteOne();
  await warehouse.save();

  res.status(200).json({
    success: true,
    message: `Location removed from ${warehouse.name}`,
    locations: warehouse.locations,
  });
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

  const query = {};
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }

  const products = await Product.find(query).sort({ name: 1 });

  // Calculate reserved quantities from active delivery orders
  const pendingOrders = await DeliveryOrder.find({
    status: { $in: ['Draft', 'Waiting', 'Ready'] },
  }).select('items warehouse');

  const reservedMap = {};
  pendingOrders.forEach((order) => {
    if (!warehouseId || order.warehouse.toString() === warehouseId.toString()) {
      order.items.forEach((item) => {
        const prodId = item.product.toString();
        const unfulfilled = item.quantityOrdered - (item.quantityPacked || 0);
        reservedMap[prodId] = (reservedMap[prodId] || 0) + Math.max(0, unfulfilled);
      });
    }
  });

  let warehouseContext = null;
  if (warehouseId) {
    warehouseContext = await Warehouse.findById(warehouseId).select('name code locations address');
  }

  const stockRows = products.map((prod) => {
    let onHand = prod.totalStock;

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

  product.totalStock = product.stockByLocation.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  await product.save();

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
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  addWarehouseLocation,
  deleteWarehouseLocation,
  getInventorySummary,
  getStockView,
  updateStock,
};
