import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Plus,
  Search,
  RefreshCw,
  Warehouse as WarehouseIcon,
  Trash2,
  Layers,
  Filter,
  CheckCircle2,
  Box,
} from 'lucide-react';
import { api, apiError, unwrap } from '../services/api';
import Modal from '../components/Modal';

export default function Locations() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal: Add Location
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    warehouseId: '',
    name: '',
    code: '',
    type: 'rack',
    capacityUnits: 1000,
    description: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/inventory/warehouses');
      const whList = unwrap(res) || [];
      setWarehouses(whList);
      if (whList.length > 0 && !form.warehouseId) {
        setForm((f) => ({ ...f, warehouseId: whList[0]._id }));
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Flatten all locations across warehouses with parent warehouse metadata
  const allLocations = warehouses.flatMap((wh) =>
    (wh.locations || []).map((loc) => ({
      ...loc,
      warehouseId: wh._id,
      warehouseName: wh.name,
      warehouseCode: wh.code || wh.shortCode || 'WH',
    }))
  );

  // Apply filters
  const filteredLocations = allLocations.filter((loc) => {
    if (selectedWarehouseFilter !== 'all' && loc.warehouseId !== selectedWarehouseFilter) {
      return false;
    }
    if (selectedTypeFilter !== 'all' && (loc.type || 'rack').toLowerCase() !== selectedTypeFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = loc.name?.toLowerCase().includes(q);
      const matchCode = loc.code?.toLowerCase().includes(q);
      const matchWh = loc.warehouseName?.toLowerCase().includes(q) || loc.warehouseCode?.toLowerCase().includes(q);
      return matchName || matchCode || matchWh;
    }
    return true;
  });

  const handleOpenAddModal = (whId = '') => {
    const targetWhId = whId || (selectedWarehouseFilter !== 'all' ? selectedWarehouseFilter : warehouses[0]?._id || '');
    const targetWh = warehouses.find((w) => w._id === targetWhId);
    const whCode = targetWh?.code || 'WH';

    setForm({
      warehouseId: targetWhId,
      name: '',
      code: `${whCode}-`,
      type: 'rack',
      capacityUnits: 1000,
      description: '',
    });
    setShowModal(true);
  };

  const handleWarehouseChangeInForm = (newWhId) => {
    const targetWh = warehouses.find((w) => w._id === newWhId);
    const whCode = targetWh?.code || 'WH';
    setForm((f) => ({
      ...f,
      warehouseId: newWhId,
      code: f.name ? `${whCode}-${f.name.toUpperCase().replace(/\s+/g, '-')}` : `${whCode}-`,
    }));
  };

  const handleNameChangeInForm = (newName) => {
    const targetWh = warehouses.find((w) => w._id === form.warehouseId);
    const whCode = targetWh?.code || 'WH';
    setForm((f) => ({
      ...f,
      name: newName,
      code: newName ? `${whCode}-${newName.toUpperCase().replace(/\s+/g, '-')}` : `${whCode}-`,
    }));
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!form.warehouseId) {
      alert('Please select a warehouse.');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/inventory/warehouses/${form.warehouseId}/locations`, {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        type: form.type,
        capacityUnits: Number(form.capacityUnits) || 1000,
        description: form.description || '',
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (whId, locId, locName) => {
    if (!window.confirm(`Are you sure you want to remove location "${locName}"?`)) return;
    try {
      await api.delete(`/inventory/warehouses/${whId}/locations/${locId}`);
      loadData();
    } catch (err) {
      alert(apiError(err));
    }
  };

  return (
    <div className="locations-page" id="locations-page-container">
      {/* Page Header */}
      <div className="wf-page-header">
        <div className="wf-header-left">
          <button
            id="btn-new-location"
            className="wf-btn-new"
            onClick={() => handleOpenAddModal()}
          >
            <Plus size={16} />
            <span>NEW LOCATION</span>
          </button>
          <div>
            <h1 className="wf-view-title">Locations</h1>
            <p className="page-subtitle">
              Manage internal warehouse locations, racks, storage bins, receiving docks, and staging bays.
            </p>
          </div>
        </div>

        <div className="wf-header-right">
          <button className="btn btn-secondary" onClick={loadData} disabled={loading} id="btn-refresh-locations">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && <div className="alert-banner alert-danger">{error}</div>}

      {/* Filters and Search Toolbar */}
      <div className="toolbar-row">
        <div className="toolbar-left">
          {/* Warehouse Filter */}
          <div className="filter-select-wrap">
            <WarehouseIcon size={16} className="filter-icon text-muted" />
            <select
              id="filter-location-warehouse"
              className="filter-select"
              value={selectedWarehouseFilter}
              onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
            >
              <option value="all">All Warehouses ({warehouses.length})</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name} ({wh.code || 'WH'})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="filter-select-wrap">
            <Filter size={16} className="filter-icon text-muted" />
            <select
              id="filter-location-type"
              className="filter-select"
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
            >
              <option value="all">All Location Types</option>
              <option value="rack">Rack / Shelving</option>
              <option value="dock">Receiving / Shipping Dock</option>
              <option value="floor">Floor / Ground Staging</option>
              <option value="shelf">Bin / Shelf</option>
              <option value="staging">Staging Bay</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="toolbar-right">
          <div className="wf-search-box">
            <Search size={16} className="wf-search-icon" />
            <input
              id="search-locations-input"
              type="text"
              placeholder="Search location name or code…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Locations Table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="wf-table" id="locations-table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Location Code</th>
                <th>Warehouse</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted">
                    <RefreshCw size={20} className="spin inline-block mr-2" /> Loading locations…
                  </td>
                </tr>
              ) : filteredLocations.length > 0 ? (
                filteredLocations.map((loc) => (
                  <tr key={loc._id}>
                    <td>
                      <div className="location-name-cell">
                        <MapPin size={16} className="text-primary mr-2" />
                        <b>{loc.warehouseCode}/{loc.name}</b>
                      </div>
                    </td>
                    <td>
                      <code>{loc.code || '—'}</code>
                    </td>
                    <td>
                      <span className="text-secondary">{loc.warehouseName}</span>
                    </td>
                    <td>
                      <span className="location-type-tag">
                        {loc.type || 'rack'}
                      </span>
                    </td>
                    <td>
                      <span>{(loc.capacityUnits || 1000).toLocaleString()} units</span>
                    </td>
                    <td>
                      <span className={`status-pill ${loc.isActive !== false ? 'status-done' : 'status-canceled'}`}>
                        {loc.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-xs btn-outline btn-danger-hover"
                        title="Delete Location"
                        onClick={() => handleDeleteLocation(loc.warehouseId, loc._id, loc.name)}
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted">
                    No locations match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Location */}
      {showModal && (
        <Modal
          title="Create New Location"
          subtitle="Add an internal storage bin, rack or receiving bay"
          close={() => setShowModal(false)}
        >
          <form onSubmit={handleSaveLocation} className="modal-form" id="create-location-form">
            <div className="form-group">
              <label htmlFor="loc-warehouse-select">Warehouse</label>
              <select
                id="loc-warehouse-select"
                required
                className="form-control"
                value={form.warehouseId}
                onChange={(e) => handleWarehouseChangeInForm(e.target.value)}
              >
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.name} ({wh.code || 'WH'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="loc-name-input">Location Name</label>
                <input
                  id="loc-name-input"
                  required
                  placeholder="e.g. Stock3, Receiving Dock, Rack B1"
                  value={form.name}
                  onChange={(e) => handleNameChangeInForm(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="loc-code-input">Location Code</label>
                <input
                  id="loc-code-input"
                  required
                  placeholder="e.g. WH-STOCK-3"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="loc-type-select">Location Type</label>
                <select
                  id="loc-type-select"
                  className="form-control"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="rack">Rack / Shelving</option>
                  <option value="dock">Receiving Dock</option>
                  <option value="floor">Floor Staging</option>
                  <option value="shelf">Shelf / Bin</option>
                  <option value="staging">Staging Area</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="loc-capacity-input">Capacity Units</label>
                <input
                  id="loc-capacity-input"
                  type="number"
                  min="1"
                  placeholder="1000"
                  value={form.capacityUnits}
                  onChange={(e) => setForm({ ...form, capacityUnits: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="loc-desc-input">Description / Notes (Optional)</label>
              <textarea
                id="loc-desc-input"
                placeholder="Optional location notes or access guidelines…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-location"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Creating…' : 'Create Location'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
