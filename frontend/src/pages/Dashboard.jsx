import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  AlertCircle,
  Hourglass,
  Layers,
  Package,
  Boxes,
  Warehouse,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  ArrowLeftRight,
} from 'lucide-react';
import { api, apiError, unwrap } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/dashboard/kpis');
      setData(unwrap(res));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const receiptCard = data?.cards?.receipt || {
    toReceive: 4,
    late: 1,
    operations: 6,
  };

  const deliveryCard = data?.cards?.delivery || {
    toDeliver: 4,
    late: 1,
    waiting: 2,
    operations: 6,
  };

  return (
    <div className="dashboard-page" id="dashboard-page-container">
      {/* Header bar */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time statistics, operational cards & warehouse overview.</p>
        </div>
        <button className="btn btn-secondary" onClick={loadMetrics} disabled={loading} id="dashboard-refresh-btn">
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <div className="alert-banner alert-danger">{error}</div>}

      {/* Main Wireframe Operational Cards Grid */}
      <div className="wireframe-cards-container">
        {/* Card 1: Receipt */}
        <div className="wf-card wf-card-receipt" id="card-receipt">
          <div className="wf-card-header">
            <div className="wf-card-title-group">
              <div className="wf-icon-badge text-emerald">
                <ArrowDownToLine size={20} />
              </div>
              <h2 className="wf-card-title">Receipt</h2>
            </div>
            <span className="wf-card-tag">Inbound</span>
          </div>

          <div className="wf-card-body">
            {/* Primary Action Button */}
            <div className="wf-main-button-wrap">
              <button
                id="btn-to-receive"
                className="wf-main-button"
                onClick={() => navigate('/operations/receipts?filter=to-receive')}
                title="View receipts waiting to be received"
              >
                <span className="wf-count-huge">{receiptCard.toReceive}</span>
                <span className="wf-label-sub">to receive</span>
              </button>
            </div>

            {/* Sub-counters on the right matching Wireframe */}
            <div className="wf-sub-counters">
              <button
                id="btn-receipt-late"
                className="wf-sub-row text-rose-hover"
                onClick={() => navigate('/operations/receipts?filter=late')}
                title="View late inbound receipts"
              >
                <span className="wf-sub-count text-rose">{receiptCard.late}</span>
                <span className="wf-sub-label">Late</span>
              </button>

              <button
                id="btn-receipt-operations"
                className="wf-sub-row text-slate-hover"
                onClick={() => navigate('/operations/receipts?filter=operations')}
                title="View scheduled operations"
              >
                <span className="wf-sub-count">{receiptCard.operations}</span>
                <span className="wf-sub-label">operations</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Delivery */}
        <div className="wf-card wf-card-delivery" id="card-delivery">
          <div className="wf-card-header">
            <div className="wf-card-title-group">
              <div className="wf-icon-badge text-rose">
                <ArrowUpFromLine size={20} />
              </div>
              <h2 className="wf-card-title">Delivery</h2>
            </div>
            <span className="wf-card-tag">Outbound</span>
          </div>

          <div className="wf-card-body">
            {/* Primary Action Button */}
            <div className="wf-main-button-wrap">
              <button
                id="btn-to-deliver"
                className="wf-main-button"
                onClick={() => navigate('/operations/deliveries?filter=to-deliver')}
                title="View orders waiting to be delivered"
              >
                <span className="wf-count-huge">{deliveryCard.toDeliver}</span>
                <span className="wf-label-sub">to Deliver</span>
              </button>
            </div>

            {/* Sub-counters on the right matching Wireframe */}
            <div className="wf-sub-counters">
              <button
                id="btn-delivery-late"
                className="wf-sub-row text-rose-hover"
                onClick={() => navigate('/operations/deliveries?filter=late')}
                title="View late delivery orders"
              >
                <span className="wf-sub-count text-rose">{deliveryCard.late}</span>
                <span className="wf-sub-label">Late</span>
              </button>

              <button
                id="btn-delivery-waiting"
                className="wf-sub-row text-amber-hover"
                onClick={() => navigate('/operations/deliveries?filter=waiting')}
                title="Orders waiting for stock replenishment"
              >
                <span className="wf-sub-count text-amber">{deliveryCard.waiting}</span>
                <span className="wf-sub-label">waiting</span>
              </button>

              <button
                id="btn-delivery-operations"
                className="wf-sub-row text-slate-hover"
                onClick={() => navigate('/operations/deliveries?filter=operations')}
                title="View scheduled delivery operations"
              >
                <span className="wf-sub-count">{deliveryCard.operations}</span>
                <span className="wf-sub-label">operations</span>
              </button>
            </div>
          </div>
        </div>

        {/* Wireframe Rule Explanations Card */}
        <div className="wf-rules-card" id="card-wireframe-rules">
          <div className="wf-rules-header">
            <Clock size={16} className="text-cyan" />
            <h3>Business Rules</h3>
          </div>
          <ul className="wf-rules-list">
            <li>
              <code>Late:</code> schedule date &lt; today's date
            </li>
            <li>
              <code>Operations:</code> schedule date &gt; today's date
            </li>
            <li>
              <code>Waiting:</code> Waiting for the stocks
            </li>
          </ul>
        </div>
      </div>

      {/* Global Master Data & Inventory Snapshot */}
      <div className="stats-row">
        <div className="stat-card" onClick={() => navigate('/stock')}>
          <div className="stat-icon-wrap">
            <Package size={20} className="text-indigo" />
          </div>
          <div className="stat-meta">
            <span className="stat-label">Total SKUs</span>
            <span className="stat-value">{data?.totalProductsCount ?? 7}</span>
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/stock')}>
          <div className="stat-icon-wrap">
            <Boxes size={20} className="text-emerald" />
          </div>
          <div className="stat-meta">
            <span className="stat-label">Units in Stock</span>
            <span className="stat-value">{data?.totalItemsInStock ?? 721}</span>
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/stock')}>
          <div className="stat-icon-wrap">
            <AlertCircle size={20} className="text-amber" />
          </div>
          <div className="stat-meta">
            <span className="stat-label">Low Stock Alerts</span>
            <span className="stat-value text-amber">{data?.lowStockCount ?? 2}</span>
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/settings/warehouses')}>
          <div className="stat-icon-wrap">
            <Warehouse size={20} className="text-purple" />
          </div>
          <div className="stat-meta">
            <span className="stat-label">Warehouses</span>
            <span className="stat-value">{data?.warehousesCount ?? 3}</span>
          </div>
        </div>
      </div>

      {/* Low Stock Items & Quick Shortcuts */}
      <div className="dashboard-grid-bottom">
        <div className="card-panel">
          <div className="card-panel-header">
            <div>
              <h3 className="panel-title">Low Stock Monitor</h3>
              <p className="panel-desc">Items at or below minimum reorder threshold.</p>
            </div>
            <button className="btn-link" onClick={() => navigate('/stock')}>
              View all stock →
            </button>
          </div>

          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>On Hand</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.lowStockProducts && data.lowStockProducts.length > 0 ? (
                  data.lowStockProducts.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <b>{p.name}</b>
                      </td>
                      <td>
                        <code>{p.sku}</code>
                      </td>
                      <td>
                        <span className={p.totalStock <= 0 ? 'text-rose font-bold' : 'text-amber font-bold'}>
                          {p.totalStock} {p.uom}
                        </span>
                      </td>
                      <td>{p.minReorderLevel}</td>
                      <td>
                        <span className={`status-pill ${p.totalStock <= 0 ? 'status-danger' : 'status-warning'}`}>
                          {p.totalStock <= 0 ? 'Out of stock' : 'Low stock'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      All inventory levels are above reorder thresholds.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Operations Strip */}
        <div className="card-panel">
          <div className="card-panel-header">
            <div>
              <h3 className="panel-title">Operations Menu</h3>
              <p className="panel-desc">Launch warehouse transactions directly.</p>
            </div>
          </div>

          <div className="quick-actions-grid">
            <button
              className="quick-action-card"
              onClick={() => navigate('/operations/receipts')}
              id="qa-receive-stock"
            >
              <div className="qa-icon-wrap text-emerald">
                <ArrowDownToLine size={22} />
              </div>
              <div>
                <b>1. Receipts</b>
                <small>Process incoming vendor goods</small>
              </div>
            </button>

            <button
              className="quick-action-card"
              onClick={() => navigate('/operations/deliveries')}
              id="qa-deliveries"
            >
              <div className="qa-icon-wrap text-rose">
                <ArrowUpFromLine size={22} />
              </div>
              <div>
                <b>2. Deliveries</b>
                <small>Pick, pack and dispatch orders</small>
              </div>
            </button>

            <button
              className="quick-action-card"
              onClick={() => navigate('/operations/adjustments')}
              id="qa-adjustments"
            >
              <div className="qa-icon-wrap text-amber">
                <SlidersHorizontal size={22} />
              </div>
              <div>
                <b>3. Adjustments</b>
                <small>Physical count reconciliation</small>
              </div>
            </button>

            <button
              className="quick-action-card"
              onClick={() => navigate('/operations/transfers')}
              id="qa-transfers"
            >
              <div className="qa-icon-wrap text-indigo">
                <ArrowLeftRight size={22} />
              </div>
              <div>
                <b>4. Transfers</b>
                <small>Relocate between warehouses</small>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
