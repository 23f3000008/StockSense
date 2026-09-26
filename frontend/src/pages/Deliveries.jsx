import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  List as ListIcon,
  Columns as KanbanIcon,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { api, apiError, unwrap } from '../services/api';
import Modal from '../components/Modal';

export default function Deliveries() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';

  const [deliveries, setDeliveries] = useState([]);
  const [kanbanData, setKanbanData] = useState(null);
  const [view, setView] = useState('list'); // Default land on List View
  const [filter, setFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // New delivery form
  const [form, setForm] = useState({
    customerName: 'Azure Interior',
    contact: 'Azure Interior',
    warehouse: '',
    from: 'WH/Stock1',
    to: 'Azure Interior',
    shippingAddress: 'Azure Interior Showroom, Design District',
    sourceLocation: 'Stock1',
    scheduledDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    notes: '',
    items: [
      {
        product: '',
        quantityOrdered: 5,
        sourceLocation: 'Stock1',
      },
    ],
  });

  // Load master data
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
          from: `${whs[0].code || 'WH'}/Stock1`,
        }));
      }
      if (prods.length > 0) {
        setForm((f) => ({
          ...f,
          items: [
            {
              product: prods[0]._id,
              quantityOrdered: 5,
              sourceLocation: 'Stock1',
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

      const res = await api.get('/deliveries', { params });
      const unwrapped = unwrap(res);

      if (view === 'kanban') {
        setKanbanData(unwrapped);
        setDeliveries(unwrapped.data || []);
      } else {
        setDeliveries(unwrapped || []);
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

  const handleValidate = async (deliveryId) => {
    if (!window.confirm('Validate this delivery? Reserved items will be deducted from inventory and logged in Move History.')) {
      return;
    }
    try {
      await api.post(`/deliveries/${deliveryId}/validate`);
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
        from: form.from || `${whCode}/${form.sourceLocation || 'Stock1'}`,
        to: form.to || form.customerName,
        contact: form.contact || form.customerName,
        items: form.items.map((it) => {
          const p = products.find((prod) => prod._id === it.product);
          return {
            product: it.product,
            productName: p?.name || 'Item',
            sku: p?.sku || 'SKU',
            uom: p?.uom || 'pcs',
            quantityOrdered: Number(it.quantityOrdered),
            quantityPicked: 0,
            quantityPacked: 0,
            sourceLocation: it.sourceLocation || 'Stock1',
          };
        }),
      };

      await api.post('/deliveries', payload);
      setCreateModal(false);
      loadData();
    } catch (err) {
      alert(apiError(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="operations-page" id="deliveries-page-container">
      {/* Wireframe Header Row */}
      <div className="wf-page-header">
        <div className="wf-header-left">
          <button
            id="btn-new-delivery"
            className="wf-btn-new"
            onClick={() => setCreateModal(true)}
          >
            <Plus size={16} />
            <span>NEW</span>
          </button>
          <h1 className="wf-view-title">Deliveries</h1>
        </div>

        {/* Right Tools: Search Bar & View Toggles */}
        <div className="wf-header-right">
          <form className="wf-search-box" onSubmit={handleSearchSubmit}>
            <Search size={16} className="wf-search-icon" />
            <input
              id="deliveries-search-input"
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

      {/* Filter Tabs matching Wireframe KPI metrics */}
      <div className="filter-chips-row">
        {[
          { key: 'all', label: 'All Orders' },
          { key: 'to-deliver', label: 'To Deliver' },
          { key: 'late', label: 'Late' },
          { key: 'waiting', label: 'Waiting for stocks' },
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
            <table className="wf-table" id="deliveries-list-table">
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
                      <RefreshCw size={18} className="spin inline-block mr-2" /> Loading deliveries…
                    </td>
                  </tr>
                ) : deliveries.length > 0 ? (
                  deliveries.map((row) => (
                    <tr key={row._id} id={`delivery-row-${row.reference}`}>
                      <td>
                        <b className="font-mono text-cyan">{row.reference}</b>
                      </td>
                      <td>
                        <code className="text-indigo">{row.from || 'WH/Stock1'}</code>
                      </td>
                      <td>
                        <b>{row.to || row.customerName}</b>
                      </td>
                      <td>
                        <span className="text-secondary">{row.contact || row.customerName}</span>
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
                            title="Validate delivery and deduct stock"
                          >
                            <CheckCircle2 size={14} />
                            <span>Validate</span>
                          </button>
                        ) : (
                          <span className="text-muted text-xs">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted">
                      No delivery orders found matching criteria.
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
        <div className="kanban-board" id="deliveries-kanban-board">
          {['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'].map((status) => {
            const cards = kanbanData?.columns?.[status] || deliveries.filter((r) => r.status === status);
            return (
              <div className="kanban-col" key={status} id={`kanban-del-col-${status.toLowerCase()}`}>
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
                        <b>{card.to || card.customerName}</b>
                      </div>
                      <div className="kanban-route">
                        <code>{card.from || 'WH/Stock1'}</code>
                        <ArrowRight size={13} className="text-muted" />
                        <span>{card.to || card.customerName}</span>
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
                  {cards.length === 0 && <div className="kanban-empty">No orders</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create New Delivery Order */}
      {createModal && (
        <Modal
          title="Create New Delivery Order"
          subtitle="Auto-increments following <Warehouse>/OUT/<ID> format"
          close={() => setCreateModal(false)}
        >
          <form onSubmit={handleCreateSubmit} className="modal-form">
            <div className="form-group-row">
              <label>
                Source Warehouse
                <select
                  required
                  value={form.warehouse}
                  onChange={(e) => {
                    const wh = warehouses.find((w) => w._id === e.target.value);
                    const code = wh?.code || 'WH';
                    setForm({ ...form, warehouse: e.target.value, from: `${code}/${form.sourceLocation}` });
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
                Source Location (From)
                <input
                  required
                  placeholder="e.g. Stock1"
                  value={form.sourceLocation}
                  onChange={(e) => {
                    const wh = warehouses.find((w) => w._id === form.warehouse);
                    const code = wh?.code || 'WH';
                    setForm({
                      ...form,
                      sourceLocation: e.target.value,
                      from: `${code}/${e.target.value}`,
                    });
                  }}
                />
              </label>
            </div>

            <div className="form-group-row">
              <label>
                Customer Name / Destination
                <input
                  required
                  placeholder="e.g. Azure Interior"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value, to: e.target.value, contact: e.target.value })}
                />
              </label>

              <label>
                Shipping Address
                <input
                  placeholder="e.g. Azure Showroom, Design District"
                  value={form.shippingAddress}
                  onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
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
                  <option value="Waiting">Waiting</option>
                  <option value="Draft">Draft</option>
                </select>
              </label>
            </div>

            <div className="form-divider" />
            <h4 className="font-semibold text-sm mb-2">Items to Dispatch</h4>

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
                    value={item.quantityOrdered}
                    onChange={(e) => {
                      const updated = [...form.items];
                      updated[idx].quantityOrdered = e.target.value;
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
                {creating ? 'Creating…' : 'Create Delivery Order'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
