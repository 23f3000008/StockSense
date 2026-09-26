import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  List as ListIcon,
  Columns as KanbanIcon,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Building,
  ArrowRight,
  Package,
  Trash2,
} from 'lucide-react';
import { api, apiError, unwrap } from '../services/api';
import Modal from '../components/Modal';

export default function Receipts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';

  const [receipts, setReceipts] = useState([]);
  const [kanbanData, setKanbanData] = useState(null);
  const [view, setView] = useState('list'); // Default land on List View as per wireframe
  const [filter, setFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // New receipt form
  const [form, setForm] = useState({
    supplierName: 'Azure Interior',
    contact: 'Azure Interior',
    warehouse: '',
    from: 'vendor',
    to: 'WH/Stock1',
    destinationLocation: 'Stock1',
    scheduledDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    notes: '',
    items: [
      {
        product: '',
        quantityExpected: 50,
        unitPrice: 3000,
        destinationLocation: 'Stock1',
      },
    ],
  });

  // Load master data for dropdowns
  useEffect(() => {
    Promise.all([api.get('/inventory/warehouses'), api.get('/products')]).then(([wRes, pRes]) => {
      const whs = unwrap(wRes) || [];
      const prods = unwrap(pRes) || [];
      setWarehouses(whs);
      setProducts(prods);
      if (whs.length > 0) {
        setForm((f) => ({
          ...f,
          warehouse: whs[0]._id,
          to: `${whs[0].code || 'WH'}/Stock1`,
        }));
      }
      if (prods.length > 0) {
        setForm((f) => ({
          ...f,
          items: [
            {
              product: prods[0]._id,
              quantityExpected: 50,
              unitPrice: prods[0].costPrice || 3000,
              destinationLocation: 'Stock1',
            },
          ],
        }));
      }
    });
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (view === 'kanban') params.view = 'kanban';
      if (filter && filter !== 'all') params.filter = filter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/receipts', { params });
      const unwrapped = unwrap(res);

      if (view === 'kanban') {
        setKanbanData(unwrapped);
        setReceipts(unwrapped.data || []);
      } else {
        setReceipts(unwrapped || []);
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [view, filter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleValidate = async (receiptId) => {
    if (!window.confirm('Validate this receipt? Inventory will be updated and an audit entry added to Move History.')) {
      return;
    }
    try {
      await api.post(`/receipts/${receiptId}/validate`);
      loadData();
    } catch (err) {
      alert(apiError(err));
    }
  };

  const handleStatusChange = async (receiptId, newStatus) => {
    try {
      await api.patch(`/receipts/${receiptId}/status`, { status: newStatus });
      loadData();
    } catch (err) {
      alert(apiError(err));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const selectedWh = warehouses.find((w) => w._id === form.warehouse);
      const whCode = selectedWh?.code || 'WH';

      const payload = {
        ...form,
        warehouseName: whCode,
        from: form.from || 'vendor',
        to: form.to || `${whCode}/${form.destinationLocation || 'Stock1'}`,
        contact: form.contact || form.supplierName,
        items: form.items.map((it) => {
          const p = products.find((prod) => prod._id === it.product);
          return {
            product: it.product,
            productName: p?.name || 'Item',
            sku: p?.sku || 'SKU',
            uom: p?.uom || 'pcs',
            quantityExpected: Number(it.quantityExpected),
            quantityReceived: 0,
            unitPrice: Number(it.unitPrice || 0),
            destinationLocation: it.destinationLocation || 'Stock1',
          };
        }),
      };

      await api.post('/receipts', payload);
      setCreateModal(false);
      loadData();
    } catch (err) {
      alert(apiError(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="operations-page" id="receipts-page-container">
      {/* Wireframe Header Row */}
      <div className="wf-page-header">
        <div className="wf-header-left">
          <button
            id="btn-new-receipt"
            className="wf-btn-new"
            onClick={() => setCreateModal(true)}
          >
            <Plus size={16} />
            <span>NEW</span>
          </button>
          <h1 className="wf-view-title">Receipts</h1>
        </div>

        {/* Right Tools: Search Bar & View Toggles */}
        <div className="wf-header-right">
          <form className="wf-search-box" onSubmit={handleSearchSubmit}>
            <Search size={16} className="wf-search-icon" />
            <input
              id="receipts-search-input"
              type="text"
              placeholder="Search reference & contacts…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* List / Kanban View Switcher */}
          <div className="wf-view-toggles">
            <button
              id="view-toggle-list"
              className={`wf-toggle-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              title="List View (Default)"
            >
              <ListIcon size={18} />
            </button>
            <button
              id="view-toggle-kanban"
              className={`wf-toggle-btn ${view === 'kanban' ? 'active' : ''}`}
              onClick={() => setView('kanban')}
              title="Switch to Kanban view based on status"
            >
              <KanbanIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-chips-row">
        {[
          { key: 'all', label: 'All Receipts' },
          { key: 'to-receive', label: 'To Receive' },
          { key: 'late', label: 'Late (Schedule < Today)' },
          { key: 'operations', label: 'Active Operations' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`filter-chip ${filter === tab.key ? 'active' : ''}`}
            onClick={() => {
              setFilter(tab.key);
              setSearchParams(tab.key === 'all' ? {} : { filter: tab.key });
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="alert-banner alert-danger">{error}</div>}

      {/* VIEW: List View (Wireframe Default) */}
      {view === 'list' && (
        <div className="table-card">
          <div className="table-responsive">
            <table className="wf-table" id="receipts-list-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Contact</th>
                  <th>Schedule date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-muted">
                      <RefreshCw size={18} className="spin inline-block mr-2" /> Loading receipts…
                    </td>
                  </tr>
                ) : receipts.length > 0 ? (
                  receipts.map((row) => (
                    <tr key={row._id} id={`receipt-row-${row.reference}`}>
                      <td>
                        <b className="font-mono text-cyan">{row.reference}</b>
                      </td>
                      <td>
                        <span className="text-secondary">{row.from || 'vendor'}</span>
                      </td>
                      <td>
                        <code className="text-indigo">{row.to || 'WH/Stock1'}</code>
                      </td>
                      <td>
                        <b>{row.contact || row.supplierName}</b>
                      </td>
                      <td>
                        <span className="text-secondary">
                          {row.scheduleDate ? new Date(row.scheduleDate).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill status-${String(row.status).toLowerCase()}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        {row.status !== 'Done' && row.status !== 'Canceled' ? (
                          <button
                            id={`validate-btn-${row.reference}`}
                            className="btn btn-sm btn-success"
                            onClick={() => handleValidate(row._id)}
                            title="Validate receipt and increment stock"
                          >
                            <CheckCircle2 size={14} />
                            <span>Validate</span>
                          </button>
                        ) : (
                          <span className="text-muted text-xs">Validated</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted">
                      No receipts found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: Kanban View (Based on Status) */}
      {view === 'kanban' && (
        <div className="kanban-board" id="receipts-kanban-board">
          {['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'].map((status) => {
            const cards = kanbanData?.columns?.[status] || receipts.filter((r) => r.status === status);
            return (
              <div className="kanban-col" key={status} id={`kanban-col-${status.toLowerCase()}`}>
                <div className="kanban-col-header">
                  <div className="kanban-col-title">
                    <span className={`status-indicator status-${status.toLowerCase()}`} />
                    <b>{status}</b>
                  </div>
                  <span className="kanban-badge">{cards.length}</span>
                </div>

                <div className="kanban-cards-stack">
                  {cards.map((card) => (
                    <div className="kanban-card" key={card._id}>
                      <div className="kanban-card-top">
                        <code className="text-cyan font-bold">{card.reference}</code>
                        <span className={`status-pill status-${card.status.toLowerCase()}`}>{card.status}</span>
                      </div>
                      <div className="kanban-card-contact">
                        <b>{card.contact || card.supplierName}</b>
                      </div>
                      <div className="kanban-route">
                        <span>{card.from || 'vendor'}</span>
                        <ArrowRight size={13} className="text-muted" />
                        <code>{card.to || 'WH/Stock1'}</code>
                      </div>
                      <div className="kanban-card-footer">
                        <small className="text-muted">
                          {card.scheduleDate ? new Date(card.scheduleDate).toLocaleDateString() : ''}
                        </small>
                        {card.status !== 'Done' && (
                          <button
                            className="btn btn-xs btn-primary"
                            onClick={() => handleValidate(card._id)}
                          >
                            Validate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && <div className="kanban-empty">No cards</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create New Receipt */}
      {createModal && (
        <Modal
          title="Create New Receipt"
          subtitle="Auto-increments following <Warehouse>/IN/<ID> format"
          close={() => setCreateModal(false)}
        >
          <form onSubmit={handleCreateSubmit} className="modal-form">
            <div className="form-group-row">
              <label>
                Destination Warehouse
                <select
                  required
                  value={form.warehouse}
                  onChange={(e) => {
                    const wh = warehouses.find((w) => w._id === e.target.value);
                    const code = wh?.code || 'WH';
                    setForm({ ...form, warehouse: e.target.value, to: `${code}/${form.destinationLocation}` });
                  }}
                >
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Storage Location (To)
                <input
                  required
                  placeholder="e.g. Stock1"
                  value={form.destinationLocation}
                  onChange={(e) => {
                    const wh = warehouses.find((w) => w._id === form.warehouse);
                    const code = wh?.code || 'WH';
                    setForm({
                      ...form,
                      destinationLocation: e.target.value,
                      to: `${code}/${e.target.value}`,
                    });
                  }}
                />
              </label>
            </div>

            <div className="form-group-row">
              <label>
                Contact / Supplier Name
                <input
                  required
                  placeholder="e.g. Azure Interior"
                  value={form.supplierName}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value, contact: e.target.value })}
                />
              </label>

              <label>
                From
                <input
                  required
                  placeholder="e.g. vendor"
                  value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })}
                />
              </label>
            </div>

            <div className="form-group-row">
              <label>
                Scheduled Date
                <input
                  type="date"
                  required
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                />
              </label>
              <label>
                Status
                <select
                  value={form.status || 'Ready'}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="Ready">Ready</option>
                  <option value="Draft">Draft</option>
                  <option value="Waiting">Waiting</option>
                </select>
              </label>
            </div>

            <div className="form-divider" />
            <h4 className="font-semibold text-sm mb-2">Items to Receive</h4>

            {form.items.map((item, idx) => (
              <div className="item-row-grid" key={idx}>
                <label>
                  Product
                  <select
                    required
                    value={item.product}
                    onChange={(e) => {
                      const updated = [...form.items];
                      updated[idx].product = e.target.value;
                      setForm({ ...form, items: updated });
                    }}
                  >
                    <option value="">Select SKU</option>
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
                    value={item.quantityExpected}
                    onChange={(e) => {
                      const updated = [...form.items];
                      updated[idx].quantityExpected = e.target.value;
                      setForm({ ...form, items: updated });
                    }}
                  />
                </label>

                <label>
                  Unit Cost (Rs)
                  <input
                    type="number"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const updated = [...form.items];
                      updated[idx].unitPrice = e.target.value;
                      setForm({ ...form, items: updated });
                    }}
                  />
                </label>
              </div>
            ))}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCreateModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating}
              >
                {creating ? 'Creating…' : 'Create Receipt'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
