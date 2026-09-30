require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/invoices', require('./routes/invoices'));

// MongoDB connection and server start
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotelledger';

let isConnected = false;
async function connectDB() {
  if (isConnected || mongoose.connection.readyState >= 1) return;
  await mongoose.connect(MONGO_URI);
  isConnected = true;
  await seedDefaults();
}

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
} else {
  // Serverless Vercel middleware to ensure DB connection
  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      console.error('❌ MongoDB connection error:', err.message);
      res.status(500).json({ error: 'Database connection failed' });
    }
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
