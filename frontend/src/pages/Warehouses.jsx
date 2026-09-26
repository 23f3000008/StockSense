import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse as WarehouseIcon,
  Plus,
  MapPin,
  RefreshCw,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { api, apiError, unwrap } from '../services/api';
import Modal from '../components/Modal';

export default function Warehouses() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Warehouse Create/Edit Modal
  const [showWhModal, setShowWhModal] = useState(false);
  const [editingWhId, setEditingWhId] = useState(null);
  const [whForm, setWhForm] = useState({
    name: '',
    shortCode: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
  });
  const [savingWh, setSavingWh] = useState(false);

  // Quick Location Modal
  const [showLocModal, setShowLocModal] = useState(false);
  const [targetWarehouse, setTargetWarehouse] = useState(null);
  const [locForm, setLocForm] = useState({
    name: '',
    code: '',
    type: 'rack',
    capacityUnits: 1000,
  });
  const [savingLoc, setSavingLoc] = useState(false);

  const loadWarehouses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/inventory/warehouses');
      setWarehouses(unwrap(res) || []);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  // Filtered warehouses
  const filteredWarehouses = warehouses.filter((wh) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = wh.name?.toLowerCase().includes(q);
    const codeMatch = (wh.shortCode || wh.code)?.toLowerCase().includes(q);
    const addr = typeof wh.address === 'string' ? wh.address : Object.values(wh.address || {}).join(' ');
    const addrMatch = addr.toLowerCase().includes(q);
    return nameMatch || codeMatch || addrMatch;
  });

  const handleOpenCreateWh = () => {
    setEditingWhId(null);
    setWhForm({
      name: '',
      shortCode: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    });
    setShowWhModal(true);
  };

  const handleOpenEditWh = (wh) => {
    setEditingWhId(wh._id);
    const addr = typeof wh.address === 'object' ? wh.address : {};
    setWhForm({
      name: wh.name || '',
      shortCode: wh.shortCode || wh.code || '',
      street: addr.street || (typeof wh.address === 'string' ? wh.address : ''),
      city: addr.city || '',
      state: addr.state || '',
      zipCode: addr.zipCode || '',
      country: addr.country || 'USA',
    });
    setShowWhModal(true);
  };

  const handleSaveWarehouse = async (e) => {
    e.preventDefault();
    setSavingWh(true);
    try {
      const payload = {
        name: whForm.name.trim(),
        shortCode: whForm.shortCode.trim().toUpperCase(),
        code: whForm.shortCode.trim().toUpperCase(),
        address: {
          street: whForm.street.trim(),
          city: whForm.city.trim(),
          state: whForm.state.trim(),
          zipCode: whForm.zipCode.trim(),
          country: whForm.country.trim(),
        },
      };

      if (editingWhId) {
        await api.put(`/inventory/warehouses/${editingWhId}`, payload);
      } else {
        await api.post('/inventory/warehouses', payload);
      }

      setShowWhModal(false);
      loadWarehouses();
    } catch (err) {
      alert(apiError(err));
    } finally {
      setSavingWh(false);
    }
  };

  const handleDeleteWarehouse = async (whId, whName) => {
    if (!window.confirm(`Are you sure you want to delete warehouse "${whName}"?`)) return;
    try {
      await api.delete(`/inventory/warehouses/${whId}`);
      loadWarehouses();
    } catch (err) {
      alert(apiError(err));
    }
  };

  const handleOpenQuickLocation = (wh) => {
    setTargetWarehouse(wh);
    const codePrefix = wh.code || wh.shortCode || 'WH';
    setLocForm({
      name: '',
      code: `${codePrefix}-`,
      type: 'rack',
      capacityUnits: 1000,
    });
    setShowLocModal(true);
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!targetWarehouse) return;
    setSavingLoc(true);
    try {
      await api.post(`/inventory/warehouses/${targetWarehouse._id}/locations`, {
        name: locForm.name.trim(),
        code: locForm.code.trim().toUpperCase(),
        type: locForm.type,
        capacityUnits: Number(locForm.capacityUnits) || 1000,
      });
      setShowLocModal(false);
      loadWarehouses();
    } catch (err) {
      alert(apiError(err));
    } finally {
      setSavingLoc(false);
    }
  };

  return (
    <div className="warehouses-page" id="warehouses-page-container">
      {/* Wireframe Header */}
      <div className="wf-page-header">
        <div className="wf-header-left">
          <button
            id="btn-new-warehouse"
            className="wf-btn-new"
            onClick={handleOpenCreateWh}
          >
            <Plus size={16} />
            <span>NEW WAREHOUSE</span>
          </button>
          <div>
            <h1 className="wf-view-title">Warehouse</h1>
            <p className="page-subtitle">Configure warehouse details, short codes, and physical facilities.</p>
          </div>
        </div>

        <div className="wf-header-right">
          <button className="btn btn-secondary" onClick={loadWarehouses} disabled={loading} id="btn-refresh-warehouses">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && <div className="alert-banner alert-danger">{error}</div>}

      {/* Toolbar */}
      <div className="toolbar-row">
        <div className="toolbar-left">
          <div className="wf-search-box">
            <Search size={16} className="wf-search-icon" />
            <input
              id="search-warehouse-input"
              type="text"
              placeholder="Search by name, short code, or city…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="toolbar-right">
          <span className="text-secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
            Total Facilities: <b>{warehouses.length}</b>
          </span>
        </div>
      </div>

      {/* Warehouses Table (Wireframe Matching Clean View) */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="wf-table" id="warehouses-table">
            <thead>
              <tr>
                <th>Warehouse Name</th>
                <th>Short Code</th>
                <th>Address</th>
                <th>Locations</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted">
                    <RefreshCw size={20} className="spin inline-block mr-2" /> Loading warehouses…
                  </td>
                </tr>
              ) : filteredWarehouses.length > 0 ? (
                filteredWarehouses.map((wh) => {
                  const addrStr =
                    typeof wh.address === 'string'
                      ? wh.address
                      : [wh.address?.street, wh.address?.city, wh.address?.state, wh.address?.country]
                          .filter(Boolean)
                          .join(', ') || 'Address not configured';

                  const locCount = wh.locations?.length || wh.locationsCount || 0;

                  return (
                    <tr key={wh._id} id={`wh-row-${wh.code || wh.shortCode}`}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            <Building2 size={18} />
                          </div>
                          <div>
                            <b>{wh.name}</b>
                            {wh.contactPerson && (
                              <div style={{ fontSize: '12px', color: '#64748b' }}>
                                Contact: {wh.contactPerson}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <code style={{ fontSize: '14px', fontWeight: 700, color: '#2563eb' }}>
                          {wh.shortCode || wh.code}
                        </code>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                          <MapPin size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          <span>{addrStr}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn-link"
                          onClick={() => navigate('/settings/locations')}
                          title="View locations in this warehouse"
                        >
                          <span className="status-pill status-ready" style={{ cursor: 'pointer' }}>
                            {locCount} {locCount === 1 ? 'Location' : 'Locations'}
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className={`status-pill ${wh.isActive !== false ? 'status-done' : 'status-canceled'}`}>
                          {wh.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn-xs btn-outline"
                            title="Add Location"
                            onClick={() => handleOpenQuickLocation(wh)}
                          >
                            <Plus size={13} />
                            <span>Add Location</span>
                          </button>
                          <button
                            className="btn btn-xs btn-outline"
                            title="Edit Warehouse"
                            onClick={() => handleOpenEditWh(wh)}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            className="btn btn-xs btn-outline btn-danger-hover"
                            title="Delete Warehouse"
                            onClick={() => handleDeleteWarehouse(wh._id, wh.name)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted">
                    No warehouses configured yet. Click "NEW WAREHOUSE" above to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create/Edit Warehouse (Wireframe Structure) */}
      {showWhModal && (
        <Modal
          title={editingWhId ? 'Edit Warehouse' : 'New Warehouse'}
          subtitle="Configure facility name, short code, and address as per wireframe"
          close={() => setShowWhModal(false)}
        >
          <form onSubmit={handleSaveWarehouse} className="modal-form" id="warehouse-form">
            {/* Name Field */}
            <div className="form-group">
              <label htmlFor="wh-name-input">Name</label>
              <input
                id="wh-name-input"
                required
                placeholder="e.g. Main Central Warehouse"
                value={whForm.name}
                onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
              />
            </div>

            {/* Short Code Field */}
            <div className="form-group">
              <label htmlFor="wh-code-input">Short Code</label>
              <input
                id="wh-code-input"
                required
                placeholder="e.g. WH, WH-PROD, NORTH"
                value={whForm.shortCode}
                onChange={(e) => setWhForm({ ...whForm, shortCode: e.target.value.toUpperCase() })}
              />
              <small style={{ color: '#64748b', fontSize: '12px' }}>
                Used as prefix for references (e.g. {whForm.shortCode || 'WH'}/IN/0001).
              </small>
            </div>

            {/* Address Field */}
            <div className="form-group">
              <label htmlFor="wh-street-input">Address</label>
              <input
                id="wh-street-input"
                required
                placeholder="Street address (e.g. 100 Logistics Blvd)"
                value={whForm.street}
                onChange={(e) => setWhForm({ ...whForm, street: e.target.value })}
              />
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="wh-city-input">City</label>
                <input
                  id="wh-city-input"
                  placeholder="Chicago"
                  value={whForm.city}
                  onChange={(e) => setWhForm({ ...whForm, city: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="wh-state-input">State / Region</label>
                <input
                  id="wh-state-input"
                  placeholder="IL"
                  value={whForm.state}
                  onChange={(e) => setWhForm({ ...whForm, state: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowWhModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-warehouse"
                className="btn btn-primary"
                disabled={savingWh}
              >
                {savingWh ? 'Saving…' : editingWhId ? 'Update Warehouse' : 'Create Warehouse'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Quick Add Location */}
      {showLocModal && targetWarehouse && (
        <Modal
          title={`Add Location to ${targetWarehouse.name}`}
          subtitle={`Short code prefix: ${targetWarehouse.code || targetWarehouse.shortCode}`}
          close={() => setShowLocModal(false)}
        >
          <form onSubmit={handleSaveLocation} className="modal-form" id="quick-location-form">
            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="quick-loc-name">Location Name</label>
                <input
                  id="quick-loc-name"
                  required
                  placeholder="e.g. Stock3, Receiving Dock"
                  value={locForm.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    const whPrefix = targetWarehouse.code || targetWarehouse.shortCode || 'WH';
                    setLocForm({
                      ...locForm,
                      name: val,
                      code: val ? `${whPrefix}-${val.toUpperCase().replace(/\s+/g, '-')}` : `${whPrefix}-`,
                    });
                  }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="quick-loc-code">Location Code</label>
                <input
                  id="quick-loc-code"
                  required
                  placeholder="e.g. WH-STOCK-3"
                  value={locForm.code}
                  onChange={(e) => setLocForm({ ...locForm, code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="quick-loc-type">Location Type</label>
                <select
                  id="quick-loc-type"
                  className="form-control"
                  value={locForm.type}
                  onChange={(e) => setLocForm({ ...locForm, type: e.target.value })}
                >
                  <option value="rack">Rack / Shelving</option>
                  <option value="dock">Receiving Dock</option>
                  <option value="floor">Floor Staging</option>
                  <option value="shelf">Shelf / Bin</option>
                  <option value="staging">Staging Area</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quick-loc-cap">Capacity (Units)</label>
                <input
                  id="quick-loc-cap"
                  type="number"
                  min="1"
                  value={locForm.capacityUnits}
                  onChange={(e) => setLocForm({ ...locForm, capacityUnits: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowLocModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-quick-location"
                className="btn btn-primary"
                disabled={savingLoc}
              >
                {savingLoc ? 'Adding…' : 'Add Location'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
