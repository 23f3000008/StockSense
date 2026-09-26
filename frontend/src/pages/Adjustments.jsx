import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, Plus, CheckCircle2, RefreshCw } from 'lucide-react';
import { api, apiError, unwrap } from '../services/api';
import Modal from '../components/Modal';

export default function Adjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [form, setForm] = useState({
    product: '',
    warehouse: '',
    locationName: 'Stock1',
    countedQuantity: '',
    reason: 'Physical Inventory Count',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [adjRes, pRes, wRes] = await Promise.all([
        api.get('/adjustments'),
        api.get('/products'),
        api.get('/inventory/warehouses'),
      ]);
      setAdjustments(unwrap(adjRes) || []);
      setProducts(unwrap(pRes) || []);
      setWarehouses(unwrap(wRes) || []);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleValidate = async (id) => {
    if (!window.confirm('Validate adjustment and update recorded inventory balance?')) return;
    try {
      await api.post(`/adjustments/${id}/validate`);
      loadData();
    } catch (err) {
      alert(apiError(err));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedProd = products.find((p) => p._id === form.product);
      const selectedWh = warehouses.find((w) => w._id === form.warehouse);

      const payload = {
        product: form.product,
        productName: selectedProd?.name,
        sku: selectedProd?.sku,
        uom: selectedProd?.uom,
        warehouse: form.warehouse,
        warehouseName: selectedWh?.name,
        locationName: form.locationName,
        recordedQuantity: Number(selectedProd?.totalStock || 0),
        countedQuantity: Number(form.countedQuantity),
        reason: form.reason,
        notes: form.notes,
      };

      await api.post('/adjustments', payload);
      setCreateModal(false);
      loadData();
    } catch (err) {
      alert(apiError(err));
    }
  };

  return (
    <div className="operations-page" id="adjustments-page-container">
      <div className="wf-page-header">
        <div className="wf-header-left">
          <button className="wf-btn-new" onClick={() => setCreateModal(true)}>
            <Plus size={16} />
            <span>NEW</span>
          </button>
          <h1 className="wf-view-title">Stock Adjustments</h1>
        </div>

        <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <div className="alert-banner alert-danger">{error}</div>}

      <div className="table-card">
        <div className="table-responsive">
          <table className="wf-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Product</th>
                <th>Location</th>
                <th>Recorded Qty</th>
                <th>Counted Qty</th>
                <th>Difference</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => (
                <tr key={a._id}>
                  <td>
                    <b className="font-mono text-cyan">{a.adjustmentNumber}</b>
                  </td>
                  <td>
                    <b>{a.productName}</b>
                    <code className="text-xs text-muted block">{a.sku}</code>
                  </td>
                  <td>
                    {a.warehouseName} / {a.locationName}
                  </td>
                  <td>
                    {a.recordedQuantity} {a.uom}
                  </td>
                  <td>
                    <b>
                      {a.countedQuantity} {a.uom}
                    </b>
                  </td>
                  <td>
                    <span
                      className={`font-mono font-bold ${
                        a.difference > 0 ? 'text-emerald' : a.difference < 0 ? 'text-rose' : 'text-muted'
                      }`}
                    >
                      {a.difference > 0 ? `+${a.difference}` : a.difference} {a.uom}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill status-${String(a.status).toLowerCase()}`}>{a.status}</span>
                  </td>
                  <td>
                    {a.status !== 'Done' && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleValidate(a._id)}
                      >
                        <CheckCircle2 size={14} />
                        <span>Validate</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {adjustments.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-muted">
                    No adjustments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createModal && (
        <Modal
          title="Create Physical Stock Adjustment"
          subtitle="Record real counted inventory to resolve physical discrepancy"
          close={() => setCreateModal(false)}
        >
          <form onSubmit={handleCreateSubmit} className="modal-form">
            <div className="form-group-row">
              <label>
                Product
                <select
                  required
                  value={form.product}
                  onChange={(e) => setForm({ ...form, product: e.target.value })}
                >
                  <option value="">Select SKU</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku}) — Recorded: {p.totalStock} {p.uom}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Warehouse
                <select
                  required
                  value={form.warehouse}
                  onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-group-row">
              <label>
                Location / Bin
                <input
                  required
                  placeholder="e.g. Stock1"
                  value={form.locationName}
                  onChange={(e) => setForm({ ...form, locationName: e.target.value })}
                />
              </label>

              <label>
                Physical Counted Quantity
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.countedQuantity}
                  onChange={(e) => setForm({ ...form, countedQuantity: e.target.value })}
                />
              </label>
            </div>

            <label>
              Reason
              <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                <option value="Physical Inventory Count">Physical Inventory Count</option>
                <option value="Damaged Goods">Damaged Goods</option>
                <option value="Theft / Loss">Theft / Loss</option>
                <option value="Data Entry Correction">Data Entry Correction</option>
                <option value="Expired">Expired</option>
              </select>
            </label>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setCreateModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Adjustment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
