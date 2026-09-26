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

// @desc    Get dashboard metrics, card counters, and operational statistics
// @route   GET /api/dashboard/kpis or GET /api/dashboard/statistics
const getDashboardKPIs = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    // Receipt metrics
    receiptsToReceive,
    receiptsLate,
    receiptsUpcoming,
    receiptsTotal,
    // Delivery metrics
    deliveriesToDeliver,
    deliveriesLate,
    deliveriesWaiting,
    deliveriesUpcoming,
    deliveriesTotal,
    // Transfers & Adjustments
    pendingTransfers,
    pendingAdjustments,
    // Master data
    products,
    warehousesCount,
    recentLedger,
  ] = await Promise.all([
    // Receipts
    Receipt.countDocuments({ status: { $in: ['Ready', 'Waiting'] } }),
    Receipt.countDocuments({
      status: { $nin: ['Done', 'Canceled'] },
      scheduledDate: { $lt: startOfToday },
    }),
    Receipt.countDocuments({
      status: { $nin: ['Done', 'Canceled'] },
      scheduledDate: { $gte: startOfToday },
    }),
    Receipt.countDocuments(),

    // Deliveries
    DeliveryOrder.countDocuments({ status: { $in: ['Ready', 'Waiting'] } }),
    DeliveryOrder.countDocuments({
      status: { $nin: ['Done', 'Canceled'] },
      scheduledDate: { $lt: startOfToday },
    }),
    DeliveryOrder.countDocuments({ status: 'Waiting' }),
    DeliveryOrder.countDocuments({
      status: { $nin: ['Done', 'Canceled'] },
      scheduledDate: { $gte: startOfToday },
    }),
    DeliveryOrder.countDocuments(),

    // Operations
    InternalTransfer.countDocuments({ status: { $nin: ['Done', 'Canceled'] } }),
    StockAdjustment.countDocuments({ status: { $nin: ['Done', 'Canceled'] } }),

    // Stock stats
    Product.find().select('name sku category totalStock minReorderLevel costPrice'),
    Warehouse.countDocuments(),
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
      // 1. Dashboard Cards (matching wireframe)
      cards: {
        receipt: {
          title: 'Receipt',
          toReceive: receiptsToReceive,
          late: receiptsLate,
          operations: receiptsTotal,
          upcomingOperations: receiptsUpcoming,
          totalAllTime: receiptsTotal,
          rules: {
            late: "schedule date < today's date",
            operations: "schedule date > today's date",
          },
        },
        delivery: {
          title: 'Delivery',
          toDeliver: deliveriesToDeliver,
          late: deliveriesLate,
          waiting: deliveriesWaiting,
          operations: deliveriesTotal,
          upcomingOperations: deliveriesUpcoming,
          totalAllTime: deliveriesTotal,
          rules: {
            late: "schedule date < today's date",
            waiting: "Waiting for the stocks",
            operations: "schedule date > today's date",
          },
        },
      },

      // 2. Navigation Architecture
      navigationStructure: {
        Dashboard: 'Dashboard to display the current statistics',
        Operations: {
          submenu: ['Receipt', 'Delivery', 'Adjustment'],
          description: 'Operations submenu: 1. Receipt, 2. Delivery, 3. Adjustment',
        },
        Stock: 'List the available stock (Products, On Hand, Free to Use, Unit Cost)',
        MoveHistory: 'Display the history of In/Out stocks (List & Kanban)',
        Settings: {
          submenu: ['Warehouse', 'Locations'],
          description: '1. Warehouse, 2. Locations',
        },
      },

      // 3. Operational Overview
      operationsSummary: {
        pendingReceipts: receiptsToReceive,
        pendingDeliveries: deliveriesToDeliver,
        pendingTransfers,
        pendingAdjustments,
      },

      // 4. Stock Statistics
      stockStatistics: {
        totalProductsCount: products.length,
        totalItemsInStock,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        warehousesCount,
      },

      recentActivity: recentLedger,
    },
  });
});

module.exports = {
  getDashboardKPIs,
};
