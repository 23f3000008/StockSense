const { Product, Receipt, DeliveryOrder, InternalTransfer, StockAdjustment, StockLedger } = require('../models');

/**
 * Validate incoming Receipt and atomically update Product stock & Stock Ledger
 */
async function processReceiptValidation(receiptId, userId = null, userName = 'Inventory Manager') {
  const receipt = await Receipt.findById(receiptId);
  if (!receipt) throw new Error('Receipt not found');
  if (receipt.status === 'Done') throw new Error('Receipt has already been validated and marked as Done');

  for (const item of receipt.items) {
    const product = await Product.findById(item.product);
    if (!product) throw new Error(`Product ${item.productName} not found`);

    const receivedQty = item.quantityReceived > 0 ? item.quantityReceived : item.quantityExpected;
    const destLocName = item.destinationLocation || 'Main Receiving Area';

    // Find or create location in product.stockByLocation
    let locEntry = product.stockByLocation.find(
      (loc) => loc.warehouse.toString() === receipt.warehouse.toString() && loc.locationName === destLocName
    );

    if (locEntry) {
      locEntry.quantity += receivedQty;
    } else {
      product.stockByLocation.push({
        warehouse: receipt.warehouse,
        warehouseName: receipt.warehouseName,
        locationName: destLocName,
        quantity: receivedQty,
      });
    }

    product.totalStock = product.stockByLocation.reduce((acc, curr) => acc + curr.quantity, 0);
    await product.save();

    // Log to Stock Ledger
    await StockLedger.create({
      transactionType: 'Receipt',
      referenceNumber: receipt.receiptNumber,
      referenceDocId: receipt._id,
      product: product._id,
      productName: product.name,
      sku: product.sku,
      category: product.category,
      uom: product.uom,
      sourceWarehouse: receipt.supplierName + ' (Vendor)',
      sourceLocation: 'External Supplier',
      destinationWarehouse: receipt.warehouseName,
      destinationLocation: destLocName,
      quantityDelta: receivedQty,
      balanceAfterTransaction: product.totalStock,
      performedBy: userName,
      userId: userId,
      notes: `Received ${receivedQty} ${product.uom} from supplier ${receipt.supplierName}`,
    });
  }

  receipt.status = 'Done';
  receipt.validatedAt = new Date();
  receipt.validatedBy = userId;
  await receipt.save();

  return receipt;
}

/**
 * Validate Delivery Order and atomically deduct stock & record in Stock Ledger
 */
async function processDeliveryValidation(deliveryId, userId = null, userName = 'Warehouse Staff') {
  const delivery = await DeliveryOrder.findById(deliveryId);
  if (!delivery) throw new Error('Delivery order not found');
  if (delivery.status === 'Done') throw new Error('Delivery order is already marked as Done');

  for (const item of delivery.items) {
    const product = await Product.findById(item.product);
    if (!product) throw new Error(`Product ${item.productName} not found`);

    const qtyToDeduct = item.quantityPacked > 0 ? item.quantityPacked : item.quantityOrdered;
    const sourceLocName = item.sourceLocation || 'Main Storage';

    // Check available stock
    let locEntry = product.stockByLocation.find(
      (loc) => loc.warehouse.toString() === delivery.warehouse.toString() && loc.locationName === sourceLocName
    );

    if (!locEntry || locEntry.quantity < qtyToDeduct) {
      // If exact location doesn't have enough, check total stock in warehouse
      const availableInWarehouse = product.stockByLocation
        .filter((l) => l.warehouse.toString() === delivery.warehouse.toString())
        .reduce((sum, l) => sum + l.quantity, 0);

      if (availableInWarehouse < qtyToDeduct) {
        throw new Error(
          `Insufficient stock for ${product.name} (SKU: ${product.sku}). Requested: ${qtyToDeduct}, Available: ${availableInWarehouse}`
        );
      }

      // Deduct from available locations in this warehouse
      let remainingToDeduct = qtyToDeduct;
      for (const loc of product.stockByLocation) {
        if (loc.warehouse.toString() === delivery.warehouse.toString() && loc.quantity > 0) {
          const deductFromThis = Math.min(loc.quantity, remainingToDeduct);
          loc.quantity -= deductFromThis;
          remainingToDeduct -= deductFromThis;
          if (remainingToDeduct <= 0) break;
        }
      }
    } else {
      locEntry.quantity -= qtyToDeduct;
    }

    product.totalStock = product.stockByLocation.reduce((acc, curr) => acc + curr.quantity, 0);
    await product.save();

    // Log to Stock Ledger
    await StockLedger.create({
      transactionType: 'Delivery',
      referenceNumber: delivery.orderNumber,
      referenceDocId: delivery._id,
      product: product._id,
      productName: product.name,
      sku: product.sku,
      category: product.category,
      uom: product.uom,
      sourceWarehouse: delivery.warehouseName,
      sourceLocation: sourceLocName,
      destinationWarehouse: delivery.customerName + ' (Customer)',
      destinationLocation: delivery.shippingAddress || 'Customer Destination',
      quantityDelta: -qtyToDeduct,
      balanceAfterTransaction: product.totalStock,
      performedBy: userName,
      userId: userId,
      notes: `Delivered ${qtyToDeduct} ${product.uom} to ${delivery.customerName}`,
    });
  }

  delivery.status = 'Done';
  delivery.pickingStatus = 'Fully Picked';
  delivery.packingStatus = 'Packed';
  delivery.validatedAt = new Date();
  delivery.validatedBy = userId;
  await delivery.save();

  return delivery;
}

/**
 * Validate Internal Transfer between warehouses or locations
 */
async function processTransferValidation(transferId, userId = null, userName = 'Warehouse Staff') {
  const transfer = await InternalTransfer.findById(transferId);
  if (!transfer) throw new Error('Transfer record not found');
  if (transfer.status === 'Done') throw new Error('Transfer is already Done');

  for (const item of transfer.items) {
    const product = await Product.findById(item.product);
    if (!product) throw new Error(`Product ${item.productName} not found`);

    // Source deduction
    let sourceLoc = product.stockByLocation.find(
      (loc) => loc.warehouse.toString() === transfer.sourceWarehouse.toString() && loc.locationName === transfer.sourceLocation
    );

    if (!sourceLoc || sourceLoc.quantity < item.quantity) {
      throw new Error(
        `Insufficient stock in ${transfer.sourceWarehouseName} (${transfer.sourceLocation}) for ${product.name}. Needed: ${item.quantity}, Found: ${sourceLoc ? sourceLoc.quantity : 0}`
      );
    }

    sourceLoc.quantity -= item.quantity;

    // Destination addition
    let destLoc = product.stockByLocation.find(
      (loc) => loc.warehouse.toString() === transfer.destWarehouse.toString() && loc.locationName === transfer.destLocation
    );

    if (destLoc) {
      destLoc.quantity += item.quantity;
    } else {
      product.stockByLocation.push({
        warehouse: transfer.destWarehouse,
        warehouseName: transfer.destWarehouseName,
        locationName: transfer.destLocation,
        quantity: item.quantity,
      });
    }

    // Total stock remains invariant across the company, but location distribution shifts
    product.totalStock = product.stockByLocation.reduce((acc, curr) => acc + curr.quantity, 0);
    await product.save();

    // Log to Stock Ledger
    await StockLedger.create({
      transactionType: 'Internal Transfer',
      referenceNumber: transfer.transferNumber,
      referenceDocId: transfer._id,
      product: product._id,
      productName: product.name,
      sku: product.sku,
      category: product.category,
      uom: product.uom,
      sourceWarehouse: transfer.sourceWarehouseName,
      sourceLocation: transfer.sourceLocation,
      destinationWarehouse: transfer.destWarehouseName,
      destinationLocation: transfer.destLocation,
      quantityDelta: 0, // Total company stock remains unchanged
      balanceAfterTransaction: product.totalStock,
      performedBy: userName,
      userId: userId,
      notes: `Transferred ${item.quantity} ${product.uom} from ${transfer.sourceLocation} to ${transfer.destLocation}`,
    });
  }

  transfer.status = 'Done';
  transfer.validatedAt = new Date();
  transfer.validatedBy = userId;
  await transfer.save();

  return transfer;
}

/**
 * Validate Stock Adjustment (Reconciliation / Damage / Physical Count)
 */
async function processAdjustmentValidation(adjustmentId, userId = null, userName = 'Inventory Manager') {
  const adjustment = await StockAdjustment.findById(adjustmentId);
  if (!adjustment) throw new Error('Stock adjustment not found');
  if (adjustment.status === 'Done') throw new Error('Adjustment is already Done');

  const product = await Product.findById(adjustment.product);
  if (!product) throw new Error('Product not found');

  let locEntry = product.stockByLocation.find(
    (loc) => loc.warehouse.toString() === adjustment.warehouse.toString() && loc.locationName === adjustment.locationName
  );

  if (!locEntry) {
    locEntry = {
      warehouse: adjustment.warehouse,
      warehouseName: adjustment.warehouseName,
      locationName: adjustment.locationName,
      quantity: 0,
    };
    product.stockByLocation.push(locEntry);
  }

  const previousRecorded = locEntry.quantity;
  const newCounted = adjustment.countedQuantity;
  const difference = newCounted - previousRecorded;

  locEntry.quantity = newCounted;
  product.totalStock = product.stockByLocation.reduce((acc, curr) => acc + curr.quantity, 0);
  await product.save();

  // Log to Stock Ledger
  await StockLedger.create({
    transactionType: 'Adjustment',
    referenceNumber: adjustment.adjustmentNumber,
    referenceDocId: adjustment._id,
    product: product._id,
    productName: product.name,
    sku: product.sku,
    category: product.category,
    uom: product.uom,
    sourceWarehouse: adjustment.warehouseName,
    sourceLocation: adjustment.locationName,
    destinationWarehouse: adjustment.warehouseName,
    destinationLocation: adjustment.locationName,
    quantityDelta: difference,
    balanceAfterTransaction: product.totalStock,
    performedBy: userName,
    userId: userId,
    notes: `Inventory adjustment (${adjustment.reason}): Physical count ${newCounted}, system had ${previousRecorded}. Diff: ${difference > 0 ? '+' : ''}${difference} ${product.uom}`,
  });

  adjustment.recordedQuantity = previousRecorded;
  adjustment.difference = difference;
  adjustment.status = 'Done';
  adjustment.validatedAt = new Date();
  adjustment.validatedBy = userId;
  await adjustment.save();

  return adjustment;
}

module.exports = {
  processReceiptValidation,
  processDeliveryValidation,
  processTransferValidation,
  processAdjustmentValidation,
};
