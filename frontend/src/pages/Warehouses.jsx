import React, { useEffect, useState } from 'react';
import {
  Warehouse as WarehouseIcon,
  Plus,
  MapPin,
  RefreshCw,
  Building,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { api, apiError, unwrap } from '../services/api';
import Modal from '../components/Modal';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Warehouse Modal
  const [showWhModal, setShowWhModal] = useState(false);
  const [whForm, setWhForm] = useState({
    name: '',
    code: '',
    address: { street: '', city: '', state: '', country: 'USA', zipCode: '' },
    contactPerson: '',
    contactPhone: '',
    locations: [{ name: 'Stock1', code: 'LOC-STK-1', type: 'rack' }],
  });
  const [savingWh, setSavingWh] = useState(false);

  // Location Modal
  const [showLocModal, setShowLocModal] = useState(false);
  const [selectedWhId, setSelectedWhId] = useState('');
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

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    setSavingWh(true);
    try {
      await api.post('/inventory/warehouses', whForm);
      setShowWhModal(false);
      setWhForm({
        name: '',
        code: '',
        address: { street: '', city: '', state: '', country: 'USA', zipCode: '' },
        contactPerson: '',
        contactPhone: '',
        locations: [{ name: 'Stock1', code: 'LOC-STK-1', type: 'rack' }],
      });
      loadWarehouses();
    } catch (err) {
      alert(apiError(err));
    } finally {
      setSavingWh(false);
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!selectedWhId) return;
    setSavingLoc(true);
    try {
      await api.post(`/inventory/warehouses/${selectedWhId}/locations`, locForm);
      setShowLocModal(false);
      setLocForm({ name: '', code: '', type: 'rack', capacityUnits: 1000 });
      loadWarehouses();
    } catch (err) {
      alert(apiError(err));
    } finally {
      setSavingLoc(false);
    }
  };

  return (
    <div className="warehouses-page" id="warehouses-page-container">
      {/* Header */}
      <div className="wf-page-header">
        <div>
          <h1 className="wf-view-title">Warehouse & Locations Settings</h1>
          <p className="page-subtitle">Configure storage facilities, short codes, and internal bin locations.</p>
        </div>

        <div className="wf-header-right">
          <button className="btn btn-primary" onClick={() => setShowWhModal(true)} id="btn-add-warehouse">
            <Plus size={16} />
            <span>Add Warehouse</span>
          </button>
          <button className="btn btn-secondary" onClick={loadWarehouses} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && <div className="alert-banner alert-danger">{error}</div>}

      {/* Warehouses Grid */}
      <div className="warehouses-grid">
        {loading ? (
          <div className="text-center py-10 text-muted col-span-full">
            <RefreshCw size={22} className="spin inline-block mr-2" /> Loading warehouses…
          </div>
        ) : warehouses.length > 0 ? (
          warehouses.map((wh) => (
            <div className="warehouse-card" key={wh._id} id={`wh-card-${wh.code}`}>
              <div className="wh-card-top">
                <div className="wh-title-group">
                  <div className="wh-icon-box">
                    <WarehouseIcon size={20} className="text-cyan" />
                  </div>
                  <div>
                    <h3 className="wh-name">{wh.name}</h3>
                    <code className="wh-code">Code: {wh.code}</code>
                  </div>
                </div>
                <span className={`status-pill ${wh.isActive ? 'status-done' : 'status-canceled'}`}>
                  {wh.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="wh-address-box">
                <MapPin size={15} className="text-muted" />
                <span>
                  {typeof wh.address === 'string'
                    ? wh.address
                    : [wh.address?.street, wh.address?.city, wh.address?.state, wh.address?.country]
                        .filter(Boolean)
                        .join(', ') || 'Address not configured'}
                </span>
              </div>

              {/* Sub-Locations Section */}
              <div className="wh-locations-section">
                <div className="wh-locations-head">
                  <b>Locations ({wh.locations?.length || 0})</b>
                  <button
                    className="btn btn-xs btn-outline"
                    onClick={() => {
                      setSelectedWhId(wh._id);
                      setShowLocModal(true);
                    }}
                  >
                    <Plus size={13} />
                    <span>Add Location</span>
                  </button>
                </div>

                <div className="wh-locations-chips">
                  {wh.locations && wh.locations.length > 0 ? (
                    wh.locations.map((loc, idx) => (
                      <span className="location-chip" key={idx}>
                        <code>{loc.name}</code>
                        <small>{loc.type || 'rack'}</small>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted">No sub-locations defined yet.</span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-muted col-span-full">No warehouses configured.</div>
        )}
      </div>

      {/* Modal: Create Warehouse */}
      {showWhModal && (
        <Modal
          title="Create New Warehouse"
          subtitle="Configure physical facility and short code"
          close={() => setShowWhModal(false)}
        >
          <form onSubmit={handleCreateWarehouse} className="modal-form">
            <div className="form-group-row">
              <label>
                Warehouse Name
                <input
                  required
                  placeholder="e.g. East Distribution Center"
                  value={whForm.name}
                  onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
                />
              </label>

              <label>
                Short Code (e.g. WH, EAST)
                <input
                  required
                  placeholder="e.g. WH-EAST"
                  value={whForm.code}
                  onChange={(e) => setWhForm({ ...whForm, code: e.target.value.toUpperCase() })}
                />
              </label>
            </div>

            <label>
              Street Address
              <input
                placeholder="100 Logistics Blvd"
                value={whForm.address.street}
                onChange={(e) =>
                  setWhForm({ ...whForm, address: { ...whForm.address, street: e.target.value } })
                }
              />
            </label>

            <div className="form-group-row">
              <label>
                City
                <input
                  placeholder="Chicago"
                  value={whForm.address.city}
                  onChange={(e) =>
                    setWhForm({ ...whForm, address: { ...whForm.address, city: e.target.value } })
                  }
                />
              </label>

              <label>
                State
                <input
                  placeholder="IL"
                  value={whForm.address.state}
                  onChange={(e) =>
                    setWhForm({ ...whForm, address: { ...whForm.address, state: e.target.value } })
                  }
                />
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowWhModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingWh}>
                {savingWh ? 'Saving…' : 'Create Warehouse'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Add Location */}
      {showLocModal && (
        <Modal
          title="Add Storage Location"
          subtitle="Create sub-location (e.g. Stock1, Receiving Dock, Rack A1)"
          close={() => setShowLocModal(false)}
        >
          <form onSubmit={handleAddLocation} className="modal-form">
            <div className="form-group-row">
              <label>
                Location Name
                <input
                  required
                  placeholder="e.g. Stock1"
                  value={locForm.name}
                  onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                />
              </label>

              <label>
                Type
                <select
                  value={locForm.type}
                  onChange={(e) => setLocForm({ ...locForm, type: e.target.value })}
                >
                  <option value="rack">Rack</option>
                  <option value="shelf">Shelf</option>
                  <option value="bin">Bin</option>
                  <option value="dock">Dock</option>
                  <option value="floor">Floor</option>
                  <option value="staging">Staging</option>
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowLocModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingLoc}>
                {savingLoc ? 'Adding…' : 'Add Location'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
