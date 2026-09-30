const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  guest:               { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true },
  room:                { type: mongoose.Schema.Types.ObjectId, ref: 'Room',  required: true },
  checkin_date:        { type: String, required: true },
  checkout_date:       { type: String, default: null },
  status:              { type: String, enum: ['Active','Completed'], default: 'Active' },
  is_regular:          { type: Boolean, default: false },
  complimentary_perks: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
