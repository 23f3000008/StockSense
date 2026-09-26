# 📦 StockSense - MongoDB Database Layer

This directory contains the complete MongoDB data layer for the **StockSense** Modular Inventory Management System (IMS).

---

## 🏗️ Architecture & Collections

| Model | Collection | Purpose | Key Indexes |
| :--- | :--- | :--- | :--- |
| **`User`** | `users` | Role-based accounts (`inventory_manager`, `warehouse_staff`), bcrypt password hashing | `email` (unique) |
| **`Otp`** | `otps` | OTP-based password reset authentication | `expiresAt` (TTL auto-delete), `email` |
| **`Warehouse`** | `warehouses` | Multi-warehouse support & internal sub-locations (racks, shelves, docks, bays) | `code` (unique), `name` (unique) |
| **`Product`** | `products` | Master items, categories, UOM, reorder thresholds, and multi-location quantities | `sku` (unique), `text: {name, sku, category}`, `totalStock` |
| **`Receipt`** | `receipts` | Vendor incoming purchase shipments | `receiptNumber` (unique), `status` |
| **`DeliveryOrder`**| `deliveryorders` | Outgoing shipments to customers with pick/pack progression | `orderNumber` (unique), `status` |
| **`InternalTransfer`**| `internaltransfers` | Inter-warehouse and inter-rack movements | `transferNumber` (unique), `status` |
| **`StockAdjustment`**| `stockadjustments`| Physical inventory count vs recorded count discrepancy logs | `adjustmentNumber` (unique), `status` |
| **`StockLedger`**| `stockledgers` | Complete, immutable audit trail of every stock change and movement | `product + timestamp`, `sku`, `transactionType` |

---

## 🔄 Core Inventory Workflow & Ledger Invariants

```
Vendor Inbound                Internal Movement                 Customer Outbound
 [Receipt: +100]  ──►  [Transfer: Dock ──► Prod]  ──►  [Delivery: -20]
        │                                                     ▲
        ▼                                                     │
   Stock: +100                                                │
   Ledger: +100          Stock Total Unchanged                │
                         Location Balance Shifted             │
                                                              │
                               [Adjustment: -3] ──────────────┘
                               (Forklift damage)
                               Ledger: -3
```

1. **Receipts (Incoming)**:
   - Validate → Auto-increases stock at target warehouse & location.
   - Logs `quantityDelta: +X` in `StockLedger`.
2. **Delivery Orders (Outgoing)**:
   - Pick & Pack → Validate → Checks stock availability and auto-decreases stock.
   - Logs `quantityDelta: -X` in `StockLedger`.
3. **Internal Transfers**:
   - Validate → Decrements source location, increments target location.
   - Total company stock unchanged (`quantityDelta: 0`), location trail captured.
4. **Stock Adjustments**:
   - Compare physical count vs recorded stock.
   - System auto-updates stock to physical count and logs delta with reason (`Damaged Goods`, `Count Discrepancy`, etc.).

---

## 🚀 Quick Start

### 1. Configure Environment
Ensure your `.env` contains your MongoDB connection URI:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/stocksense
```
*(Or use MongoDB Atlas connection string)*

### 2. Install Dependencies
Run inside the `database/` directory:
```bash
npm install
```

### 3. Test Connection
Verify MongoDB connectivity and inspect collection counts:
```bash
npm run test:connection
```

### 4. Seed Realistic Data
Populate warehouses, products, active operations, and move history:
```bash
npm run seed
```

---

## 📊 Sample Pre-Seeded Accounts

- **Inventory Manager**: `manager@stocksense.com` / `Password123`
- **Warehouse Staff**: `staff@stocksense.com` / `Password123`

---

## 🧩 Usage in Application Code

```javascript
const { connectDB, Product, StockLedger, stockService } = require('./database');

async function main() {
  await connectDB();

  // 1. Find low-stock items for Dashboard KPI:
  const lowStock = await Product.find({
    $expr: { $lte: ['$totalStock', '$minReorderLevel'] }
  });

  // 2. Validate receipt via transaction engine:
  await stockService.processReceiptValidation(receiptId, userId);

  // 3. Query Move History ledger:
  const history = await StockLedger.find({ sku: 'RAW-STL-001' }).sort({ timestamp: -1 });
}
```
