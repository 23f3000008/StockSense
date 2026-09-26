import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Plus, CheckCircle2, RefreshCw } from 'lucide-react';
import { api, apiError, unwrap } from '../services/api';
import Modal from '../components/Modal';

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [form, setForm] = useState({
    sourceWarehouse: '',
    sourceLocation: 'Stock1',
    destWarehouse: '',
    destLocation: 'Stock2',
    product: '',
    quantity: 10,
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, pRes, wRes] = await Promise.all([
        api.get('/transfers'),
        api.get('/products'),
        api.get('/inventory/warehouses'),
      ]);
      setTransfers(unwrap(tRes) || []);
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
    if (!window.confirm('Validate internal transfer? Stock will be relocated.')) return;
    try {
      await api.post(`/transfers/${id}/validate`);
      loadData();
    } catch (err) {
      alert(apiError(err));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const srcWh = warehouses.find((w) => w._id === form.sourceWarehouse);
      const dstWh = warehouses.find((w) => w._id === form.destWarehouse);
      const prod = products.find((p) => p._id === form.product);

      const payload = {
        sourceWarehouse: form.sourceWarehouse,
        sourceWarehouseName: srcWh?.name,
        sourceLocation: form.sourceLocation,
        destWarehouse: form.destWarehouse,
        destWarehouseName: dstWh?.name,
        destLocation: form.destLocation,
        items: [
          {
            product: form.product,
            productName: prod?.name,
            sku: prod?.sku,
            uom: prod?.uom,
            quantity: Number(form.quantity),
          },
        ],
        notes: form.notes,
      };

      await api.post('/transfers', payload);
      setCreateModal(false);
      loadData();
    } catch (err) {
      alert(apiError(err));
    }
  };

  return (
    <div className="operations-page" id="transfers-page-container">
      <div className="wf-page-header">
        <div className="wf-header-left">
          <button className="wf-btn-new" onClick={() => setCreateModal(true)}>
            <Plus size={16} />
            <span>NEW</span>
          </button>
          <h1 className="wf-view-title">Internal Transfers</h1>
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
                <th>Source</th>
                <th>Destination</th>
                <th>Lines</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t._id}>
                  <td>
                    <b className="font-mono text-cyan">{t.transferNumber}</b>
                  </td>
                  <td>
                    {t.sourceWarehouseName} <code className="text-xs">{t.sourceLocation}</code>
                  </td>
                  <td>
                    {t.destWarehouseName} <code className="text-xs">{t.destLocation}</code>
                  </td>
                  <td>{t.items?.length || 1} items</td>
                  <td>
                    <span className={`status-pill status-${String(t.status).toLowerCase()}`}>{t.status}</span>
                  </td>
                  <td>
                    <span className="text-xs text-muted">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </td>
                  <td>
                    {t.status !== 'Done' && (
                      <button className="btn btn-sm btn-success" onClick={() => handleValidate(t._id)}>
                        <CheckCircle2 size={14} />
                        <span>Validate</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-muted">
                    No transfers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createModal && (
        <Modal
          title="Create Internal Transfer"
          subtitle="Move inventory between storage racks or warehouses"
          close={() => setCreateModal(false)}
        >
          <form onSubmit={handleCreateSubmit} className="modal-form">
            <div className="form-group-row">
              <label>
                Source Warehouse
                <select
                  required
                  value={form.sourceWarehouse}
                  onChange={(e) => setForm({ ...form, sourceWarehouse: e.target.value })}
                >
                  <option value="">Select Origin</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Source Location / Bin
                <input
                  required
                  placeholder="e.g. Stock1"
                  value={form.sourceLocation}
                  onChange={(e) => setForm({ ...form, sourceLocation: e.target.value })}
                />
              </label>
            </div>

            <div className="form-group-row">
              <label>
                Destination Warehouse
                <select
                  required
                  value={form.destWarehouse}
                  onChange={(e) => setForm({ ...form, destWarehouse: e.target.value })}
                >
                  <option value="">Select Destination</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Destination Location / Bin
                <input
                  required
                  placeholder="e.g. Stock2"
                  value={form.destLocation}
                  onChange={(e) => setForm({ ...form, destLocation: e.target.value })}
                />
              </label>
            </div>

            <div className="form-group-row">
              <label>
                Product
                <select
                  required
                  value={form.product}
                  onChange={(e) => setForm({ ...form, product: e.target.value })}
                >
                  <option value="">Select Item</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Quantity
                <input
                  type="number"
                  min="1"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setCreateModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Transfer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
