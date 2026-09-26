const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { connectDB, disconnectDB } = require('../connection');
const {
  User,
  Warehouse,
  Product,
  Receipt,
  DeliveryOrder,
  InternalTransfer,
  StockAdjustment,
  StockLedger,
} = require('../models');

async function seedDatabase() {
  console.log('--- Starting StockSense Database Seeding ---');
  await connectDB();

  try {
    // 1. Clear old data
    console.log('[1/7] Cleaning existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Warehouse.deleteMany({}),
      Product.deleteMany({}),
      Receipt.deleteMany({}),
      DeliveryOrder.deleteMany({}),
      InternalTransfer.deleteMany({}),
      StockAdjustment.deleteMany({}),
      StockLedger.deleteMany({}),
    ]);

    // 2. Create Users
    console.log('[2/7] Creating default users...');
    const manager = await User.create({
      name: 'Sarah Connor',
      email: 'manager@stocksense.com',
      password: 'Password123',
      role: 'inventory_manager',
      phone: '+1 (555) 019-2834',
    });

    const staff = await User.create({
      name: 'Alex Mercer',
      email: 'staff@stocksense.com',
      password: 'Password123',
      role: 'warehouse_staff',
      phone: '+1 (555) 019-5847',
    });

    // 3. Create Warehouses & Sub-Locations
    console.log('[3/7] Creating warehouses and storage locations...');
    const mainWh = await Warehouse.create({
      name: 'Main Central Warehouse',
      code: 'WH-MAIN',
      address: {
        street: '100 Logistics Blvd',
        city: 'Chicago',
        state: 'IL',
        country: 'USA',
        zipCode: '60601',
      },
      contactPerson: 'Sarah Connor',
      contactPhone: '+1 (555) 019-2834',
      locations: [
        { name: 'Receiving Dock', code: 'LOC-DOCK-1', type: 'dock', capacityUnits: 5000 },
        { name: 'Rack A1', code: 'LOC-RACK-A1', type: 'rack', capacityUnits: 1500 },
        { name: 'Rack A2', code: 'LOC-RACK-A2', type: 'rack', capacityUnits: 1500 },
        { name: 'Shelf B1', code: 'LOC-SHELF-B1', type: 'shelf', capacityUnits: 800 },
        { name: 'Bulk Staging Area', code: 'LOC-STAGE-01', type: 'staging', capacityUnits: 4000 },
      ],
    });

    const prodWh = await Warehouse.create({
      name: 'Production Facility North',
      code: 'WH-PROD',
      address: {
        street: '450 Industrial Parkway',
        city: 'Detroit',
        state: 'MI',
        country: 'USA',
        zipCode: '48201',
      },
      contactPerson: 'Marcus Vance',
      contactPhone: '+1 (555) 019-3321',
      locations: [
        { name: 'Production Floor', code: 'LOC-PROD-FLR', type: 'floor', capacityUnits: 3000 },
        { name: 'Assembly Rack 1', code: 'LOC-ASSM-01', type: 'rack', capacityUnits: 1200 },
        { name: 'Finished Goods Bay', code: 'LOC-FG-BAY', type: 'staging', capacityUnits: 2500 },
      ],
    });

    const westWh = await Warehouse.create({
      name: 'West Regional Hub',
      code: 'WH-WEST',
      address: {
        street: '88 Pacific Highway',
        city: 'Reno',
        state: 'NV',
        country: 'USA',
        zipCode: '89502',
      },
      contactPerson: 'Elena Rostova',
      contactPhone: '+1 (555) 019-9941',
      locations: [
        { name: 'Inbound Dock', code: 'LOC-WEST-IN', type: 'dock', capacityUnits: 2000 },
        { name: 'High Bay 01', code: 'LOC-HB-01', type: 'rack', capacityUnits: 3000 },
      ],
    });

    // 4. Create Products
    console.log('[4/7] Creating inventory products with multi-location stock...');
    const productsData = [
      {
        name: 'Steel Rods (High Tensile 12mm)',
        sku: 'RAW-STL-001',
        category: 'Raw Materials',
        uom: 'kg',
        description: 'Structural grade 12mm rebar steel rods for manufacturing and construction.',
        minReorderLevel: 50,
        reorderQuantity: 200,
        costPrice: 4.5,
        sellingPrice: 8.0,
        stockByLocation: [
          {
            warehouse: mainWh._id,
            warehouseName: mainWh.name,
            locationName: 'Receiving Dock',
            quantity: 27, // 100 received - 50 transferred - 20 delivered - 3 damaged = 27
          },
          {
            warehouse: prodWh._id,
            warehouseName: prodWh.name,
            locationName: 'Production Floor',
            quantity: 50, // 50 transferred from Main
          },
        ],
      },
      {
        name: 'Ergonomic Office Chair Mesh Pro',
        sku: 'FURN-CHR-004',
        category: 'Finished Goods',
        uom: 'pcs',
        description: 'High-back mesh ergonomic desk chair with lumbar support.',
        minReorderLevel: 15,
        reorderQuantity: 50,
        costPrice: 85.0,
        sellingPrice: 199.99,
        stockByLocation: [
          {
            warehouse: mainWh._id,
            warehouseName: mainWh.name,
            locationName: 'Rack A1',
            quantity: 12, // Low stock indicator triggered! (< 15)
          },
        ],
      },
      {
        name: 'Industrial Hex Bolts M8 x 40mm',
        sku: 'HRD-BLT-084',
        category: 'Hardware',
        uom: 'box',
        description: 'Grade 8.8 galvanized steel hex head bolts, 100 pcs per box.',
        minReorderLevel: 80,
        reorderQuantity: 300,
        costPrice: 12.0,
        sellingPrice: 24.5,
        stockByLocation: [
          {
            warehouse: mainWh._id,
            warehouseName: mainWh.name,
            locationName: 'Shelf B1',
            quantity: 145,
          },
        ],
      },
      {
        name: 'Heavy Duty Corrugated Carton (Large)',
        sku: 'PKG-BOX-LRG',
        category: 'Packaging',
        uom: 'pcs',
        description: 'Double wall shipping carton 24x18x18 inches.',
        minReorderLevel: 100,
        reorderQuantity: 500,
        costPrice: 1.8,
        sellingPrice: 4.2,
        stockByLocation: [
          {
            warehouse: mainWh._id,
            warehouseName: mainWh.name,
            locationName: 'Bulk Staging Area',
            quantity: 420,
          },
        ],
      },
      {
        name: 'Lithium Brushless Cordless Drill 20V',
        sku: 'EQP-DRL-020',
        category: 'Equipment',
        uom: 'pcs',
        description: 'Variable speed industrial power drill with 2 battery packs.',
        minReorderLevel: 5,
        reorderQuantity: 20,
        costPrice: 65.0,
        sellingPrice: 149.0,
        stockByLocation: [
          {
            warehouse: mainWh._id,
            warehouseName: mainWh.name,
            locationName: 'Rack A2',
            quantity: 0, // Out of stock indicator!
          },
        ],
      },
      {
        name: 'Desk',
        sku: 'FURN-DSK-001',
        category: 'Office Furniture',
        uom: 'pcs',
        description: 'Standard wooden office workstation desk.',
        minReorderLevel: 10,
        reorderQuantity: 30,
        costPrice: 3000,
        sellingPrice: 4500,
        stockByLocation: [
          {
            warehouse: mainWh._id,
            warehouseName: mainWh.name,
            locationName: 'Main Storage',
            quantity: 50,
          },
        ],
      },
      {
        name: 'Table',
        sku: 'FURN-TBL-002',
        category: 'Office Furniture',
        uom: 'pcs',
        description: 'Conference and meeting room table.',
        minReorderLevel: 10,
        reorderQuantity: 20,
        costPrice: 3000,
        sellingPrice: 4800,
        stockByLocation: [
          {
            warehouse: mainWh._id,
            warehouseName: mainWh.name,
            locationName: 'Main Storage',
            quantity: 50,
          },
        ],
      },
    ];

    const createdProducts = [];
    for (const p of productsData) {
      const prod = new Product(p);
      await prod.save();
      createdProducts.push(prod);
    }

    const steelProduct = createdProducts.find((p) => p.sku === 'RAW-STL-001');
    const chairProduct = createdProducts.find((p) => p.sku === 'FURN-CHR-004');
    const boltProduct = createdProducts.find((p) => p.sku === 'HRD-BLT-084');
    const deskProduct = createdProducts.find((p) => p.sku === 'FURN-DSK-001');
    const tableProduct = createdProducts.find((p) => p.sku === 'FURN-TBL-002');

    // 5. Operations: Receipts, Transfers, Deliveries, Adjustments
    console.log('[5/7] Creating inventory operational transactions...');

    // Receipt 1 (Done): Received 100 kg Steel from Vendor
    const rec1 = await Receipt.create({
      receiptNumber: 'REC-2026-001',
      supplierName: 'Apex Steel Industries Ltd',
      supplierContact: 'orders@apexsteel.com',
      purchaseOrderRef: 'PO-99401',
      warehouse: mainWh._id,
      warehouseName: mainWh.name,
      status: 'Done',
      notes: 'Initial batch of raw rebar steel delivered on pallet #3.',
      items: [
        {
          product: steelProduct._id,
          productName: steelProduct.name,
          sku: steelProduct.sku,
          uom: 'kg',
          quantityExpected: 100,
          quantityReceived: 100,
          unitPrice: 4.5,
          destinationLocation: 'Receiving Dock',
        },
      ],
      validatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      validatedBy: manager._id,
      createdBy: manager._id,
    });

    // Receipt 2 (Ready/Pending): Incoming Office Chairs
    const rec2 = await Receipt.create({
      receiptNumber: 'REC-2026-002',
      supplierName: 'Global Seating Solutions',
      supplierContact: 'dispatch@globalseating.com',
      purchaseOrderRef: 'PO-99445',
      warehouse: mainWh._id,
      warehouseName: mainWh.name,
      status: 'Ready',
      notes: 'Awaiting truck arrival at dock 2.',
      items: [
        {
          product: chairProduct._id,
          productName: chairProduct.name,
          sku: chairProduct.sku,
          uom: 'pcs',
          quantityExpected: 40,
          quantityReceived: 40,
          unitPrice: 85.0,
          destinationLocation: 'Rack A1',
        },
      ],
      createdBy: manager._id,
    });

    // Internal Transfer 1 (Done): Moved 50 kg Steel to Production Rack
    const trf1 = await InternalTransfer.create({
      transferNumber: 'TRF-2026-001',
      sourceWarehouse: mainWh._id,
      sourceWarehouseName: mainWh.name,
      sourceLocation: 'Receiving Dock',
      destWarehouse: prodWh._id,
      destWarehouseName: prodWh.name,
      destLocation: 'Production Floor',
      items: [
        {
          product: steelProduct._id,
          productName: steelProduct.name,
          sku: steelProduct.sku,
          uom: 'kg',
          quantity: 50,
        },
      ],
      status: 'Done',
      notes: 'Raw material dispatch for structural frame assembly line.',
      validatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      validatedBy: staff._id,
      createdBy: staff._id,
    });

    // Internal Transfer 2 (Scheduled / Waiting):
    const trf2 = await InternalTransfer.create({
      transferNumber: 'TRF-2026-002',
      sourceWarehouse: mainWh._id,
      sourceWarehouseName: mainWh.name,
      sourceLocation: 'Shelf B1',
      destWarehouse: prodWh._id,
      destWarehouseName: prodWh.name,
      destLocation: 'Assembly Rack 1',
      items: [
        {
          product: boltProduct._id,
          productName: boltProduct.name,
          sku: boltProduct.sku,
          uom: 'box',
          quantity: 25,
        },
      ],
      status: 'Waiting',
      notes: 'Scheduled replenishment for tomorrow morning shift.',
      createdBy: manager._id,
    });

    // Delivery Order 1 (Done): Deliver 20 kg Steel to Customer
    const del1 = await DeliveryOrder.create({
      orderNumber: 'DEL-2026-001',
      customerName: 'Metro Urban Contractors',
      shippingAddress: '742 Evergreen Terrace, Springfield',
      salesOrderRef: 'SO-10822',
      warehouse: mainWh._id,
      warehouseName: mainWh.name,
      status: 'Done',
      pickingStatus: 'Fully Picked',
      packingStatus: 'Packed',
      carrier: 'FreightStar Logistics',
      trackingNumber: 'FS-98492048',
      items: [
        {
          product: steelProduct._id,
          productName: steelProduct.name,
          sku: steelProduct.sku,
          uom: 'kg',
          quantityOrdered: 20,
          quantityPicked: 20,
          quantityPacked: 20,
          sourceLocation: 'Receiving Dock',
        },
      ],
      notes: 'Expedited job site delivery.',
      validatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      validatedBy: staff._id,
      createdBy: manager._id,
    });

    // Delivery Order 2 (Ready/Pending):
    const del2 = await DeliveryOrder.create({
      orderNumber: 'DEL-2026-002',
      customerName: 'FinTech Hub Offices',
      shippingAddress: '500 Tech Plaza, Floor 12, New York, NY',
      salesOrderRef: 'SO-10850',
      warehouse: mainWh._id,
      warehouseName: mainWh.name,
      status: 'Ready',
      pickingStatus: 'Fully Picked',
      packingStatus: 'Not Packed',
      carrier: 'FedEx Freight',
      items: [
        {
          product: chairProduct._id,
          productName: chairProduct.name,
          sku: chairProduct.sku,
          uom: 'pcs',
          quantityOrdered: 6,
          quantityPicked: 6,
          quantityPacked: 0,
          sourceLocation: 'Rack A1',
        },
        {
          product: deskProduct._id,
          productName: deskProduct.name,
          sku: deskProduct.sku,
          uom: 'pcs',
          quantityOrdered: 5,
          quantityPicked: 0,
          quantityPacked: 0,
          sourceLocation: 'Main Storage',
        },
      ],
      notes: 'Pack with protective corner guards.',
      createdBy: manager._id,
    });

    // Stock Adjustment 1 (Done): 3 kg steel damaged
    const adj1 = await StockAdjustment.create({
      adjustmentNumber: 'ADJ-2026-001',
      warehouse: mainWh._id,
      warehouseName: mainWh.name,
      locationName: 'Receiving Dock',
      product: steelProduct._id,
      productName: steelProduct.name,
      sku: steelProduct.sku,
      uom: 'kg',
      recordedQuantity: 30,
      countedQuantity: 27,
      difference: -3,
      reason: 'Damaged Goods',
      status: 'Done',
      notes: '3 kg steel rods bent during forklift unloading and scrapped.',
      validatedAt: new Date(Date.now() - 12 * 3600 * 1000),
      validatedBy: manager._id,
      createdBy: manager._id,
    });

    // 6. Populate Stock Ledger (Move History)
    console.log('[6/7] Creating Stock Ledger audit trail (Move History)...');
    const ledgerEntries = [
      {
        transactionType: 'Receipt',
        referenceNumber: rec1.receiptNumber,
        referenceDocId: rec1._id,
        product: steelProduct._id,
        productName: steelProduct.name,
        sku: steelProduct.sku,
        category: steelProduct.category,
        uom: 'kg',
        sourceWarehouse: 'Apex Steel Industries (Vendor)',
        sourceLocation: 'External Supplier',
        destinationWarehouse: mainWh.name,
        destinationLocation: 'Receiving Dock',
        quantityDelta: 100,
        balanceAfterTransaction: 100,
        performedBy: manager.name,
        userId: manager._id,
        notes: 'Step 1: Receive Goods from Vendor (Stock: +100)',
        timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      },
      {
        transactionType: 'Internal Transfer',
        referenceNumber: trf1.transferNumber,
        referenceDocId: trf1._id,
        product: steelProduct._id,
        productName: steelProduct.name,
        sku: steelProduct.sku,
        category: steelProduct.category,
        uom: 'kg',
        sourceWarehouse: mainWh.name,
        sourceLocation: 'Receiving Dock',
        destinationWarehouse: prodWh.name,
        destinationLocation: 'Production Floor',
        quantityDelta: 0,
        balanceAfterTransaction: 100,
        performedBy: staff.name,
        userId: staff._id,
        notes: 'Step 2: Move to production rack (Main Store -> Production Floor, total stock invariant)',
        timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      },
      {
        transactionType: 'Delivery',
        referenceNumber: del1.orderNumber,
        referenceDocId: del1._id,
        product: steelProduct._id,
        productName: steelProduct.name,
        sku: steelProduct.sku,
        category: steelProduct.category,
        uom: 'kg',
        sourceWarehouse: mainWh.name,
        sourceLocation: 'Receiving Dock',
        destinationWarehouse: 'Metro Urban Contractors (Customer)',
        destinationLocation: 'Jobsite delivery',
        quantityDelta: -20,
        balanceAfterTransaction: 80,
        performedBy: staff.name,
        userId: staff._id,
        notes: 'Step 3: Deliver finished goods (Stock for frames: -20)',
        timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      },
      {
        transactionType: 'Adjustment',
        referenceNumber: adj1.adjustmentNumber,
        referenceDocId: adj1._id,
        product: steelProduct._id,
        productName: steelProduct.name,
        sku: steelProduct.sku,
        category: steelProduct.category,
        uom: 'kg',
        sourceWarehouse: mainWh.name,
        sourceLocation: 'Receiving Dock',
        destinationWarehouse: mainWh.name,
        destinationLocation: 'Receiving Dock',
        quantityDelta: -3,
        balanceAfterTransaction: 77,
        performedBy: manager.name,
        userId: manager._id,
        notes: 'Step 4: Adjust damaged items (3 kg steel damaged -> Stock: -3)',
        timestamp: new Date(Date.now() - 12 * 3600 * 1000),
      },
      {
        transactionType: 'Initial Setup',
        referenceNumber: 'INIT-CHR-01',
        product: chairProduct._id,
        productName: chairProduct.name,
        sku: chairProduct.sku,
        category: chairProduct.category,
        uom: 'pcs',
        sourceWarehouse: 'Opening Balance',
        sourceLocation: 'Initial Stock Count',
        destinationWarehouse: mainWh.name,
        destinationLocation: 'Rack A1',
        quantityDelta: 12,
        balanceAfterTransaction: 12,
        performedBy: 'System Admin',
        notes: 'Initial inventory baseline',
        timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      },
      {
        transactionType: 'Initial Setup',
        referenceNumber: 'INIT-BLT-01',
        product: boltProduct._id,
        productName: boltProduct.name,
        sku: boltProduct.sku,
        category: boltProduct.category,
        uom: 'box',
        sourceWarehouse: 'Opening Balance',
        sourceLocation: 'Initial Stock Count',
        destinationWarehouse: mainWh.name,
        destinationLocation: 'Shelf B1',
        quantityDelta: 145,
        balanceAfterTransaction: 145,
        performedBy: 'System Admin',
        notes: 'Initial inventory baseline',
        timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      },
    ];

    await StockLedger.insertMany(ledgerEntries);

    // 7. Summary
    console.log('[7/7] Database Seeding Completed Successfully! 🚀');
    console.log('--------------------------------------------------');
    console.log('Sample Credentials:');
    console.log('  Manager: manager@stocksense.com  / Password123');
    console.log('  Staff:   staff@stocksense.com    / Password123');
    console.log('Warehouses:');
    console.log(`  - ${mainWh.name} (${mainWh.code})`);
    console.log(`  - ${prodWh.name} (${prodWh.code})`);
    console.log(`  - ${westWh.name} (${westWh.code})`);
    console.log(`Products: ${createdProducts.length} items`);
    console.log(`Operations: 2 Receipts, 2 Deliveries, 2 Transfers, 1 Adjustment, 6 Ledger Records`);
    console.log('--------------------------------------------------');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
