import { useState, useEffect, useCallback } from 'react';
import api, { fmtMoney } from '../api';
import { useToast } from '../components/Toast';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null); // room object or null
  const [form, setForm] = useState({ room_no: '', room_type: 'Single', price: '', status: 'Available' });
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch (err) {
      toast('Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm({ room_no: '', room_type: 'Single', price: '', status: 'Available' });
    setModal(true);
  }

  function openEdit(room) {
    setEditing(room);
    setForm({ room_no: room.room_no, room_type: room.room_type, price: room.price, status: room.status });
    setModal(true);
  }

  async function saveRoom() {
    const { room_no, room_type, price, status } = form;
    if (!room_no || !price) { toast('Please fill in room number and price.'); return; }
    try {
      if (editing) {
        await api.put(`/rooms/${editing._id}`, { room_type, price: parseFloat(price), status });
        toast(`Room ${room_no} updated.`);
      } else {
        await api.post('/rooms', { room_no, room_type, price: parseFloat(price), status });
        toast(`Room ${room_no} added.`);
      }
      setModal(false);
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Error saving room.');
    }
  }

  async function deleteRoom(room) {
    if (!confirm(`Delete room ${room.room_no}? This can't be undone.`)) return;
    try {
      await api.delete(`/rooms/${room._id}`);
      toast(`Room ${room.room_no} deleted.`);
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Error deleting room.');
    }
  }

  const displayed = rooms
    .slice()
    .sort((a, b) => a.room_no.localeCompare(b.room_no, undefined, { numeric: true }))
    .filter(r => filter === 'all' ? true : r.status === filter);

  return (
    <div>
      <div className="toolbar">
        <div className="filters">
          {['all', 'Available', 'Booked'].map(f => (
            <button
              key={f}
              className={`chip${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All rooms' : f}
            </button>
          ))}
        </div>
        <button className="btn-accent" onClick={openAdd} id="add-room-btn">+ Add room</button>
      </div>

      {loading ? (
        <div className="spinner">Loading rooms…</div>
      ) : displayed.length === 0 ? (
        <div className="empty-state" style={{ gridColumn: '1/-1' }}>
          <span className="display">No rooms match</span>
          Try a different filter or add a room.
        </div>
      ) : (
        <div className="key-grid">
          {displayed.map(r => (
            <div key={r._id} className="key-tag">
              <div className="key-hole" />
              <div className="key-room-no">{r.room_no}</div>
              <div className="key-type">{r.room_type}</div>
              <div className="key-price">₹ {fmtMoney(r.price)} / night</div>
              <span className={`key-status ${r.status === 'Available' ? 'available' : 'booked'}`}>{r.status}</span>
              <div className="key-actions">
                <button className="icon-btn" onClick={() => openEdit(r)}>Edit</button>
                <button className="icon-btn danger" onClick={() => deleteRoom(r)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="modal">
            <h2>{editing ? 'Edit room' : 'Add room'}</h2>
            <div className="field">
              <label>Room number</label>
              <input type="text" placeholder="e.g. 105" value={form.room_no}
                disabled={!!editing}
                onChange={e => setForm(f => ({ ...f, room_no: e.target.value }))} />
            </div>
            <div className="field">
              <label>Room type</label>
              <select value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))}>
                <option>Single</option>
                <option>Double</option>
                <option>Deluxe</option>
                <option>Suite</option>
              </select>
            </div>
            <div className="field">
              <label>Price per night</label>
              <input type="number" placeholder="e.g. 2500" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option>Available</option>
                <option>Booked</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-accent" onClick={saveRoom}>Save room</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
