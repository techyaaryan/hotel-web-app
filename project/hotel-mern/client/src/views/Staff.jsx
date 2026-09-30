import { useState, useEffect, useCallback } from 'react';
import api, { fmtMoney } from '../api';
import { useToast } from '../components/Toast';

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', role: '', phone: '', salary: '' });
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/staff');
      setStaff(res.data);
    } catch {
      toast('Failed to load staff.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm({ name: '', role: '', phone: '', salary: '' });
    setModal(true);
  }

  function openEdit(s) {
    setEditing(s);
    setForm({ name: s.name, role: s.role, phone: s.phone || '', salary: s.salary || '' });
    setModal(true);
  }

  async function save() {
    if (!form.name || !form.role) { toast('Please fill in name and role.'); return; }
    try {
      const payload = { name: form.name, role: form.role, phone: form.phone, salary: parseFloat(form.salary) || 0 };
      if (editing) {
        await api.put(`/staff/${editing._id}`, payload);
        toast(`${form.name} updated.`);
      } else {
        await api.post('/staff', payload);
        toast(`${form.name} added to staff.`);
      }
      setModal(false);
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Error saving staff.');
    }
  }

  async function deleteStaff(s) {
    if (!confirm(`Remove ${s.name}?`)) return;
    try {
      await api.delete(`/staff/${s._id}`);
      toast('Staff member removed.');
      load();
    } catch {
      toast('Error removing staff.');
    }
  }

  return (
    <div>
      <div className="toolbar">
        <div />
        <button className="btn-accent" onClick={openAdd} id="add-staff-btn">+ Add staff</button>
      </div>

      {loading ? (
        <div className="spinner">Loading staff…</div>
      ) : staff.length === 0 ? (
        <div className="empty-state" id="staff-empty">
          <span className="display">No staff on record</span>
          Add your first team member to get started.
        </div>
      ) : (
        <table className="ledger">
          <thead>
            <tr><th>Name</th><th>Role</th><th>Phone</th><th>Salary</th><th /></tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s._id}>
                <td>{s.name}</td>
                <td>{s.role}</td>
                <td className="mono">{s.phone || '—'}</td>
                <td className="mono">₹ {fmtMoney(s.salary || 0)}</td>
                <td className="row-actions">
                  <button className="icon-btn" onClick={() => openEdit(s)}>Edit</button>
                  <button className="icon-btn danger" onClick={() => deleteStaff(s)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="modal">
            <h2>{editing ? 'Edit staff' : 'Add staff'}</h2>
            <div className="field">
              <label>Full name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Role</label>
              <input type="text" placeholder="e.g. Receptionist" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="field">
              <label>Monthly salary</label>
              <input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-accent" onClick={save}>Save staff</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
