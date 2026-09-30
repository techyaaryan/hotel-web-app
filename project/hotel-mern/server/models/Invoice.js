const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  booking:             { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  guest_name:          String,
  guest_phone:         String,
  room_no:             String,
  room_type:           String,
  checkin_date:        String,
  checkout_date:       String,
  nights:              Number,
  price:               Number,
  extra:               Number,
  subtotal:            Number,
  tax:                 Number,
  total:               Number,
  is_regular:          { type: Boolean, default: false },
  complimentary_perks: { type: [String], default: [] },
  generated_at:        { type: Date, default: Date.now },
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
