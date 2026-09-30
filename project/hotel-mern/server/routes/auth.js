const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const User = require('../models/User');
const Guest = require('../models/Guest');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

const DEFAULT_REGULAR_PERKS = [
  '☕ Complimentary Gourmet Breakfast',
  '🍹 Welcome Drink & Fruit Basket',
  '⚡ Premium High-Speed Wi-Fi',
  '🕒 Complimentary Late Checkout (2 PM)',
];

// POST /api/auth/login — Handles both Admin and User login
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const cleanUsername = username.trim();

    // If role is specifically 'admin' or checking admin first
    if (role === 'admin' || !role) {
      const admin = await Admin.findOne({ username: cleanUsername });
      if (admin && admin.password === password) {
        const token = jwt.sign(
          { id: admin._id, username: admin.username, role: 'admin', name: 'Administrator' },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        return res.json({
          token,
          user: {
            id: admin._id,
            username: admin.username,
            name: 'Administrator',
            role: 'admin',
          },
        });
      }
      if (role === 'admin') {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }
    }

    // Check regular User
    const user = await User.findOne({ username: cleanUsername });
    if (user && user.password === password) {
      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          name: user.name,
          phone: user.phone,
          role: user.role || 'user',
          is_regular: user.is_regular,
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          phone: user.phone,
          role: user.role || 'user',
          is_regular: user.is_regular,
          visit_count: user.visit_count,
          complimentary_perks: user.complimentary_perks || [],
        },
      });
    }

    return res.status(401).json({ error: 'Invalid username or password' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register — Register new guest/customer user
router.post('/register', async (req, res) => {
  try {
    const { name, phone, username, password } = req.body;
    if (!name || !phone || !username || !password) {
      return res.status(400).json({ error: 'All fields (name, phone, username, password) are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // Check if username taken in Admin or User
    const existingAdmin = await Admin.findOne({ username: cleanUsername });
    const existingUser = await User.findOne({ username: cleanUsername });
    if (existingAdmin || existingUser) {
      return res.status(400).json({ error: 'Username already taken. Please choose another.' });
    }

    // Check if phone matches an existing guest with regular/loyalty history
    const existingGuest = await Guest.findOne({ phone: cleanPhone });
    const isRegular = Boolean(existingGuest?.is_regular || (existingGuest?.visit_count && existingGuest.visit_count > 0));
    const perks = isRegular
      ? (existingGuest.complimentary_perks?.length > 0 ? existingGuest.complimentary_perks : DEFAULT_REGULAR_PERKS)
      : [];

    const newUser = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      username: cleanUsername,
      password,
      role: 'user',
      is_regular: isRegular,
      visit_count: existingGuest ? existingGuest.visit_count : 0,
      complimentary_perks: perks,
    });

    const token = jwt.sign(
      {
        id: newUser._id,
        username: newUser.username,
        name: newUser.name,
        phone: newUser.phone,
        role: 'user',
        is_regular: newUser.is_regular,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        name: newUser.name,
        phone: newUser.phone,
        role: 'user',
        is_regular: newUser.is_regular,
        visit_count: newUser.visit_count,
        complimentary_perks: newUser.complimentary_perks,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — Get profile of currently logged-in user or admin
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const admin = await Admin.findById(req.user.id);
      return res.json({
        id: admin._id,
        username: admin.username,
        name: 'Administrator',
        role: 'admin',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user._id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: 'user',
      is_regular: user.is_regular,
      visit_count: user.visit_count,
      complimentary_perks: user.complimentary_perks || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (req.user.role === 'admin') {
      const admin = await Admin.findById(req.user.id);
      if (!admin || admin.password !== currentPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: 'New password must be at least 4 characters' });
      }
      admin.password = newPassword;
      await admin.save();
      return res.json({ message: 'Password updated' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.password !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
