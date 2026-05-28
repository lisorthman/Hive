const mongoose = require('mongoose');
const shiftSlotSchema = require('./ShiftSlotSchema');

const eventSeriesSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: true
    },
    organization: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    ngoName: {
        type: String,
        required: true
    },
    location: {
        name: { type: String, required: true },
        coordinates: { type: [Number], index: '2dsphere' }
    },
    category: {
        type: String,
        required: true,
        enum: [
            'Environmental',
            'Social Work',
            'Education',
            'Animal Welfare',
            'Healthcare',
            'Disaster Relief',
            'Other'
        ]
    },
    image: {
        type: String,
        default:
            'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80'
    },
    prepNotes: { type: String, default: '' },
    recurrence: {
        frequency: {
            type: String,
            enum: ['weekly'],
            default: 'weekly'
        },
        dayOfWeek: {
            type: Number,
            min: 0,
            max: 6,
            required: true
        }
    },
    seriesStart: { type: Date, required: true },
    seriesEnd: { type: Date, required: true },
    defaultCapacity: { type: Number, required: true, min: 1 },
    useShiftSlots: { type: Boolean, default: false },
    shiftSlotTemplate: [shiftSlotSchema],
    status: {
        type: String,
        enum: ['active', 'cancelled'],
        default: 'active'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EventSeries', eventSeriesSchema);
