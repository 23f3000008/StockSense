import React, { useEffect, useState } from 'react';
import {
  Package,
  Search,
  RefreshCw,
  Edit3,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { api, apiError, unwrap } from '../services/api';
import Modal from '../components/Modal';

export default function StockView() {
  const [stockList, setStockList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Update Stock Modal
  const [updateModal, setUpdateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [updateForm, setUpdateForm] = useState({
    newQuantity: '',
    reason: 'Data Entry Correction',
    notes: 'Direct stock view adjustment',
  });
  const [updating, setUpdating] = useState(false);

  const loadStock = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/inventory/stock', {
        params: search.trim() ? { search: search.trim() } : {},
      });
      setStockList(unwrap(res) || []);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadStock();
  };

  const openUpdateModal = (item) => {
    setSelectedProduct(item);
    setUpdateForm({
      newQuantity: item.onHand,
      reason: 'Physical Count Reconciliation',
      notes: `Updated count for ${item.productName}`,
    });
    setUpdateModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.post('/inventory/stock/update', {
        productId: selectedProduct.productId,
        newQuantity: Number(updateForm.newQuantity),
        reason: updateForm.reason,
        notes: updateForm.notes,
      });
      setUpdateModal(false);
      loadStock();
    } catch (err) {
      alert(apiError(err));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="stock-view-page" id="stock-view-container">
      {/* Header */}
      <div className="wf-page-header">
        <div>
          <h1 className="wf-view-title">Available Stock</h1>
          <p className="page-subtitle">List and manage current warehouse inventory balances and reserved allocations.</p>
        </div>

        <div className="wf-header-right">
          <form className="wf-search-box" onSubmit={handleSearch}>
            <Search size={16} className="wf-search-icon" />
            <input
              id="stock-search-input"
              type="text"
              placeholder="Search product or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <button className="btn btn-secondary" onClick={loadStock} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && <div className="alert-banner alert-danger">{error}</div>}

      {/* Wireframe Stock Table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="wf-table" id="stock-view-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>per unit cost</th>
                <th>On hand</th>
                <th>free to Use</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-muted">
                    <RefreshCw size={18} className="spin inline-block mr-2" /> Loading stock…
                  </td>
                </tr>
              ) : stockList.length > 0 ? (
                stockList.map((item) => (
                  <tr key={item.productId} id={`stock-row-${item.sku}`}>
                    <td>
                      <div className="product-cell">
                        <b>{item.productName}</b>
                        <code className="text-xs text-muted">{item.sku}</code>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono font-medium">
                        ₹ {item.perUnitCost ? item.perUnitCost.toLocaleString() : '0'}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono font-bold text-slate-100">
                        {item.onHand} {item.uom}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`font-mono font-bold ${
                          item.freeToUse <= 0
                            ? 'text-rose'
                            : item.freeToUse < item.onHand
                            ? 'text-amber'
                            : 'text-emerald'
                        }`}
                      >
                        {item.freeToUse} {item.uom}
                      </span>
                    </td>
                    <td>
                      <button
                        id={`update-stock-btn-${item.sku}`}
                        className="btn btn-sm btn-outline"
                        onClick={() => openUpdateModal(item)}
                        title="Direct stock count adjustment"
                      >
                        <Edit3 size={14} />
                        <span>Update Stock</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted">
                    No products found in inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Stock Modal */}
      {updateModal && selectedProduct && (
        <Modal
          title={`Update Stock: ${selectedProduct.productName}`}
          subtitle={`Current On Hand: ${selectedProduct.onHand} ${selectedProduct.uom} | Free to Use: ${selectedProduct.freeToUse} ${selectedProduct.uom}`}
          close={() => setUpdateModal(false)}
        >
          <form onSubmit={handleUpdateSubmit} className="modal-form">
            <label>
              New On Hand Count ({selectedProduct.uom})
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={updateForm.newQuantity}
                onChange={(e) => setUpdateForm({ ...updateForm, newQuantity: e.target.value })}
              />
            </label>

            <label>
              Adjustment Reason
              <select
                value={updateForm.reason}
                onChange={(e) => setUpdateForm({ ...updateForm, reason: e.target.value })}
              >
                <option value="Physical Count Reconciliation">Physical Count Reconciliation</option>
                <option value="Damaged Goods">Damaged Goods</option>
                <option value="Theft / Loss">Theft / Loss</option>
                <option value="Data Entry Correction">Data Entry Correction</option>
                <option value="Returned Stock">Returned Stock</option>
              </select>
            </label>

            <label>
              Audit Notes
              <textarea
                rows={2}
                placeholder="Brief reason for the stock adjustment…"
                value={updateForm.notes}
                onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
              />
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setUpdateModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updating}
              >
                {updating ? 'Saving…' : 'Apply Stock Update'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
