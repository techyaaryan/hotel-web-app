import { useState, useEffect, useCallback } from 'react';
import api, { fmtMoney, todayISO } from '../api';
import { useToast } from '../components/Toast';

const TAX_RATE = 0.12;

function nightsBetween(checkin, checkout) {
  const a = new Date(checkin + 'T00:00:00');
  const b = new Date(checkout + 'T00:00:00');
  return Math.max(Math.round((b - a) / 86400000), 1);
}

const DEFAULT_PERKS = [
  '☕ Complimentary Gourmet Breakfast',
  '🍹 Welcome Drink & Fruit Basket',
  '⚡ Premium High-Speed Wi-Fi',
  '🕒 Complimentary Late Checkout (2 PM)',
];

export default function Bookings({ onInvoiceCreated }) {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    room_id: '',
    phone: '',
    name: '',
    address: '',
    checkin_date: todayISO(),
    is_regular: false,
    complimentary_perks: [],
  });
  const [regularNotice, setRegularNotice] = useState(null);

  // Checkout modal
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [checkoutBooking, setCheckoutBooking] = useState(null);
  const [extra, setExtra] = useState(0);

  // Invoice modal
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  const toast = useToast();

  const loadRooms = useCallback(async () => {
    const res = await api.get('/rooms');
    setRooms(res.data.filter(r => r.status === 'Available')
      .sort((a, b) => a.room_no.localeCompare(b.room_no, undefined, { numeric: true })));
  }, []);

  const loadBookings = useCallback(async () => {
    const res = await api.get('/bookings');
    setBookings(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    Promise.all([loadRooms(), loadBookings()]);
  }, [loadRooms, loadBookings]);

  async function lookupPhone() {
    const phone = form.phone.trim();
    if (!phone) return;
    try {
      const res = await api.get(`/bookings/guests/lookup?phone=${encodeURIComponent(phone)}`);
      if (res.data) {
        const g = res.data;
        const isReg = Boolean(g.is_regular || (g.visit_count && g.visit_count > 0));
        setForm(f => ({
          ...f,
          name: g.name || f.name,
          address: g.address || f.address,
          is_regular: isReg,
          complimentary_perks: isReg
            ? (g.complimentary_perks?.length > 0 ? g.complimentary_perks : DEFAULT_PERKS)
            : f.complimentary_perks,
        }));
        if (isReg) {
          setRegularNotice(`⭐ Returning Regular Guest recognized (${g.visit_count || 1} past stays). Complimentary perks unlocked!`);
        } else {
          setRegularNotice(null);
        }
      } else {
        setRegularNotice(null);
      }
    } catch { /* ignore */ }
  }

  function togglePerk(perk) {
    setForm(f => ({
      ...f,
      complimentary_perks: f.complimentary_perks.includes(perk)
        ? f.complimentary_perks.filter(p => p !== perk)
        : [...f.complimentary_perks, perk],
    }));
  }

  async function createBooking() {
    if (!form.room_id) { toast('No room selected.'); return; }
    if (!form.phone || !form.name) { toast('Guest phone and name are required.'); return; }
    try {
      await api.post('/bookings', {
        room_id: form.room_id,
        phone: form.phone.trim(),
        name: form.name.trim(),
        address: form.address.trim(),
        checkin_date: form.checkin_date || todayISO(),
        is_regular: form.is_regular,
        complimentary_perks: form.complimentary_perks,
      });
      toast(`Booking created for ${form.name} — room ${rooms.find(r=>r._id===form.room_id)?.room_no}.`);
      setForm({
        room_id: '',
        phone: '',
        name: '',
        address: '',
        checkin_date: todayISO(),
        is_regular: false,
        complimentary_perks: [],
      });
      setRegularNotice(null);
      await Promise.all([loadRooms(), loadBookings()]);
    } catch (err) {
      toast(err.response?.data?.error || 'Error creating booking.');
    }
  }

  function openCheckout(booking) {
    setCheckoutBooking(booking);
    setExtra(0);
    setCheckoutModal(true);
  }

  async function doCheckout() {
    try {
      const res = await api.post(`/bookings/${checkoutBooking._id}/checkout`, { extra: parseFloat(extra) || 0 });
      setCheckoutModal(false);
      toast(`Checked out ${checkoutBooking.guest.name}. Invoice generated.`);
      setInvoiceData(res.data.invoice);
      setInvoiceModal(true);
      onInvoiceCreated();
      await Promise.all([loadRooms(), loadBookings()]);
    } catch (err) {
      toast(err.response?.data?.error || 'Checkout failed.');
    }
  }

  const availableRooms = rooms;

  return (
    <div>
      <div className="two-col">
        {/* New Booking Form */}
        <div className="panel">
          <h3 className="section-title">New booking</h3>
          <div className="field">
            <label>Room</label>
            <select value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}>
              <option value="">— select room —</option>
              {availableRooms.map(r => (
                <option key={r._id} value={r._id}>
                  {r.room_no} — {r.room_type} (₹{fmtMoney(r.price)}/night)
                </option>
              ))}
              {availableRooms.length === 0 && <option disabled>No rooms available</option>}
            </select>
          </div>
          <div className="field">
            <label>Guest phone number</label>
            <input type="text" placeholder="e.g. 9876543210"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              onBlur={lookupPhone}
            />
          </div>

          {regularNotice && (
            <div className="regular-indicator-box">
              <div className="regular-indicator-title">{regularNotice}</div>
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label>Guest name</label>
              <input type="text" placeholder="Full name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Check-in date</label>
              <input type="date"
                value={form.checkin_date}
                onChange={e => setForm(f => ({ ...f, checkin_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <label>Address (optional)</label>
            <input type="text" placeholder="City, Country"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            />
          </div>

          {/* Regular Guest & Perks */}
          <div className="regular-indicator-box" style={{ marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                style={{ width: 'auto', accentColor: 'var(--brass)' }}
                checked={form.is_regular}
                onChange={e => {
                  const checked = e.target.checked;
                  setForm(f => ({
                    ...f,
                    is_regular: checked,
                    complimentary_perks: checked && f.complimentary_perks.length === 0
                      ? DEFAULT_PERKS
                      : f.complimentary_perks,
                  }));
                }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#8c6a2e' }}>
                  👑 Regular / Frequent Guest
                </div>
                <div style={{ fontSize: 11, color: 'var(--slate)' }}>
                  Attach complimentary perks &amp; mark as VIP regular guest
                </div>
              </div>
            </label>
          </div>

          {form.is_regular && (
            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ color: 'var(--emerald)', fontWeight: 600 }}>
                🎁 Complimentary Perks Awarded:
              </label>
              <div className="perks-checkbox-grid">
                {DEFAULT_PERKS.map(perk => (
                  <label key={perk} className="perk-checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.complimentary_perks.includes(perk)}
                      onChange={() => togglePerk(perk)}
                    />
                    <span>{perk}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button className="btn-accent" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
            onClick={createBooking} id="create-booking-btn">
            Create booking
          </button>
          <p className="modal-note" style={{ marginTop: 16 }}>
            Enter a phone number already on file and regular guests are automatically detected with complimentary perks unlocked.
          </p>
        </div>

        {/* Active Stays Table */}
        <div>
          <h3 className="section-title">Active stays</h3>
          {loading ? (
            <div className="spinner">Loading…</div>
          ) : bookings.length === 0 ? (
            <div className="empty-state" id="bookings-empty">
              <span className="display">No active stays</span>
              New bookings will appear here.
            </div>
          ) : (
            <table className="ledger">
              <thead>
                <tr><th>Guest</th><th>Room</th><th>Check-in</th><th>Status</th><th>Perks</th><th /></tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.guest?.name || '—'}</div>
                      {b.is_regular && (
                        <span className="badge-regular" style={{ marginTop: 3 }}>👑 Regular</span>
                      )}
                    </td>
                    <td className="mono">{b.room?.room_no}</td>
                    <td className="mono">{b.checkin_date}</td>
                    <td><span className="badge active">Active</span></td>
                    <td>
                      {b.complimentary_perks?.length > 0 ? (
                        <div className="perks-list">
                          {b.complimentary_perks.slice(0, 2).map((p, idx) => (
                            <span key={idx} className="perk-pill">{p}</span>
                          ))}
                          {b.complimentary_perks.length > 2 && (
                            <span className="perk-pill" style={{ color: 'var(--slate)' }}>
                              +{b.complimentary_perks.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--slate)' }}>—</span>
                      )}
                    </td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => openCheckout(b)}>Check out</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutModal && checkoutBooking && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setCheckoutModal(false); }}>
          <div className="modal">
            <h2>Checkout &amp; bill</h2>
            <p className="modal-note">
              {checkoutBooking.guest?.name} · Room {checkoutBooking.room?.room_no} ({checkoutBooking.room?.room_type}) ·{' '}
              {nightsBetween(checkoutBooking.checkin_date, todayISO())} night{nightsBetween(checkoutBooking.checkin_date, todayISO()) > 1 ? 's' : ''} since {checkoutBooking.checkin_date} ·{' '}
              ₹{fmtMoney(checkoutBooking.room?.price)}/night
            </p>
            {checkoutBooking.complimentary_perks?.length > 0 && (
              <div className="regular-indicator-box" style={{ marginBottom: 14 }}>
                <div className="regular-indicator-title">
                  🎁 Complimentary Perks Provided on Stay:
                </div>
                <div className="perks-list">
                  {checkoutBooking.complimentary_perks.map((p, i) => (
                    <span key={i} className="perk-pill perk-pill-gold">{p}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="field">
              <label>Extra service charges (food, laundry, etc.)</label>
              <input type="number" value={extra} onChange={e => setExtra(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setCheckoutModal(false)}>Cancel</button>
              <button className="btn-accent" onClick={doCheckout}>Check out &amp; generate bill</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal after checkout */}
      {invoiceModal && invoiceData && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setInvoiceModal(false); }}>
          <div className="modal" style={{ padding: 0, maxWidth: 460 }}>
            <div className="invoice-paper" style={{ border: 'none' }}>
              <div className="invoice-head">
                <div className="display">Ledger</div>
                <div className="sub">Guest invoice · #{invoiceData._id?.slice(-6)}</div>
              </div>
              <div className="invoice-body">
                <div className="invoice-row">
                  <span>Guest</span>
                  <span>
                    {invoiceData.guest_name}{' '}
                    {invoiceData.is_regular && <span className="badge-regular" style={{ fontSize: 10 }}>👑 Regular</span>}
                  </span>
                </div>
                <div className="invoice-row muted"><span>Phone</span><span>{invoiceData.guest_phone}</span></div>
                <div className="invoice-row"><span>Room</span><span>{invoiceData.room_no} ({invoiceData.room_type})</span></div>
                <div className="invoice-row muted"><span>Check-in</span><span>{invoiceData.checkin_date}</span></div>
                <div className="invoice-row muted"><span>Check-out</span><span>{invoiceData.checkout_date}</span></div>
                <div className="invoice-row muted"><span>Nights stayed</span><span>{invoiceData.nights}</span></div>

                {invoiceData.complimentary_perks?.length > 0 && (
                  <>
                    <hr className="invoice-divider" />
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--emerald)', marginBottom: 4 }}>
                      Complimentary Amenities Included (₹ 0.00):
                    </div>
                    <div className="perks-list" style={{ marginBottom: 6 }}>
                      {invoiceData.complimentary_perks.map((p, idx) => (
                        <span key={idx} className="perk-pill" style={{ fontSize: 10 }}>{p}</span>
                      ))}
                    </div>
                  </>
                )}

                <hr className="invoice-divider" />
                <div className="invoice-row"><span>Room charge ({invoiceData.nights} × ₹{fmtMoney(invoiceData.price)})</span><span>₹ {fmtMoney(invoiceData.nights * invoiceData.price)}</span></div>
                <div className="invoice-row"><span>Extra services</span><span>₹ {fmtMoney(invoiceData.extra)}</span></div>
                <div className="invoice-row muted"><span>Subtotal</span><span>₹ {fmtMoney(invoiceData.subtotal)}</span></div>
                <div className="invoice-row muted"><span>Tax ({Math.round(TAX_RATE * 100)}%)</span><span>₹ {fmtMoney(invoiceData.tax)}</span></div>
                <hr className="invoice-divider" />
                <div className="invoice-total"><span>Total due</span><span>₹ {fmtMoney(invoiceData.total)}</span></div>
              </div>
              <div className="invoice-foot">Thank you for staying with us</div>
            </div>
            <div style={{ padding: '16px 28px 24px', textAlign: 'right' }}>
              <button className="btn-ghost" onClick={() => setInvoiceModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
