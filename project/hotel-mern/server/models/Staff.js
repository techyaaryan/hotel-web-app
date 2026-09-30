const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  role:   { type: String, required: true },
  phone:  { type: String, default: '' },
  salary: { type: Number, default: 0 },
});

module.exports = mongoose.model('Staff', StaffSchema);
