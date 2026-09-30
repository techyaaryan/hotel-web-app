const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
const auth = require('../middleware/auth');

// GET /api/staff
router.get('/', auth, async (req, res) => {
  try {
    const staff = await Staff.find();
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff
router.post('/', auth, async (req, res) => {
  try {
    const { name, role, phone, salary } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'Name and role required' });
    const member = await Staff.create({ name, role, phone, salary });
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/staff/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, role, phone, salary } = req.body;
    const member = await Staff.findByIdAndUpdate(req.params.id, { name, role, phone, salary }, { new: true });
    if (!member) return res.status(404).json({ error: 'Staff not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/staff/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const member = await Staff.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ error: 'Staff not found' });
    res.json({ message: 'Staff member removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
