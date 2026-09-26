const asyncHandler = require('../utils/asyncHandler');
const {
  Product,
  Warehouse,
  Receipt,
  DeliveryOrder,
  InternalTransfer,
  StockAdjustment,
  StockLedger,
} = require('../../database/models');

// @desc    Get dashboard KPIs and operational summaries
// @route   GET /api/dashboard/kpis
const getDashboardKPIs = asyncHandler(async (req, res) => {
  const [
    products,
    warehousesCount,
    pendingReceipts,
    pendingDeliveries,
    pendingTransfers,
    pendingAdjustments,
    recentLedger,
  ] = await Promise.all([
    Product.find().select('name sku category totalStock minReorderLevel'),
    Warehouse.countDocuments(),
    Receipt.countDocuments({ status: { $ne: 'Done' } }),
    DeliveryOrder.countDocuments({ status: { $ne: 'Done' } }),
    InternalTransfer.countDocuments({ status: { $ne: 'Done' } }),
    StockAdjustment.countDocuments({ status: { $ne: 'Done' } }),
    StockLedger.find().sort({ timestamp: -1 }).limit(10),
  ]);

  let totalItemsInStock = 0;
  const lowStockProducts = [];

  products.forEach((p) => {
    totalItemsInStock += p.totalStock;
    if (p.totalStock <= p.minReorderLevel) {
      lowStockProducts.push(p);
    }
  });

  res.status(200).json({
    success: true,
    data: {
      totalProductsCount: products.length,
      totalItemsInStock,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      warehousesCount,
      operations: {
        pendingReceipts,
        pendingDeliveries,
        pendingTransfers,
        pendingAdjustments,
      },
      recentActivity: recentLedger,
    },
  });
});

module.exports = {
  getDashboardKPIs,
};
