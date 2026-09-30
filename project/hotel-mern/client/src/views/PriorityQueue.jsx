import { useState, useEffect, useCallback } from 'react';
import api, { fmtMoney } from '../api';
import { useToast } from '../components/Toast';

const AVAILABLE_PERKS = [
  '☕ Complimentary Gourmet Breakfast',
  '🍹 Welcome Drink & Fruit Basket',
  '⚡ Premium High-Speed Wi-Fi',
  '🕒 Complimentary Late Checkout (2 PM)',
  '🎟️ 15% VIP Loyalty Discount',
  '🧳 Complimentary Luggage & Valet',
];

export default function PriorityQueue({ onBookingCreated }) {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ totalWaiting: 0, regularCount: 0, standardCount: 0, availableRoomsCount: 0 });
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [form, setForm] = useState({
    guest_name: '',
    guest_phone: '',
    guest_address: '',
    preferred_room_type: 'Any',
    is_regular: false,
    complimentary_perks: [],
    special_notes: '',
  });
  const [customPerk, setCustomPerk] = useState('');
  const [guestLookupMessage, setGuestLookupMessage] = useState(null);

  // Allocate Room Modal
  const [allocateModal, setAllocateModal] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Edit Perks Modal
  const [perksModal, setPerksModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editPerksList, setEditPerksList] = useState([]);

  const toast = useToast();

  const loadQueue = useCallback(async () => {
    try {
      const res = await api.get('/queue');
      setQueue(res.data.queue);
      setStats(res.data.stats);
      setAvailableRooms(res.data.availableRooms || []);
    } catch {
      toast('Failed to load priority queue.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Lookup phone to auto-detect regular/returning guest
  async function handlePhoneLookup() {
    const phone = form.guest_phone.trim();
    if (!phone) return;
    try {
      const res = await api.get(`/bookings/guests/lookup?phone=${encodeURIComponent(phone)}`);
      if (res.data) {
        const g = res.data;
        const isReg = Boolean(g.is_regular || (g.visit_count && g.visit_count > 0));
        setForm(f => ({
          ...f,
          guest_name: g.name || f.guest_name,
          guest_address: g.address || f.guest_address,
          is_regular: isReg || f.is_regular,
          complimentary_perks: isReg
            ? (g.complimentary_perks?.length > 0 ? g.complimentary_perks : AVAILABLE_PERKS.slice(0, 4))
            : f.complimentary_perks,
        }));

        if (isReg) {
          setGuestLookupMessage(`⭐ Recognized Regular Guest (${g.visit_count || 1} past stays). Added to TOP of queue with complimentary perks!`);
        } else {
          setGuestLookupMessage(`Found existing guest record: ${g.name}`);
        }
      } else {
        setGuestLookupMessage(null);
      }
    } catch {
      setGuestLookupMessage(null);
    }
  }

  function togglePerkInForm(perk) {
    setForm(f => {
      const exists = f.complimentary_perks.includes(perk);
      return {
        ...f,
        complimentary_perks: exists
          ? f.complimentary_perks.filter(p => p !== perk)
          : [...f.complimentary_perks, perk],
      };
    });
  }

  function handleRegularToggle(checked) {
    setForm(f => ({
      ...f,
      is_regular: checked,
      complimentary_perks: checked && f.complimentary_perks.length === 0
        ? AVAILABLE_PERKS.slice(0, 4)
        : f.complimentary_perks,
    }));
  }

  function addCustomPerk() {
    const clean = customPerk.trim();
    if (!clean) return;
    if (!form.complimentary_perks.includes(clean)) {
      setForm(f => ({ ...f, complimentary_perks: [...f.complimentary_perks, clean] }));
    }
    setCustomPerk('');
  }

  async function handleAddToQueue(e) {
    e.preventDefault();
    if (!form.guest_phone.trim() || !form.guest_name.trim()) {
      toast('Guest phone and name are required.');
      return;
    }

    try {
      const res = await api.post('/queue', form);
      const isTop = res.data.queueItem.priority === 1;
      toast(
        isTop
          ? `👑 Regular guest ${form.guest_name} placed at the TOP of the Priority Queue!`
          : `${form.guest_name} added to the waiting queue (Position #${res.data.position}).`
      );

      // Reset form
      setForm({
        guest_name: '',
        guest_phone: '',
        guest_address: '',
        preferred_room_type: 'Any',
        is_regular: false,
        complimentary_perks: [],
        special_notes: '',
      });
      setGuestLookupMessage(null);
      await loadQueue();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to add guest to queue.');
    }
  }

  function openAllocateModal(item) {
    setSelectedQueueItem(item);
    // Suggest matching room
    const matchingRoom = availableRooms.find(r =>
      item.preferred_room_type === 'Any' || r.room_type === item.preferred_room_type
    );
    setSelectedRoomId(matchingRoom ? matchingRoom._id : (availableRooms[0]?._id || ''));
    setAllocateModal(true);
  }

  async function handleAllocateRoom() {
    if (!selectedRoomId) {
      toast('Please select an available room.');
      return;
    }
    try {
      const res = await api.post(`/queue/${selectedQueueItem._id}/allocate`, {
        room_id: selectedRoomId,
      });
      toast(`✅ Room ${res.data.booking.room?.room_no} allocated to ${selectedQueueItem.guest_name}!`);
      setAllocateModal(false);
      setSelectedQueueItem(null);
      if (onBookingCreated) onBookingCreated();
      await loadQueue();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to allocate room.');
    }
  }

  async function handleTogglePriority(item) {
    try {
      const res = await api.patch(`/queue/${item._id}/priority`);
      toast(
        res.data.is_regular
          ? `⭐ Upgraded ${item.guest_name} to Regular Guest (Moved to TOP of Queue)!`
          : `Changed ${item.guest_name} to Standard Priority.`
      );
      await loadQueue();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to update priority.');
    }
  }

  function openPerksModal(item) {
    setEditingItem(item);
    setEditPerksList(item.complimentary_perks || []);
    setPerksModal(true);
  }

  async function handleSavePerks() {
    try {
      await api.patch(`/queue/${editingItem._id}/perks`, {
        perks: editPerksList,
      });
      toast(`Updated complimentary perks for ${editingItem.guest_name}.`);
      setPerksModal(false);
      setEditingItem(null);
      await loadQueue();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to update perks.');
    }
  }

  async function handleRemove(item) {
    if (!window.confirm(`Remove ${item.guest_name} from the priority queue?`)) return;
    try {
      await api.delete(`/queue/${item._id}`);
      toast(`${item.guest_name} removed from queue.`);
      await loadQueue();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to remove from queue.');
    }
  }

  const topWaitingGuest = queue.length > 0 ? queue[0] : null;

  return (
    <div>
      {/* Metrics Ribbon */}
      <div className="stats-ribbon">
        <div className="stat-box">
          <span className="stat-label">Total in Queue</span>
          <span className="stat-val mono">{stats.totalWaiting}</span>
        </div>
        <div className="stat-box highlight">
          <span className="stat-label">👑 Regular Guests (Top)</span>
          <span className="stat-val mono">{stats.regularCount}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Standard Waiting</span>
          <span className="stat-val mono">{stats.standardCount}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Available Rooms</span>
          <span className="stat-val mono">{stats.availableRoomsCount}</span>
        </div>
      </div>

      {/* Serve Next Callout */}
      {topWaitingGuest && availableRooms.length > 0 && (
        <div className="serve-next-bar">
          <div className="serve-next-info">
            <h4>
              Next in Line: {topWaitingGuest.guest_name}{' '}
              {topWaitingGuest.is_regular && (
                <span className="badge-regular" style={{ marginLeft: 8 }}>👑 Regular Guest (Top Priority)</span>
              )}
            </h4>
            <p>
              Preferred: {topWaitingGuest.preferred_room_type} · Phone: {topWaitingGuest.guest_phone}
              {topWaitingGuest.complimentary_perks?.length > 0 && (
                <> · {topWaitingGuest.complimentary_perks.length} Complimentary Perks attached</>
              )}
            </p>
          </div>
          <button className="btn-serve-next" onClick={() => openAllocateModal(topWaitingGuest)}>
            Serve Next (Allocate Room)
          </button>
        </div>
      )}

      <div className="two-col">
        {/* Add Guest to Queue Form */}
        <div className="panel">
          <h3 className="section-title">Add Guest to Priority Queue</h3>
          <form onSubmit={handleAddToQueue}>
            <div className="field">
              <label>Guest Phone Number</label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={form.guest_phone}
                onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))}
                onBlur={handlePhoneLookup}
                required
              />
            </div>

            {guestLookupMessage && (
              <div className="regular-indicator-box">
                <div className="regular-indicator-title">
                  <span>{guestLookupMessage}</span>
                </div>
              </div>
            )}

            <div className="field-row">
              <div className="field">
                <label>Guest Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.guest_name}
                  onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label>Preferred Room</label>
                <select
                  value={form.preferred_room_type}
                  onChange={e => setForm(f => ({ ...f, preferred_room_type: e.target.value }))}
                >
                  <option value="Any">Any Available</option>
                  <option value="Single">Single</option>
                  <option value="Double">Double</option>
                  <option value="Suite">Suite</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>Address (optional)</label>
              <input
                type="text"
                placeholder="City, State"
                value={form.guest_address}
                onChange={e => setForm(f => ({ ...f, guest_address: e.target.value }))}
              />
            </div>

            {/* Regular User & Priority Queue Placement */}
            <div className="regular-indicator-box" style={{ marginTop: 6, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto', accentColor: 'var(--brass)' }}
                  checked={form.is_regular}
                  onChange={e => handleRegularToggle(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#8c6a2e' }}>
                    👑 Regular / Frequent Guest (Top Priority)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--slate)' }}>
                    Automatically places guest at the <strong>TOP</strong> of the queue and unlocks complimentary perks!
                  </div>
                </div>
              </label>
            </div>

            {/* Complimentary Perks Selection */}
            {form.is_regular && (
              <div className="field" style={{ marginBottom: 16 }}>
                <label style={{ color: 'var(--emerald)', fontWeight: 600 }}>
                  🎁 Complimentary Perks for Regular Guest:
                </label>
                <div className="perks-checkbox-grid">
                  {AVAILABLE_PERKS.map(perk => (
                    <label key={perk} className="perk-checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.complimentary_perks.includes(perk)}
                        onChange={() => togglePerkInForm(perk)}
                      />
                      <span>{perk}</span>
                    </label>
                  ))}
                </div>

                {/* Add Custom Perk */}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="+ Add custom complimentary perk..."
                    value={customPerk}
                    onChange={e => setCustomPerk(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomPerk(); } }}
                    style={{ fontSize: 12, padding: '7px 10px' }}
                  />
                  <button type="button" className="btn-ghost" onClick={addCustomPerk} style={{ whiteSpace: 'nowrap' }}>
                    Add
                  </button>
                </div>
              </div>
            )}

            <div className="field">
              <label>Special Requests / Notes</label>
              <input
                type="text"
                placeholder="e.g. High floor, quiet room, late check-in"
                value={form.special_notes}
                onChange={e => setForm(f => ({ ...f, special_notes: e.target.value }))}
              />
            </div>

            <button
              type="submit"
              className="btn-accent"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
            >
              {form.is_regular ? '⭐ Place at Top of Queue' : 'Add to Queue'}
            </button>
          </form>
        </div>

        {/* Priority Queue Board */}
        <div>
          <h3 className="section-title">Priority Queue Board</h3>
          {loading ? (
            <div className="spinner">Loading queue…</div>
          ) : queue.length === 0 ? (
            <div className="empty-state">
              <span className="display">Queue is empty</span>
              No guests currently waiting for room allocation.
            </div>
          ) : (
            <table className="ledger">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Pos</th>
                  <th>Guest</th>
                  <th>Priority &amp; Perks</th>
                  <th>Pref. Room</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item, idx) => {
                  const isTop = item.priority === 1 || item.is_regular;
                  return (
                    <tr key={item._id} className={isTop ? 'queue-row-top' : ''}>
                      <td>
                        <span className={`pos-badge ${isTop ? 'top-pos' : ''}`}>
                          #{idx + 1}
                          {idx === 0 && isTop ? ' TOP' : ''}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.guest_name}</div>
                        <div className="mono" style={{ fontSize: 11.5, color: 'var(--slate)' }}>
                          {item.guest_phone}
                        </div>
                        {item.special_notes && (
                          <div style={{ fontSize: 11, color: 'var(--brass)', fontStyle: 'italic', marginTop: 2 }}>
                            "{item.special_notes}"
                          </div>
                        )}
                      </td>
                      <td>
                        <div>
                          {isTop ? (
                            <span className="badge-regular">
                              👑 Regular (Top Priority)
                            </span>
                          ) : (
                            <span className="badge-standard">
                              Standard
                            </span>
                          )}
                        </div>
                        {item.complimentary_perks?.length > 0 && (
                          <div className="perks-list">
                            {item.complimentary_perks.map((p, i) => (
                              <span key={i} className={`perk-pill ${isTop ? 'perk-pill-gold' : ''}`}>
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {item.preferred_room_type}
                      </td>
                      <td className="row-actions" style={{ textAlign: 'right' }}>
                        <button
                          className="btn-accent"
                          style={{ padding: '4px 10px', fontSize: 11.5 }}
                          onClick={() => openAllocateModal(item)}
                          title="Allocate available room and check in"
                        >
                          Allocate
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => openPerksModal(item)}
                          title="Edit complimentary perks"
                        >
                          Perks
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => handleTogglePriority(item)}
                          title={isTop ? 'Demote to standard' : 'Promote to regular (moves to top)'}
                        >
                          {isTop ? 'Standard' : '⭐ Top'}
                        </button>
                        <button
                          className="icon-btn"
                          style={{ color: 'var(--rust)' }}
                          onClick={() => handleRemove(item)}
                          title="Cancel / Remove"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Room Allocation Modal */}
      {allocateModal && selectedQueueItem && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setAllocateModal(false); }}>
          <div className="modal">
            <h2>Allocate Room &amp; Check In</h2>
            <p className="modal-note">
              Assigning room to <strong>{selectedQueueItem.guest_name}</strong> ({selectedQueueItem.guest_phone}).
              {selectedQueueItem.is_regular && ' This is a Regular Guest queued with Top Priority.'}
            </p>

            <div className="field">
              <label>Select Available Room</label>
              <select
                value={selectedRoomId}
                onChange={e => setSelectedRoomId(e.target.value)}
              >
                <option value="">— select room —</option>
                {availableRooms.map(r => (
                  <option key={r._id} value={r._id}>
                    Room {r.room_no} · {r.room_type} · ₹{fmtMoney(r.price)}/night
                    {r.room_type === selectedQueueItem.preferred_room_type ? ' (Matches preference)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedQueueItem.complimentary_perks?.length > 0 && (
              <div className="regular-indicator-box" style={{ marginBottom: 16 }}>
                <div className="regular-indicator-title">
                  🎁 Complimentary Perks Included for Stay:
                </div>
                <div className="perks-list">
                  {selectedQueueItem.complimentary_perks.map((p, i) => (
                    <span key={i} className="perk-pill perk-pill-gold">{p}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setAllocateModal(false)}>Cancel</button>
              <button className="btn-accent" onClick={handleAllocateRoom}>
                Confirm Check In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Perks Modal */}
      {perksModal && editingItem && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setPerksModal(false); }}>
          <div className="modal">
            <h2>Complimentary Perks</h2>
            <p className="modal-note">
              Select complimentary amenities for <strong>{editingItem.guest_name}</strong>:
            </p>

            <div className="perks-checkbox-grid" style={{ marginBottom: 16 }}>
              {AVAILABLE_PERKS.map(perk => (
                <label key={perk} className="perk-checkbox-label">
                  <input
                    type="checkbox"
                    checked={editPerksList.includes(perk)}
                    onChange={() => {
                      setEditPerksList(list =>
                        list.includes(perk) ? list.filter(p => p !== perk) : [...list, perk]
                      );
                    }}
                  />
                  <span>{perk}</span>
                </label>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setPerksModal(false)}>Cancel</button>
              <button className="btn-accent" onClick={handleSavePerks}>Save Perks</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
