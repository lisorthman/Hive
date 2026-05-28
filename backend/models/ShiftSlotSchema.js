const mongoose = require('mongoose');

const shiftSlotSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            required: true,
            trim: true
        },
        startTime: {
            type: String,
            required: true
        },
        endTime: {
            type: String,
            required: true
        },
        capacity: {
            type: Number,
            required: true,
            min: 1
        },
        volunteersJoined: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'User'
            }
        ],
        waitlist: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'User'
            }
        ]
    },
    { _id: true }
);

module.exports = shiftSlotSchema;
