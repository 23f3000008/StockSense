import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Boxes,
  ChevronDown,
  LayoutDashboard,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  ArrowLeftRight,
  Package,
  BookOpen,
  Settings as SettingsIcon,
  Warehouse,
  MapPin,
  LogOut,
  User,
  ShieldCheck,
} from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [opsOpen, setOpsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const opsRef = useRef(null);
  const settingsRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (opsRef.current && !opsRef.current.contains(e.target)) setOpsOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const isOpsActive = location.pathname.startsWith('/operations');
  const isSettingsActive = location.pathname.startsWith('/settings');

  const avatarInitial = user?.name ? user.name[0].toUpperCase() : (user?.loginId ? user.loginId[0].toUpperCase() : 'A');

  return (
    <header className="top-navbar" id="app-top-navbar">
      {/* Brand & Logo */}
      <div className="nav-brand" onClick={() => navigate('/')} id="navbar-brand-btn">
        <div className="nav-logo-box">
          <Boxes size={22} className="brand-icon" />
        </div>
        <div className="brand-text">
          <span className="brand-title">StockSense</span>
          <span className="brand-sub">Inventory OS</span>
        </div>
      </div>

      {/* Main Navigation Links matching Wireframe */}
      <nav className="nav-links">
        {/* 1. Dashboard */}
        <button
          id="nav-link-dashboard"
          className={`nav-item ${isActive('/') && !isOpsActive && !isSettingsActive ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <LayoutDashboard size={17} />
          <span>Dashboard</span>
        </button>

        {/* 2. Operations Dropdown */}
        <div className="nav-dropdown" ref={opsRef}>
          <button
            id="nav-link-operations"
            className={`nav-item ${isOpsActive ? 'active' : ''}`}
            onClick={() => {
              setOpsOpen(!opsOpen);
              setSettingsOpen(false);
              setProfileOpen(false);
            }}
          >
            <Layers size={17} />
            <span>Operations</span>
            <ChevronDown size={14} className={`chevron ${opsOpen ? 'open' : ''}`} />
          </button>

          {opsOpen && (
            <div className="dropdown-menu" id="operations-dropdown-menu">
              <div className="dropdown-header">Operations Submenu</div>
              <button
                id="submenu-receipts"
                className={`dropdown-item ${location.pathname === '/operations/receipts' ? 'active' : ''}`}
                onClick={() => {
                  navigate('/operations/receipts');
                  setOpsOpen(false);
                }}
              >
                <ArrowDownToLine size={16} className="text-emerald" />
                <div>
                  <span className="item-title">1. Receipts</span>
                  <small>Receive incoming goods</small>
                </div>
              </button>

              <button
                id="submenu-deliveries"
                className={`dropdown-item ${location.pathname === '/operations/deliveries' ? 'active' : ''}`}
                onClick={() => {
                  navigate('/operations/deliveries');
                  setOpsOpen(false);
                }}
              >
                <ArrowUpFromLine size={16} className="text-rose" />
                <div>
                  <span className="item-title">2. Deliveries</span>
                  <small>Pick, pack & dispatch orders</small>
                </div>
              </button>

              <button
                id="submenu-adjustments"
                className={`dropdown-item ${location.pathname === '/operations/adjustments' ? 'active' : ''}`}
                onClick={() => {
                  navigate('/operations/adjustments');
                  setOpsOpen(false);
                }}
              >
                <SlidersHorizontal size={16} className="text-amber" />
                <div>
                  <span className="item-title">3. Adjustments</span>
                  <small>Physical count reconciliation</small>
                </div>
              </button>

              <button
                id="submenu-transfers"
                className={`dropdown-item ${location.pathname === '/operations/transfers' ? 'active' : ''}`}
                onClick={() => {
                  navigate('/operations/transfers');
                  setOpsOpen(false);
                }}
              >
                <ArrowLeftRight size={16} className="text-indigo" />
                <div>
                  <span className="item-title">4. Internal Transfers</span>
                  <small>Relocate stock across bins</small>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 3. Stock */}
        <button
          id="nav-link-stock"
          className={`nav-item ${isActive('/stock') ? 'active' : ''}`}
          onClick={() => navigate('/stock')}
        >
          <Package size={17} />
          <span>Stock</span>
        </button>

        {/* 4. Move History */}
        <button
          id="nav-link-move-history"
          className={`nav-item ${isActive('/move-history') ? 'active' : ''}`}
          onClick={() => navigate('/move-history')}
        >
          <BookOpen size={17} />
          <span>Move History</span>
        </button>

        {/* 5. Settings Dropdown */}
        <div className="nav-dropdown" ref={settingsRef}>
          <button
            id="nav-link-settings"
            className={`nav-item ${isSettingsActive ? 'active' : ''}`}
            onClick={() => {
              setSettingsOpen(!settingsOpen);
              setOpsOpen(false);
              setProfileOpen(false);
            }}
          >
            <SettingsIcon size={17} />
            <span>Settings</span>
            <ChevronDown size={14} className={`chevron ${settingsOpen ? 'open' : ''}`} />
          </button>

          {settingsOpen && (
            <div className="dropdown-menu" id="settings-dropdown-menu">
              <div className="dropdown-header">Warehouse Management</div>
              <button
                id="submenu-warehouses"
                className={`dropdown-item ${location.pathname === '/settings/warehouses' ? 'active' : ''}`}
                onClick={() => {
                  navigate('/settings/warehouses');
                  setSettingsOpen(false);
                }}
              >
                <Warehouse size={16} className="text-cyan" />
                <div>
                  <span className="item-title">1. Warehouses</span>
                  <small>Facilities, codes & addresses</small>
                </div>
              </button>

              <button
                id="submenu-locations"
                className={`dropdown-item ${location.pathname === '/settings/locations' ? 'active' : ''}`}
                onClick={() => {
                  navigate('/settings/locations');
                  setSettingsOpen(false);
                }}
              >
                <MapPin size={16} className="text-purple" />
                <div>
                  <span className="item-title">2. Locations</span>
                  <small>Docks, racks, shelves & staging</small>
                </div>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* User Badge [A] matching Wireframe */}
      <div className="nav-user-section" ref={profileRef}>
        <button
          id="user-profile-badge-btn"
          className="user-badge-btn"
          onClick={() => {
            setProfileOpen(!profileOpen);
            setOpsOpen(false);
            setSettingsOpen(false);
          }}
          title={user?.name || user?.loginId}
        >
          <span className="badge-avatar-letter">{avatarInitial}</span>
        </button>

        {profileOpen && (
          <div className="dropdown-menu profile-menu" id="user-profile-dropdown-menu">
            <div className="profile-header">
              <div className="profile-avatar">{avatarInitial}</div>
              <div className="profile-meta">
                <b>{user?.name || 'Administrator'}</b>
                <span className="profile-loginId">@{user?.loginId || 'manager'}</span>
                <span className="profile-role">
                  <ShieldCheck size={13} />
                  {user?.role === 'warehouse_staff' ? 'Warehouse Staff' : 'Inventory Manager'}
                </span>
              </div>
            </div>
            <div className="dropdown-divider" />
            <button
              id="user-logout-btn"
              className="dropdown-item text-danger"
              onClick={() => {
                setProfileOpen(false);
                onLogout();
              }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
