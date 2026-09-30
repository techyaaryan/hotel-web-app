import { useState, useEffect } from 'react';
import { ToastProvider } from './components/Toast';
import Login from './views/Login';
import Rooms from './views/Rooms';
import Staff from './views/Staff';
import Bookings from './views/Bookings';
import PriorityQueue from './views/PriorityQueue';
import Invoices from './views/Invoices';
import Settings from './views/Settings';
import UserPortal from './views/UserPortal';
import './index.css';

const ADMIN_VIEWS = ['rooms', 'staff', 'bookings', 'queue', 'invoices', 'settings'];
const ADMIN_TITLES = {
  rooms: 'Rooms Management',
  staff: 'Staff & Roles',
  bookings: 'Bookings & Checkouts',
  queue: 'Priority Queue & Perks',
  invoices: 'Guest Invoices & Billing',
  settings: 'Hotel Settings',
};

// Admin Operations Shell at /admin
function AdminShell({ user, onLogout, onNavigate }) {
  const [view, setView] = useState('rooms');
  const [invoiceRefresh, setInvoiceRefresh] = useState(0);

  return (
    <div className="shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand-mark">
          <div className="brand-tag mono">L</div>
          <div className="brand-name display" style={{ color: 'var(--marble)', fontSize: 19 }}>Ledger</div>
        </div>
        <p className="brand-sub" style={{ color: 'var(--slate)' }}>Hotel Operations Desk (/admin)</p>

        {/* Administrator Role Badge */}
        <div style={{ padding: '0 16px 14px' }}>
          <div className="badge-regular" style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}>
            👑 Administrator Portal
          </div>
        </div>

        {ADMIN_VIEWS.map(v => (
          <button
            key={v}
            className={`nav-item${view === v ? ' active' : ''}`}
            onClick={() => setView(v)}
            data-view={v}
          >
            <span className="dot" />
            <span className="label" style={{ textTransform: v === 'queue' ? 'none' : 'capitalize' }}>
              {v === 'queue' ? 'Priority Queue' : v}
            </span>
          </button>
        ))}

        <div className="sidebar-footer">
          <button
            className="btn-ghost"
            style={{ width: '100%', marginBottom: 10, fontSize: 11.5, justifyContent: 'center' }}
            onClick={() => onNavigate('/')}
          >
            ↗ View Guest Site (/)
          </button>
          <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 8, padding: '0 4px' }}>
            Logged in as <strong>{user?.username || 'admin'}</strong>
          </div>
          <button className="logout-btn" id="logout-btn" onClick={onLogout}>Sign out</button>
        </div>
      </aside>

      {/* Main Admin View */}
      <main className="main">
        <div className="topbar">
          <h1 id="view-title">{ADMIN_TITLES[view]}</h1>
          <div className="today mono" id="today-label">{new Date().toDateString()}</div>
        </div>
        <div className="content">
          {view === 'rooms'    && <Rooms />}
          {view === 'staff'    && <Staff />}
          {view === 'bookings' && <Bookings onInvoiceCreated={() => setInvoiceRefresh(n => n + 1)} />}
          {view === 'queue'    && <PriorityQueue onBookingCreated={() => setInvoiceRefresh(n => n + 1)} />}
          {view === 'invoices' && <Invoices refresh={invoiceRefresh} />}
          {view === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}

// User / Guest Experience Shell at /
function UserShell({ user, onLogout }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', color: 'var(--ink)' }}>
      {/* Top Navbar */}
      <header style={{
        background: 'var(--ink-2)',
        borderBottom: '1px solid var(--line-light)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="brand-mark" style={{ margin: 0 }}>
            <div className="brand-tag mono">L</div>
            <div className="brand-name display" style={{ color: 'var(--marble)', fontSize: 20 }}>Ledger</div>
          </div>
          <span style={{ color: 'var(--slate)', fontSize: 13, borderLeft: '1px solid var(--line-light)', paddingLeft: 12 }}>
            Guest Portal
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--marble)', fontSize: 13, fontWeight: 600 }}>{user.name}</div>
            <div className="mono" style={{ color: 'var(--brass-light)', fontSize: 11 }}>
              {user.is_regular ? '★ VIP Regular Member' : 'Standard Guest'}
            </div>
          </div>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Guest Content */}
      <main style={{ padding: '32px 32px 60px', background: 'var(--marble)', minHeight: 'calc(100vh - 65px)' }}>
        <UserPortal user={user} />
      </main>
    </div>
  );
}

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname || '/');
  const [token, setToken] = useState(() => localStorage.getItem('ledger-token'));
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ledger-user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Keep route synced with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname || '/');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function navigate(newPath) {
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
      setPath(newPath);
    }
  }

  function handleLogin(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
    // If admin logged in from root, route to /admin
    if (newUser.role === 'admin' && !path.startsWith('/admin')) {
      navigate('/admin');
    }
  }

  function handleLogout() {
    localStorage.removeItem('ledger-token');
    localStorage.removeItem('ledger-user');
    setToken(null);
    setUser(null);
  }

  const isAdminRoute = path.startsWith('/admin');

  return (
    <ToastProvider>
      {/* 1. ADMIN ROUTE: /admin */}
      {isAdminRoute ? (
        token && user && user.role === 'admin' ? (
          <AdminShell user={user} onLogout={handleLogout} onNavigate={navigate} />
        ) : (
          <Login onLogin={handleLogin} currentPath="/admin" onNavigate={navigate} />
        )
      ) : (
        /* 2. GUEST / USER ROUTE: / */
        token && user ? (
          user.role === 'admin' ? (
            <AdminShell user={user} onLogout={handleLogout} onNavigate={navigate} />
          ) : (
            <UserShell user={user} onLogout={handleLogout} />
          )
        ) : (
          <Login onLogin={handleLogin} currentPath="/" onNavigate={navigate} />
        )
      )}
    </ToastProvider>
  );
}
