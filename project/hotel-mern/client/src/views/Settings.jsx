import { useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';

export default function Settings() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const toast = useToast();

  async function save() {
    if (!current) { toast('Enter your current password.'); return; }
    if (!next || next.length < 4) { toast('New password must be at least 4 characters.'); return; }
    try {
      await api.put('/auth/password', { currentPassword: current, newPassword: next });
      toast('Password updated.');
      setCurrent('');
      setNext('');
    } catch (err) {
      toast(err.response?.data?.error || 'Error updating password.');
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 420 }}>
      <h3 className="section-title">Change admin password</h3>
      <div className="field">
        <label>Current password</label>
        <input type="password" value={current} onChange={e => setCurrent(e.target.value)} id="settings-current-pass" />
      </div>
      <div className="field">
        <label>New password</label>
        <input type="password" value={next} onChange={e => setNext(e.target.value)} id="settings-new-pass" />
      </div>
      <button className="btn-accent" onClick={save} id="settings-save-btn">Update password</button>
    </div>
  );
}
