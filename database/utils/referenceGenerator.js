const mongoose = require('mongoose');

/**
 * Generate an auto-incrementing reference number following:
 * <Warehouse>/<Operation>/<ID>
 * e.g., WH/IN/0001, WH/OUT/0002
 *
 * @param {string|mongoose.Types.ObjectId} warehouseRef - Warehouse ID or code
 * @param {'IN'|'OUT'} operation - 'IN' for Receipts, 'OUT' for Deliveries
 * @returns {Promise<string>} Formatted reference number
 */
async function generateOperationReference(warehouseRef, operation = 'IN') {
  const Warehouse = mongoose.model('Warehouse');
  const Model = operation === 'IN' ? mongoose.model('Receipt') : mongoose.model('DeliveryOrder');
  const fieldName = operation === 'IN' ? 'receiptNumber' : 'orderNumber';

  let whCode = 'WH';

  if (warehouseRef) {
    if (typeof warehouseRef === 'string' && warehouseRef.length <= 10 && !warehouseRef.match(/^[0-9a-fA-F]{24}$/)) {
      whCode = warehouseRef.toUpperCase();
    } else {
      try {
        const wh = await Warehouse.findById(warehouseRef).lean();
        if (wh && wh.code) {
          // If code is WH-MAIN or WH, extract prefix WH
          const cleanCode = wh.code.split('-')[0].trim().toUpperCase();
          whCode = cleanCode || wh.code.toUpperCase();
        }
      } catch (err) {
        // Fallback to default
        whCode = 'WH';
      }
    }
  }

  // Regex to match <Warehouse>/<Operation>/<Number>
  const escapedWh = whCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapedWh}/${operation}/(\\d+)`, 'i');

  const existingDocs = await Model.find({ [fieldName]: { $regex: regex } }, { [fieldName]: 1 }).lean();

  let maxId = 0;
  for (const doc of existingDocs) {
    const val = doc[fieldName];
    if (val) {
      const match = val.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
  }

  // Fallback if no matching pattern exists yet
  if (maxId === 0) {
    const count = await Model.countDocuments();
    maxId = count;
  }

  const nextId = maxId + 1;
  const formattedId = String(nextId).padStart(4, '0');
  return `${whCode}/${operation}/${formattedId}`;
}

module.exports = {
  generateOperationReference,
};
