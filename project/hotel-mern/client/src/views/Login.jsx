import { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';

export default function Login({ onLogin, currentPath = '/', onNavigate }) {
  const isAdminRoute = currentPath.startsWith('/admin');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // User registration specific
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setError('');
    setUsername('');
    setPassword('');
  }, [isAdminRoute]);

  // Admin login submission
  async function handleAdminLogin(e) {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError('Please enter admin username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', {
        username: username.trim(),
        password,
        role: 'admin',
      });
      localStorage.setItem('ledger-token', res.data.token);
      localStorage.setItem('ledger-user', JSON.stringify(res.data.user));
      toast('Signed in as Administrator');
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  }

  // User login or registration submission
  async function handleUserAuth(e) {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    if (authMode === 'login') {
      if (!username || !password) {
        setError('Please enter username and password.');
        setLoading(false);
        return;
      }
      try {
        const res = await api.post('/auth/login', {
          username: username.trim(),
          password,
          role: 'user',
        });
        localStorage.setItem('ledger-token', res.data.token);
        localStorage.setItem('ledger-user', JSON.stringify(res.data.user));
        toast(`Welcome back, ${res.data.user.name}!`);
        onLogin(res.data.token, res.data.user);
      } catch (err) {
        setError(err.response?.data?.error || 'Incorrect username or password.');
      } finally {
        setLoading(false);
      }
    } else {
      // Register
      if (!name || !phone || !username || !password) {
        setError('All registration fields are required.');
        setLoading(false);
        return;
      }
      try {
        const res = await api.post('/auth/register', {
          name: name.trim(),
          phone: phone.trim(),
          username: username.trim(),
          password,
        });
        localStorage.setItem('ledger-token', res.data.token);
        localStorage.setItem('ledger-user', JSON.stringify(res.data.user));
        toast(`Account created! Welcome, ${res.data.user.name}.`);
        onLogin(res.data.token, res.data.user);
      } catch (err) {
        setError(err.response?.data?.error || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    }
  }

  function handleDemoAdmin() {
    setUsername('admin');
    setPassword('admin123');
    setError('');
  }

  function handleDemoUser() {
    setUsername('user');
    setPassword('user123');
    setError('');
  }

  return (
    <div className="login-screen">
      <div className="login-card" style={{ maxWidth: 440 }}>
        {/* Brand */}
        <div className="brand-mark">
          <div className="brand-tag mono">L</div>
          <div className="brand-name display">Ledger</div>
        </div>

        {/* ADMIN ROUTE (/admin) */}
        {isAdminRoute ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="badge-regular" style={{ fontSize: 11 }}>
                👑 Admin Portal (/admin)
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 11.5, padding: '4px 8px' }}
                onClick={() => onNavigate('/')}
              >
                ← Guest Portal (/)
              </button>
            </div>

            <p className="brand-sub" style={{ margin: '0 0 24px 0' }}>
              Hotel Operations Desk &amp; Staff Console
            </p>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleAdminLogin}>
              <div className="field">
                <label htmlFor="admin-user">Admin Username</label>
                <input
                  id="admin-user"
                  type="text"
                  autoComplete="username"
                  placeholder="admin"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="admin-pass">Admin Password</label>
                <input
                  id="admin-pass"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Authenticating…' : 'Sign In as Administrator'}
              </button>

              <div className="login-demo-bar">
                <span>Demo Admin: <strong>admin</strong> / <strong>admin123</strong></span>
                <button type="button" className="btn-demo-fill" onClick={handleDemoAdmin}>
                  Auto Fill
                </button>
              </div>

              <div style={{ marginTop: 22, textAlign: 'center', borderTop: '1px solid var(--line-light)', paddingTop: 16 }}>
                <span style={{ fontSize: 12, color: 'var(--slate)' }}>Looking for hotel bookings and guest services?</span><br />
                <button
                  type="button"
                  onClick={() => onNavigate('/')}
                  style={{ background: 'none', border: 'none', color: 'var(--brass-light)', fontSize: 12.5, fontWeight: 600, marginTop: 4, cursor: 'pointer' }}
                >
                  Go to Guest Portal (/) →
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* GUEST ROUTE (/) */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <div className="badge-standard" style={{ fontSize: 11 }}>
                👤 Guest &amp; Customer Portal
              </div>
            </div>

            <p className="brand-sub" style={{ margin: '0 0 20px 0' }}>
              Room Reservations, VIP Amenities &amp; Invoices
            </p>

            {/* Login vs Register Tabs */}
            <div className="user-subtab-container">
              <button
                type="button"
                className={`user-subtab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthMode('login'); setError(''); }}
              >
                Guest Sign In
              </button>
              <button
                type="button"
                className={`user-subtab ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthMode('register'); setError(''); }}
              >
                Create Account (Sign Up)
              </button>
            </div>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleUserAuth}>
              {authMode === 'register' && (
                <>
                  <div className="field">
                    <label>Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="field">
                <label>Username</label>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder={authMode === 'login' ? 'user' : 'choose a username'}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading
                  ? 'Processing…'
                  : authMode === 'login'
                  ? 'Sign In to Guest Portal'
                  : 'Create Guest Account'}
              </button>

              {authMode === 'login' && (
                <div className="login-demo-bar">
                  <span>Demo VIP Regular User: <strong>user</strong> / <strong>user123</strong></span>
                  <button type="button" className="btn-demo-fill" onClick={handleDemoUser}>
                    Auto Fill
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
