const mongoose = require('mongoose');

const crisisUpdateSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

crisisUpdateSchema.index({ event: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('CrisisUpdate', crisisUpdateSchema);
