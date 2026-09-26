const User = require('./User');
const Otp = require('./Otp');
const Warehouse = require('./Warehouse');
const Product = require('./Product');
const Receipt = require('./Receipt');
const DeliveryOrder = require('./DeliveryOrder');
const InternalTransfer = require('./InternalTransfer');
const StockAdjustment = require('./StockAdjustment');
const StockLedger = require('./StockLedger');

module.exports = {
  User,
  Otp,
  Warehouse,
  Product,
  Receipt,
  DeliveryOrder,
  InternalTransfer,
  StockAdjustment,
  StockLedger,
};
