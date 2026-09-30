import { useState, useEffect, useCallback } from 'react';
import api, { fmtMoney, todayISO } from '../api';
import { useToast } from '../components/Toast';

export default function UserPortal({ user, onProfileUpdated }) {
  const [tab, setTab] = useState('rooms'); // 'rooms' | 'bookings' | 'invoices'
  const [availableRooms, setAvailableRooms] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [myInvoices, setMyInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal
  const [bookModal, setBookModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkinDate, setCheckinDate] = useState(todayISO());

  // Invoice view modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const toast = useToast();

  const loadData = useCallback(async () => {
    try {
      const [roomsRes, bookingsRes, invoicesRes] = await Promise.all([
        api.get('/rooms'),
        api.get('/bookings'),
        api.get('/invoices'),
      ]);

      setAvailableRooms(roomsRes.data.filter(r => r.status === 'Available'));
      setMyBookings(bookingsRes.data);
      setMyInvoices(invoicesRes.data);
    } catch (err) {
      toast('Failed to load user portal data.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Book a room directly
  async function handleBookRoom() {
    if (!selectedRoom) return;
    try {
      await api.post('/bookings', {
        room_id: selectedRoom._id,
        phone: user.phone,
        name: user.name,
        checkin_date: checkinDate || todayISO(),
        is_regular: user.is_regular,
        complimentary_perks: user.is_regular ? user.complimentary_perks : [],
      });
      toast(`Room ${selectedRoom.room_no} successfully booked for you!`);
      setBookModal(false);
      setSelectedRoom(null);
      await loadData();
      setTab('bookings');
    } catch (err) {
      toast(err.response?.data?.error || 'Booking failed.');
    }
  }

  return (
    <div className="user-portal-container">
      {/* VIP Status & Complimentary Amenities Ribbon */}
      <div className="user-hero-card">
        <div className="user-hero-header">
          <div>
            <span className="user-greeting">Welcome back,</span>
            <h2 className="user-name display">{user.name}</h2>
            <div className="user-phone mono">{user.phone} · Guest Account</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {user.is_regular ? (
              <div className="badge-regular" style={{ fontSize: 13, padding: '6px 14px' }}>
                👑 VIP Regular Guest
              </div>
            ) : (
              <div className="badge-standard" style={{ fontSize: 13, padding: '6px 14px' }}>
                Standard Guest
              </div>
            )}
            <div style={{ fontSize: 11.5, color: 'var(--brass-light)', marginTop: 6 }}>
              {user.visit_count > 0 ? `${user.visit_count} Past Stays Completed` : 'First-time Guest'}
            </div>
          </div>
        </div>

        {/* Unlocked Complimentary Perks for Regular User */}
        {user.is_regular && (
          <div className="user-perks-showcase">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--brass-light)', marginBottom: 6 }}>
              🎁 Your VIP Regular Complimentary Amenities (Included with Every Stay):
            </div>
            <div className="perks-list">
              {(user.complimentary_perks?.length > 0
                ? user.complimentary_perks
                : [
                    '☕ Complimentary Gourmet Breakfast',
                    '🍹 Welcome Drink & Fruit Basket',
                    '⚡ Premium High-Speed Wi-Fi',
                    '🕒 Complimentary Late Checkout (2 PM)',
                  ]
              ).map((perk, i) => (
                <span key={i} className="perk-pill perk-pill-gold" style={{ fontSize: 12, padding: '4px 10px' }}>
                  {perk}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs (User Portal) */}
      <div className="user-nav-bar">
        <button
          className={`user-nav-btn ${tab === 'rooms' ? 'active' : ''}`}
          onClick={() => setTab('rooms')}
        >
          🏨 Browse &amp; Book Rooms ({availableRooms.length})
        </button>
        <button
          className={`user-nav-btn ${tab === 'bookings' ? 'active' : ''}`}
          onClick={() => setTab('bookings')}
        >
          📋 My Active Stays ({myBookings.length})
        </button>
        <button
          className={`user-nav-btn ${tab === 'invoices' ? 'active' : ''}`}
          onClick={() => setTab('invoices')}
        >
          🧾 My Invoices ({myInvoices.length})
        </button>
      </div>

      {/* TAB 1: AVAILABLE ROOMS */}
      {tab === 'rooms' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="section-title" style={{ margin: 0 }}>Available Hotel Rooms</h3>
            {user.is_regular && (
              <span className="badge-regular">
                ★ Guaranteed Complimentary Amenities on all bookings
              </span>
            )}
          </div>

          {availableRooms.length === 0 ? (
            <div className="empty-state">
              <span className="display">No Rooms Currently Available</span>
              All rooms are currently occupied. Please check back later or contact front desk.
            </div>
          ) : (
            <div className="rooms-catalog-grid">
              {availableRooms.map(room => (
                <div key={room._id} className="room-card-guest">
                  <div className="room-card-head">
                    <div>
                      <div className="room-card-num mono">Room {room.room_no}</div>
                      <div className="room-card-type">{room.room_type} Suite</div>
                    </div>
                    <div className="room-card-price">
                      <span className="amount">₹{fmtMoney(room.price)}</span>
                      <span className="per">/night</span>
                    </div>
                  </div>

                  <div className="room-card-features">
                    <span>✓ Premium King/Queen Bed</span>
                    <span>✓ Ensuite Luxury Bath</span>
                    <span>✓ City/Garden View</span>
                    {user.is_regular && (
                      <span style={{ color: 'var(--brass)', fontWeight: 600 }}>
                        ★ VIP Amenities Included
                      </span>
                    )}
                  </div>

                  <button
                    className="btn-accent"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
                    onClick={() => {
                      setSelectedRoom(room);
                      setBookModal(true);
                    }}
                  >
                    Book Room {room.room_no}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY ACTIVE STAYS */}
      {tab === 'bookings' && (
        <div>
          <h3 className="section-title">My Active Hotel Stays</h3>
          {myBookings.length === 0 ? (
            <div className="empty-state">
              <span className="display">No Active Stays</span>
              You don't have any rooms booked right now.
              <div style={{ marginTop: 12 }}>
                <button className="btn-accent" onClick={() => setTab('rooms')}>
                  Browse Available Rooms
                </button>
              </div>
            </div>
          ) : (
            <table className="ledger">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Room Type</th>
                  <th>Check-in Date</th>
                  <th>Status</th>
                  <th>Complimentary Perks</th>
                </tr>
              </thead>
              <tbody>
                {myBookings.map(b => (
                  <tr key={b._id}>
                    <td className="mono" style={{ fontWeight: 600, fontSize: 15 }}>
                      Room {b.room?.room_no}
                    </td>
                    <td>{b.room?.room_type} (₹{fmtMoney(b.room?.price)}/night)</td>
                    <td className="mono">{b.checkin_date}</td>
                    <td><span className="badge active">Checked In</span></td>
                    <td>
                      {b.complimentary_perks?.length > 0 ? (
                        <div className="perks-list">
                          {b.complimentary_perks.map((p, idx) => (
                            <span key={idx} className="perk-pill perk-pill-gold">{p}</span>
                          ))}
                        </div>
                      ) : 'Standard Stay'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: MY INVOICES */}
      {tab === 'invoices' && (
        <div>
          <h3 className="section-title">My Past Invoices &amp; Receipts</h3>
          {myInvoices.length === 0 ? (
            <div className="empty-state">
              <span className="display">No Invoices Yet</span>
              Your billing invoices will appear here once you check out from your stays.
            </div>
          ) : (
            <table className="ledger">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Room</th>
                  <th>Checkout Date</th>
                  <th>Nights</th>
                  <th>Total Paid</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {myInvoices.map(inv => (
                  <tr key={inv._id}>
                    <td className="mono">#{inv._id.slice(-6)}</td>
                    <td className="mono">Room {inv.room_no}</td>
                    <td className="mono">{inv.checkout_date}</td>
                    <td className="mono">{inv.nights}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>₹ {fmtMoney(inv.total)}</td>
                    <td>
                      <button className="icon-btn" onClick={() => setSelectedInvoice(inv)}>
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL: DIRECT ROOM BOOKING */}
      {bookModal && selectedRoom && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setBookModal(false); }}>
          <div className="modal">
            <h2>Book Room {selectedRoom.room_no}</h2>
            <p className="modal-note">
              {selectedRoom.room_type} · ₹{fmtMoney(selectedRoom.price)}/night
            </p>

            <div className="field">
              <label>Guest Name</label>
              <input type="text" value={user.name} disabled />
            </div>

            <div className="field">
              <label>Phone Number</label>
              <input type="text" value={user.phone} disabled />
            </div>

            <div className="field">
              <label>Check-in Date</label>
              <input
                type="date"
                value={checkinDate}
                onChange={e => setCheckinDate(e.target.value)}
              />
            </div>

            {user.is_regular && (
              <div className="regular-indicator-box" style={{ marginBottom: 14 }}>
                <div className="regular-indicator-title">
                  👑 VIP Regular Perks Included (₹0.00):
                </div>
                <div className="perks-list">
                  {(user.complimentary_perks || []).map((p, i) => (
                    <span key={i} className="perk-pill perk-pill-gold">{p}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setBookModal(false)}>Cancel</button>
              <button className="btn-accent" onClick={handleBookRoom}>
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INVOICE RECEIPT */}
      {selectedInvoice && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setSelectedInvoice(null); }}>
          <div className="modal" style={{ padding: 0, maxWidth: 460 }}>
            <div className="invoice-paper" style={{ border: 'none' }}>
              <div className="invoice-head">
                <div className="display">Ledger</div>
                <div className="sub">Guest Receipt · #{selectedInvoice._id.slice(-6)}</div>
              </div>
              <div className="invoice-body">
                <div className="invoice-row"><span>Guest</span><span>{selectedInvoice.guest_name}</span></div>
                <div className="invoice-row muted"><span>Phone</span><span>{selectedInvoice.guest_phone}</span></div>
                <div className="invoice-row"><span>Room</span><span>{selectedInvoice.room_no} ({selectedInvoice.room_type})</span></div>
                <div className="invoice-row muted"><span>Check-in</span><span>{selectedInvoice.checkin_date}</span></div>
                <div className="invoice-row muted"><span>Check-out</span><span>{selectedInvoice.checkout_date}</span></div>
                <div className="invoice-row muted"><span>Nights</span><span>{selectedInvoice.nights}</span></div>

                {selectedInvoice.complimentary_perks?.length > 0 && (
                  <>
                    <hr className="invoice-divider" />
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--emerald)', marginBottom: 4 }}>
                      Complimentary Amenities Included (₹ 0.00):
                    </div>
                    <div className="perks-list" style={{ marginBottom: 6 }}>
                      {selectedInvoice.complimentary_perks.map((p, idx) => (
                        <span key={idx} className="perk-pill" style={{ fontSize: 10 }}>{p}</span>
                      ))}
                    </div>
                  </>
                )}

                <hr className="invoice-divider" />
                <div className="invoice-row">
                  <span>Room Charges</span>
                  <span>₹ {fmtMoney(selectedInvoice.nights * selectedInvoice.price)}</span>
                </div>
                {selectedInvoice.extra > 0 && (
                  <div className="invoice-row">
                    <span>Extra Services</span>
                    <span>₹ {fmtMoney(selectedInvoice.extra)}</span>
                  </div>
                )}
                <div className="invoice-row muted"><span>Tax (12%)</span><span>₹ {fmtMoney(selectedInvoice.tax)}</span></div>
                <hr className="invoice-divider" />
                <div className="invoice-total"><span>Total Paid</span><span>₹ {fmtMoney(selectedInvoice.total)}</span></div>
              </div>
              <div className="invoice-foot">Thank you for staying at Ledger</div>
            </div>
            <div style={{ padding: '16px 28px 24px', textAlign: 'right' }}>
              <button className="btn-ghost" onClick={() => setSelectedInvoice(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
