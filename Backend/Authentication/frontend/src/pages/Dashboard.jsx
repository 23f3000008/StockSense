import { useAuth } from '../context/AuthContext';

// Placeholder landing page after signup/login. Swap this out for the real
// Inventory Dashboard module — ProtectedRoute already handles the auth gate.
export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Inventory Dashboard</h1>
      <p>Signed in as {user?.name} ({user?.email})</p>
      <p style={{ color: '#666' }}>This is a placeholder — replace with the StockSense dashboard module.</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}
