# StockSense
a modular Inventory Management System (IMS) that digitizes and streamlines all stock-related operations within a business.

## Structure
```
StockSense
│
├── Frontend — React + Vite
│   ├── Authentication
│   ├── Dashboard
│   ├── Products
│   ├── Receipts
│   ├── Deliveries
│   ├── Internal Transfers
│   ├── Stock Adjustments
│   ├── Stock Ledger
│   └── Settings / Profile
│
├── Backend — Node.js + Express
│   ├── Auth APIs
│   ├── Product APIs
│   ├── Inventory APIs
│   ├── Receipt APIs
│   ├── Delivery APIs
│   ├── Transfer APIs
│   ├── Adjustment APIs
│   └── Dashboard APIs
│
└── Database — MongoDB
    ├── Users
    ├── Products
    ├── Categories
    ├── Warehouses
    ├── Locations
    ├── Inventory
    ├── Receipts
    ├── Deliveries
    ├── Transfers
    ├── Adjustments
    └── StockLedger
```