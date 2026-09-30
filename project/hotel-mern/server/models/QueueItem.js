const mongoose = require('mongoose');

const QueueItemSchema = new mongoose.Schema({
  guest_name:          { type: String, required: true },
  guest_phone:         { type: String, required: true },
  guest_address:       { type: String, default: '' },
  preferred_room_type: { type: String, default: 'Any' }, // 'Any', 'Single', 'Double', 'Suite'
  priority:            { type: Number, default: 2 },     // 1 = High / Regular, 2 = Standard
  is_regular:          { type: Boolean, default: false },
  visit_count:         { type: Number, default: 0 },
  complimentary_perks: { type: [String], default: [] },
  special_notes:       { type: String, default: '' },
  status:              { type: String, enum: ['Waiting', 'Served', 'Cancelled'], default: 'Waiting' },
  served_booking:      { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  served_room:         { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  served_at:           { type: Date },
}, { timestamps: true });

// Index for high-performance priority queue sorting (Top priority first, then FIFO by arrival)
QueueItemSchema.index({ status: 1, priority: 1, createdAt: 1 });

module.exports = mongoose.model('QueueItem', QueueItemSchema);
