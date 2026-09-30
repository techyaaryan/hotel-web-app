const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  room_no:   { type: String, required: true, unique: true },
  room_type: { type: String, enum: ['Single','Double','Deluxe','Suite'], required: true },
  price:     { type: Number, required: true },
  status:    { type: String, enum: ['Available','Booked'], default: 'Available' },
});

module.exports = mongoose.model('Room', RoomSchema);
