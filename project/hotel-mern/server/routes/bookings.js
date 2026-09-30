const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Guest = require('../models/Guest');
const Invoice = require('../models/Invoice');
const auth = require('../middleware/auth');

const TAX_RATE = 0.12;

function nightsBetween(checkin, checkout) {
  const a = new Date(checkin + 'T00:00:00');
  const b = new Date(checkout + 'T00:00:00');
  const diff = Math.round((b - a) / 86400000);
  return Math.max(diff, 1);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/bookings  — active bookings with populated guest+room
router.get('/', auth, async (req, res) => {
  try {
    let query = { status: 'Active' };
    if (req.user && req.user.role === 'user') {
      const guest = await Guest.findOne({ phone: req.user.phone });
      if (!guest) return res.json([]);
      query.guest = guest._id;
    }
    const bookings = await Booking.find(query)
      .populate('guest')
      .populate('room')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/guests/lookup?phone=xxx
router.get('/guests/lookup', auth, async (req, res) => {
  try {
    const { phone } = req.query;
    const guest = await Guest.findOne({ phone });
    res.json(guest || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings  — create new booking
router.post('/', auth, async (req, res) => {
  try {
    const { room_id, phone, name, address, checkin_date, is_regular, complimentary_perks } = req.body;
    if (!phone || !name) return res.status(400).json({ error: 'Guest phone and name required' });
    if (!room_id) return res.status(400).json({ error: 'Room required' });

    const room = await Room.findById(room_id);
    if (!room || room.status !== 'Available') {
      return res.status(400).json({ error: 'Room is not available' });
    }

    // Find or create guest
    let guest = await Guest.findOne({ phone });
    let perksToSet = Array.isArray(complimentary_perks) ? complimentary_perks : [];

    if (!guest) {
      guest = await Guest.create({
        name,
        phone,
        address,
        is_regular: Boolean(is_regular),
        visit_count: 1,
        complimentary_perks: perksToSet,
      });
    } else {
      guest.name = name;
      if (address) guest.address = address;
      guest.visit_count = (guest.visit_count || 0) + 1;
      if (is_regular !== undefined) {
        guest.is_regular = Boolean(is_regular);
      } else if (guest.visit_count >= 2) {
        guest.is_regular = true;
      }
      if (perksToSet.length > 0) {
        guest.complimentary_perks = perksToSet;
      }
      await guest.save();
    }

    const isRegularGuest = Boolean(is_regular || guest.is_regular);
    if (isRegularGuest && perksToSet.length === 0) {
      perksToSet = guest.complimentary_perks && guest.complimentary_perks.length > 0
        ? guest.complimentary_perks
        : ['☕ Complimentary Breakfast', '🍹 Welcome Drink', '⚡ High-Speed Wi-Fi', '🕒 Late Checkout (2 PM)'];
    }

    room.status = 'Booked';
    await room.save();

    const booking = await Booking.create({
      guest: guest._id,
      room: room._id,
      checkin_date: checkin_date || todayISO(),
      status: 'Active',
      is_regular: isRegularGuest,
      complimentary_perks: perksToSet,
    });

    const populated = await Booking.findById(booking._id).populate('guest').populate('room');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings/:id/checkout
router.post('/:id/checkout', auth, async (req, res) => {
  try {
    const { extra } = req.body;
    const booking = await Booking.findById(req.params.id).populate('guest').populate('room');
    if (!booking || booking.status !== 'Active') {
      return res.status(400).json({ error: 'Booking not found or already completed' });
    }

    const checkoutDate = todayISO();
    const nights = nightsBetween(booking.checkin_date, checkoutDate);
    const roomCharge = nights * booking.room.price;
    const extraAmt = parseFloat(extra) || 0;
    const subtotal = roomCharge + extraAmt;
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    booking.checkout_date = checkoutDate;
    booking.status = 'Completed';
    await booking.save();

    booking.room.status = 'Available';
    await booking.room.save();

    const invoice = await Invoice.create({
      booking: booking._id,
      guest_name: booking.guest.name,
      guest_phone: booking.guest.phone,
      room_no: booking.room.room_no,
      room_type: booking.room.room_type,
      checkin_date: booking.checkin_date,
      checkout_date: checkoutDate,
      nights,
      price: booking.room.price,
      extra: extraAmt,
      subtotal,
      tax,
      total,
      is_regular: booking.is_regular,
      complimentary_perks: booking.complimentary_perks || [],
      generated_at: new Date(),
    });

    res.json({ booking, invoice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
