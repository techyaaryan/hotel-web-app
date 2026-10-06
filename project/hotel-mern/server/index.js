require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection and server start
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotelledger';

let cachedPromise = null;
async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  if (!cachedPromise) {
    cachedPromise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
    }).then(async (m) => {
      await seedDefaults();
      return m;
    }).catch((err) => {
      cachedPromise = null;
      throw err;
    });
  }
  await cachedPromise;
}

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Hotel Ledger Backend is running' });
});
app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'Hotel Ledger API is running' });
});

// Middleware to ensure DB connection before executing any API route
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/invoices', require('./routes/invoices'));

if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      console.log('✅ Connected to MongoDB');
      app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      process.exit(1);
    });
}

async function seedDefaults() {
  const Room = require('./models/Room');
  const Admin = require('./models/Admin');
  const count = await Room.countDocuments();
  if (count === 0) {
    await Room.insertMany([
      { room_no: '101', room_type: 'Single',  price: 1500, status: 'Available' },
      { room_no: '102', room_type: 'Single',  price: 1500, status: 'Available' },
      { room_no: '201', room_type: 'Double',  price: 2500, status: 'Available' },
      { room_no: '202', room_type: 'Double',  price: 2500, status: 'Available' },
      { room_no: '301', room_type: 'Suite',   price: 5000, status: 'Available' },
    ]);
    console.log('🏨 Default rooms seeded');
  }
  const adminCount = await Admin.countDocuments();
  if (adminCount === 0) {
    await Admin.create({ username: 'admin', password: 'admin123' });
    console.log('👤 Default admin seeded (admin / admin123)');
  }
  const User = require('./models/User');
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create({
      username: 'user',
      password: 'user123',
      name: 'Aaryan Shende',
      phone: '9876543210',
      role: 'user',
      is_regular: true,
      visit_count: 3,
      complimentary_perks: [
        '☕ Complimentary Gourmet Breakfast',
        '🍹 Welcome Drink & Fruit Basket',
        '⚡ Premium High-Speed Wi-Fi',
        '🕒 Complimentary Late Checkout (2 PM)',
      ],
    });
    console.log('👤 Default regular user seeded (user / user123)');
  }
}

module.exports = app;
