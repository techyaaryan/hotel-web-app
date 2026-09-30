import { useState, useEffect, useCallback } from 'react';
import api, { fmtMoney } from '../api';
import { useToast } from '../components/Toast';

const TAX_RATE = 0.12;

export default function Invoices({ refresh }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data);
    } catch {
      toast('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refresh]);

  if (loading) return <div className="spinner">Loading invoices…</div>;

  if (invoices.length === 0) {
    return (
      <div className="empty-state" id="invoices-empty">
        <span className="display">No invoices yet</span>
        Check a guest out from Bookings to generate the first one.
      </div>
    );
  }

  return (
    <div>
      <table className="ledger">
        <thead>
          <tr><th>Invoice</th><th>Guest</th><th>Room</th><th>Check-out</th><th>Total</th><th /></tr>
        </thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv._id}>
              <td className="mono">#{inv._id.slice(-6)}</td>
              <td>{inv.guest_name}</td>
              <td className="mono">{inv.room_no}</td>
              <td className="mono">{inv.checkout_date}</td>
              <td className="mono">₹ {fmtMoney(inv.total)}</td>
              <td><button className="icon-btn" onClick={() => setSelected(inv)}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="modal" style={{ padding: 0, maxWidth: 460 }}>
            <div className="invoice-paper" style={{ border: 'none' }}>
              <div className="invoice-head">
                <div className="display">Ledger</div>
                <div className="sub">Guest invoice · #{selected._id.slice(-6)}</div>
              </div>
              <div className="invoice-body">
                <div className="invoice-row">
                  <span>Guest</span>
                  <span>
                    {selected.guest_name}{' '}
                    {selected.is_regular && <span className="badge-regular" style={{ fontSize: 10 }}>👑 Regular</span>}
                  </span>
                </div>
                <div className="invoice-row muted"><span>Phone</span><span>{selected.guest_phone}</span></div>
                <div className="invoice-row"><span>Room</span><span>{selected.room_no} ({selected.room_type})</span></div>
                <div className="invoice-row muted"><span>Check-in</span><span>{selected.checkin_date}</span></div>
                <div className="invoice-row muted"><span>Check-out</span><span>{selected.checkout_date}</span></div>
                <div className="invoice-row muted"><span>Nights stayed</span><span>{selected.nights}</span></div>

                {selected.complimentary_perks?.length > 0 && (
                  <>
                    <hr className="invoice-divider" />
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--emerald)', marginBottom: 4 }}>
                      Complimentary Amenities Included (₹ 0.00):
                    </div>
                    <div className="perks-list" style={{ marginBottom: 6 }}>
                      {selected.complimentary_perks.map((p, idx) => (
                        <span key={idx} className="perk-pill" style={{ fontSize: 10 }}>{p}</span>
                      ))}
                    </div>
                  </>
                )}

                <hr className="invoice-divider" />
                <div className="invoice-row">
                  <span>Room charge ({selected.nights} × ₹{fmtMoney(selected.price)})</span>
                  <span>₹ {fmtMoney(selected.nights * selected.price)}</span>
                </div>
                <div className="invoice-row"><span>Extra services</span><span>₹ {fmtMoney(selected.extra)}</span></div>
                <div className="invoice-row muted"><span>Subtotal</span><span>₹ {fmtMoney(selected.subtotal)}</span></div>
                <div className="invoice-row muted"><span>Tax ({Math.round(TAX_RATE * 100)}%)</span><span>₹ {fmtMoney(selected.tax)}</span></div>
                <hr className="invoice-divider" />
                <div className="invoice-total"><span>Total due</span><span>₹ {fmtMoney(selected.total)}</span></div>
              </div>
              <div className="invoice-foot">Thank you for staying with us</div>
            </div>
            <div style={{ padding: '16px 28px 24px', textAlign: 'right' }}>
              <button className="btn-ghost" id="invoice-modal-close" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
