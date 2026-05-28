const mongoose = require('mongoose');
const shiftSlotSchema = require('./ShiftSlotSchema');

const eventInstanceSchema = new mongoose.Schema({
    series: {
        type: mongoose.Schema.ObjectId,
        ref: 'EventSeries',
        required: true
    },
    organization: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    ngoName: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location: {
        name: { type: String, required: true },
        coordinates: { type: [Number], index: '2dsphere' }
    },
    category: { type: String, required: true },
    image: { type: String },
    prepNotes: { type: String, default: '' },
    date: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 1 },
    useShiftSlots: { type: Boolean, default: false },
    shiftSlots: [shiftSlotSchema],
    volunteersJoined: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    waitlist: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    createdAt: { type: Date, default: Date.now }
});

eventInstanceSchema.index({ series: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('EventInstance', eventInstanceSchema);
