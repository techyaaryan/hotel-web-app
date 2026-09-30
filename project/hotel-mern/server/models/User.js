const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username:            { type: String, required: true, unique: true },
  password:            { type: String, required: true },
  name:                { type: String, required: true },
  phone:               { type: String, required: true },
  role:                { type: String, enum: ['user', 'admin'], default: 'user' },
  is_regular:          { type: Boolean, default: false },
  visit_count:         { type: Number, default: 0 },
  complimentary_perks: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
