const express = require('express');
const router = express.Router();
const QueueItem = require('../models/QueueItem');
const Room = require('../models/Room');
const Guest = require('../models/Guest');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_REGULAR_PERKS = [
  '☕ Complimentary Gourmet Breakfast',
  '🍹 Welcome Drink & Fruit Basket',
  '⚡ Premium High-Speed Wi-Fi',
  '🕒 Complimentary Late Checkout (2 PM)',
];

// GET /api/queue — Get active priority queue (Regular users at TOP)
router.get('/', auth, async (req, res) => {
  try {
    const queue = await QueueItem.find({ status: 'Waiting' })
      .sort({ priority: 1, createdAt: 1 });

    const totalWaiting = queue.length;
    const regularCount = queue.filter(q => q.priority === 1 || q.is_regular).length;
    const standardCount = totalWaiting - regularCount;

    const availableRooms = await Room.find({ status: 'Available' })
      .sort({ room_no: 1 });

    res.json({
      queue,
      stats: {
        totalWaiting,
        regularCount,
        standardCount,
        availableRoomsCount: availableRooms.length,
      },
      availableRooms,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/queue — Add guest to queue with priority ordering
router.post('/', auth, async (req, res) => {
  try {
    const {
      guest_name,
      guest_phone,
      guest_address,
      preferred_room_type,
      is_regular,
      complimentary_perks,
      special_notes,
    } = req.body;

    if (!guest_name || !guest_phone) {
      return res.status(400).json({ error: 'Guest name and phone number are required.' });
    }

    const cleanPhone = guest_phone.trim();
    const cleanName = guest_name.trim();

    // Check if phone belongs to an existing regular guest
    const existingGuest = await Guest.findOne({ phone: cleanPhone });
    const isRegularGuest = Boolean(
      is_regular ||
      req.user?.is_regular ||
      (existingGuest && (existingGuest.is_regular || existingGuest.visit_count > 0))
    );

    // Regular users get Priority 1 (Top of Queue), Standard users get Priority 2
    const priority = isRegularGuest ? 1 : 2;

    let perks = Array.isArray(complimentary_perks) && complimentary_perks.length > 0
      ? complimentary_perks
      : [];

    if (isRegularGuest && perks.length === 0) {
      perks = (existingGuest && existingGuest.complimentary_perks?.length)
        ? existingGuest.complimentary_perks
        : DEFAULT_REGULAR_PERKS;
    }

    const queueItem = await QueueItem.create({
      guest_name: cleanName,
      guest_phone: cleanPhone,
      guest_address: (guest_address || (existingGuest?.address) || '').trim(),
      preferred_room_type: preferred_room_type || 'Any',
      priority,
      is_regular: isRegularGuest,
      visit_count: existingGuest ? existingGuest.visit_count : 0,
      complimentary_perks: perks,
      special_notes: special_notes || '',
      status: 'Waiting',
    });

    // Calculate current position in the priority queue
    const position = await QueueItem.countDocuments({
      status: 'Waiting',
      $or: [
        { priority: { $lt: queueItem.priority } },
        { priority: queueItem.priority, createdAt: { $lte: queueItem.createdAt } },
      ],
    });

    res.status(201).json({ queueItem, position });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/queue/:id/allocate — Allocate a room to queued guest & create active booking
router.post('/:id/allocate', auth, async (req, res) => {
  try {
    const queueItem = await QueueItem.findById(req.params.id);
    if (!queueItem || queueItem.status !== 'Waiting') {
      return res.status(400).json({ error: 'Queue item not found or already processed.' });
    }

    let { room_id } = req.body;
    let room;

    if (room_id) {
      room = await Room.findById(room_id);
    } else {
      // Auto-assign: if preferred room type specified, try to find that first
      if (queueItem.preferred_room_type && queueItem.preferred_room_type !== 'Any') {
        room = await Room.findOne({
          status: 'Available',
          room_type: queueItem.preferred_room_type,
        });
      }
      // Otherwise assign any available room
      if (!room) {
        room = await Room.findOne({ status: 'Available' });
      }
    }

    if (!room || room.status !== 'Available') {
      return res.status(400).json({ error: 'No available room found to allocate.' });
    }

    // Find or create Guest
    let guest = await Guest.findOne({ phone: queueItem.guest_phone });
    if (!guest) {
      guest = await Guest.create({
        name: queueItem.guest_name,
        phone: queueItem.guest_phone,
        address: queueItem.guest_address || '',
        is_regular: queueItem.is_regular,
        visit_count: 1,
        complimentary_perks: queueItem.complimentary_perks,
      });
    } else {
      guest.name = queueItem.guest_name;
      if (queueItem.guest_address) guest.address = queueItem.guest_address;
      guest.visit_count = (guest.visit_count || 0) + 1;
      if (queueItem.is_regular) guest.is_regular = true;
      if (queueItem.complimentary_perks?.length > 0) {
        guest.complimentary_perks = queueItem.complimentary_perks;
      }
      await guest.save();
    }

    // Mark room booked
    room.status = 'Booked';
    await room.save();

    // Create Booking
    const booking = await Booking.create({
      guest: guest._id,
      room: room._id,
      checkin_date: todayISO(),
      status: 'Active',
      is_regular: queueItem.is_regular,
      complimentary_perks: queueItem.complimentary_perks || [],
    });

    // Mark Queue Item as served
    queueItem.status = 'Served';
    queueItem.served_booking = booking._id;
    queueItem.served_room = room._id;
    queueItem.served_at = new Date();
    await queueItem.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('guest')
      .populate('room');

    res.json({
      message: `Allocated Room ${room.room_no} to ${queueItem.guest_name}`,
      booking: populatedBooking,
      queueItem,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/queue/:id/priority — Toggle regular / VIP priority (moves to top or standard)
router.patch('/:id/priority', auth, async (req, res) => {
  try {
    const queueItem = await QueueItem.findById(req.params.id);
    if (!queueItem) return res.status(404).json({ error: 'Queue item not found.' });

    const makeRegular = !queueItem.is_regular;
    queueItem.is_regular = makeRegular;
    queueItem.priority = makeRegular ? 1 : 2;

    if (makeRegular && (!queueItem.complimentary_perks || queueItem.complimentary_perks.length === 0)) {
      queueItem.complimentary_perks = DEFAULT_REGULAR_PERKS;
    }

    await queueItem.save();
    res.json(queueItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/queue/:id/perks — Update complimentary perks for a queued guest
router.patch('/:id/perks', auth, async (req, res) => {
  try {
    const { perks } = req.body;
    const queueItem = await QueueItem.findById(req.params.id);
    if (!queueItem) return res.status(404).json({ error: 'Queue item not found.' });

    queueItem.complimentary_perks = Array.isArray(perks) ? perks : [];
    await queueItem.save();
    res.json(queueItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/queue/:id — Remove / cancel from queue
router.delete('/:id', auth, async (req, res) => {
  try {
    const queueItem = await QueueItem.findById(req.params.id);
    if (!queueItem) return res.status(404).json({ error: 'Queue item not found.' });

    queueItem.status = 'Cancelled';
    await queueItem.save();
    res.json({ message: 'Guest removed from queue.', queueItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
