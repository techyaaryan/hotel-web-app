const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const auth = require('../middleware/auth');

// GET /api/invoices
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user && req.user.role === 'user') {
      query.guest_phone = req.user.phone;
    }
    const invoices = await Invoice.find(query).sort({ generated_at: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
