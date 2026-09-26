# 📦 StockSense

A modular, enterprise-grade **Inventory Management System (IMS)** designed to digitize and streamline stock-related operations across warehouses, logistics, and audit workflows.

---

## 🏗️ Architecture & Project Structure

```
StockSense/
├── backend/                      # Node.js + Express REST API
│   ├── config/                   # Database connection & env initialization
│   ├── controllers/              # Business logic & controller handlers
│   │   ├── authController.js     # Signup, login, logout, OTP password reset
│   │   ├── productController.js  # Product catalogue & reorder thresholds
│   │   ├── inventoryController.js# Warehouses, locations & stock summary
│   │   ├── receiptController.js  # Inbound purchase receipt validation
│   │   ├── deliveryController.js # Outbound customer delivery validation
│   │   ├── transferController.js # Inter-warehouse & internal stock movement
│   │   ├── adjustmentController.js# Physical count discrepancy adjustments
│   │   ├── dashboardController.js# Real-time stock KPIs & operational counts
│   │   └── ledgerController.js   # Immutable Move History audit records
│   ├── middleware/               # JWT auth guard (`protect`) & global error handler
│   ├── models/                   # User authentication model
│   ├── routes/                   # Modular route registration
│   ├── utils/                    # Tokens, OTP generation, async wrappers
│   ├── .env.example              # Backend environment template
│   └── package.json              # Express server dependencies & scripts
│
├── database/                     # MongoDB Layer (Mongoose, Models & Seeds)
│   ├── models/                   # All 9 core Mongoose schemas
│   │   ├── User.js               # Roles: inventory_manager, warehouse_staff
│   │   ├── Product.js            # SKU, categories, UOM, multi-location stock
│   │   ├── Warehouse.js          # Warehouses with sub-locations (racks/bays)
│   │   ├── Receipt.js            # Incoming vendor deliveries
│   │   ├── DeliveryOrder.js      # Outgoing shipments
│   │   ├── InternalTransfer.js   # Inter-location stock movements
│   │   ├── StockAdjustment.js    # Discrepancy logs & corrections
│   │   ├── StockLedger.js        # Immutable double-entry audit trail
│   │   └── Otp.js                # Auto-expiring password reset tokens
│   ├── seeds/                    # Database seeding engine with realistic mock data
│   │   └── seed.js
│   ├── services/                 # Atomic Stock Ledger transaction engine
│   │   └── stockService.js
│   ├── test-connection.js        # Health check script for database
│   ├── .env                      # Database configuration
│   └── package.json
│
├── .gitignore                    # Git tracking rules (excludes node_modules & .env)
├── package.json                  # Root orchestration script runner
└── README.md
```

---

## 🔄 Core Inventory Workflow & Ledger Invariants

Every operational change to stock atomically writes to the **Stock Ledger** for full traceability:

```
Vendor Inbound                Internal Movement                 Customer Outbound
 [Receipt: +100]  ──►  [Transfer: Dock ──► Prod]  ──►  [Delivery: -20]
        │                                                     ▲
        ▼                                                     │
   Stock: +100                                                │
   Ledger: +100          Total Stock Unchanged                │
                         Location Balance Shifted             │
                                                              │
                               [Adjustment: -3] ──────────────┘
                               (Forklift damage)
                               Ledger: -3
```

1. **Receipts (Inbound)**: Auto-increments warehouse destination stock and logs `+X` to `StockLedger`.
2. **Delivery Orders (Outbound)**: Verifies availability, decrements stock, and logs `-X` to `StockLedger`.
3. **Internal Transfers**: Decrements source location and increments destination location without changing total company stock.
4. **Stock Adjustments**: Compares physical stock vs recorded count, updates balance, and logs delta with audit reason.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ or v20+)
- [MongoDB](https://www.mongodb.com/) running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas URI

---

### 1. Database Setup & Seeding

```bash
# Navigate to the database directory
cd database

# Install dependencies
npm install

# Test connection
npm run test:connection

# Seed realistic sample data
npm run seed
```

*(Or from the project root using `npm run database:seed`)*

#### Default Seed Accounts:
- **Inventory Manager**: `manager@stocksense.com` / `Password123`
- **Warehouse Staff**: `staff@stocksense.com` / `Password123`

---

### 2. Backend Setup & Run

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Configure environment (copy template if needed)
cp .env.example .env

# Run server in development mode (with hot reloading)
npm run dev

# Or production start
npm start
```

The REST API will be live at: **`http://localhost:5000`**  
Health Check endpoint: **`GET http://localhost:5000/api/health`**

---

### 3. Convenient Root Commands

From the root `StockSense/` directory, you can run:

| Command | Action |
| :--- | :--- |
| `npm run backend:dev` | Start the Express backend in development mode |
| `npm run backend:start` | Start the Express backend server |
| `npm run database:test` | Test MongoDB connectivity and collection stats |
| `npm run database:seed` | Seed database with sample inventory and transactions |
| `npm run database:reset` | Reset and re-seed the entire database |

---

## 📡 REST API Reference

All protected endpoints require authentication via HTTP-only cookie or `Authorization: Bearer <token>`.

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Create a new user account |
| `POST` | `/api/auth/login` | Sign in & receive session token |
| `POST` | `/api/auth/logout` | Clear auth session |
| `GET` | `/api/auth/me` | Get current authenticated user session |
| `POST` | `/api/auth/forgot-password` | Request password reset OTP |
| `POST` | `/api/auth/verify-otp` | Verify 6-digit OTP code |
| `POST` | `/api/auth/reset-password` | Reset password using verified reset token |

### Products (`/api/products`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/products` | List products (supports `?search=`, `?category=`, `?lowStock=true`) |
| `GET` | `/api/products/:id` | Get product details by ID |
| `POST` | `/api/products` | Create a new product master item |
| `PUT` | `/api/products/:id` | Update product info or reorder levels |
| `DELETE` | `/api/products/:id` | Remove a product |

### Inventory & Warehouses (`/api/inventory`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/inventory/warehouses` | List all warehouses and sub-locations |
| `POST` | `/api/inventory/warehouses` | Create a warehouse with sub-locations |
| `GET` | `/api/inventory/summary` | Global stock summary and low-stock alerts |

### Operational Transactions
| Module | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Receipts** | `GET` | `/api/receipts` | List incoming receipts (`?status=Draft/Ready/Done`) |
| | `POST` | `/api/receipts` | Create an incoming receipt |
| | `POST` | `/api/receipts/:id/validate` | **Validate receipt**: auto-increments stock & logs ledger |
| **Deliveries** | `GET` | `/api/deliveries` | List customer delivery orders |
| | `POST` | `/api/deliveries` | Create an outgoing delivery |
| | `POST` | `/api/deliveries/:id/validate` | **Validate delivery**: checks & deducts stock, logs ledger |
| **Transfers** | `GET` | `/api/transfers` | List internal transfers |
| | `POST` | `/api/transfers` | Create an inter-warehouse/location transfer |
| | `POST` | `/api/transfers/:id/validate` | **Validate transfer**: shifts stock location, logs ledger |
| **Adjustments**| `GET` | `/api/adjustments` | List physical stock count adjustments |
| | `POST` | `/api/adjustments` | Create an adjustment record |
| | `POST` | `/api/adjustments/:id/validate` | **Apply adjustment**: corrects stock & logs discrepancy delta |

### Dashboard & Audit Ledger
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/kpis` | Real-time KPI metrics, pending operation counts, low-stock items |
| `GET` | `/api/ledger` | Query the immutable Move History audit trail (`?sku=`, `?transactionType=`) |

---

## 🛡️ Security & Best Practices
- **Password Protection**: Passwords hashed with `bcryptjs` (salt rounds: 12).
- **Session Tokens**: JWT stored in `httpOnly` secure cookies.
- **Git Hygiene**: Environment secrets (`.env`) and `node_modules` are strictly excluded via `.gitignore`.
- **Atomic Stock Changes**: Stock operations update inventory and ledger synchronously to prevent drift.