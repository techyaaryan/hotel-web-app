const mongoose = require('mongoose');

const GuestSchema = new mongoose.Schema({
  name:                { type: String, required: true },
  phone:               { type: String, required: true, unique: true },
  address:             { type: String, default: '' },
  is_regular:          { type: Boolean, default: false },
  visit_count:         { type: Number, default: 0 },
  complimentary_perks: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Guest', GuestSchema);
