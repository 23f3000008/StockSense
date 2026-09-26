import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { api, unwrap } from './services/api';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Receipts from './pages/Receipts';
import Deliveries from './pages/Deliveries';
import StockView from './pages/StockView';
import MoveHistory from './pages/MoveHistory';
import Warehouses from './pages/Warehouses';
import Locations from './pages/Locations';
import Adjustments from './pages/Adjustments';
import Transfers from './pages/Transfers';
import AuthPage from './pages/AuthPage';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check existing session
  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        const u = unwrap(res)?.user || unwrap(res);
        setUser(u);
      })
      .catch(() => {
        localStorage.removeItem('stocksense_token');
        setUser(null);
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('stocksense_token');
    setUser(null);
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    navigate('/');
  };

  if (checkingAuth) {
    return (
      <div className="auth-loading-screen">
        <RefreshCw size={28} className="spin text-cyan mb-3" />
        <span>Initializing StockSense…</span>
      </div>
    );
  }

  // If not logged in, show wireframe Auth view
  if (!user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-shell" id="stocksense-app-shell">
      {/* Top Navbar matching wireframe layout */}
      <Navbar user={user} onLogout={handleLogout} />

      {/* Main View Area */}
      <main className="main-content-viewport" id="main-content-viewport">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/operations/receipts" element={<Receipts />} />
          <Route path="/operations/deliveries" element={<Deliveries />} />
          <Route path="/operations/adjustments" element={<Adjustments />} />
          <Route path="/operations/transfers" element={<Transfers />} />
          <Route path="/stock" element={<StockView />} />
          <Route path="/move-history" element={<MoveHistory />} />
          <Route path="/settings/warehouses" element={<Warehouses />} />
          <Route path="/settings/locations" element={<Locations />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
