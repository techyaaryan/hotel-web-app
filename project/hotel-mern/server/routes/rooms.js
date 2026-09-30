const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const auth = require('../middleware/auth');

// GET /api/rooms
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ room_no: 1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rooms
router.post('/', auth, async (req, res) => {
  try {
    const { room_no, room_type, price, status } = req.body;
    if (!room_no || !price) return res.status(400).json({ error: 'Room number and price required' });
    const existing = await Room.findOne({ room_no });
    if (existing) return res.status(400).json({ error: `Room ${room_no} already exists` });
    const room = await Room.create({ room_no, room_type, price, status });
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/rooms/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { room_type, price, status } = req.body;
    const room = await Room.findByIdAndUpdate(req.params.id, { room_type, price, status }, { new: true });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
