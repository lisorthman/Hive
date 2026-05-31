const mongoose = require('mongoose');

const pledgeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true, min: 1 },
    note: { type: String, default: '', maxlength: 300 },
    createdAt: { type: Date, default: Date.now }
});

const crisisResourceRequestSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    ngo: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    item: { type: String, required: true, trim: true },
    quantityNeeded: { type: Number, required: true, min: 1 },
    unit: { type: String, default: 'units', trim: true },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    pledges: [pledgeSchema],
    status: {
        type: String,
        enum: ['open', 'fulfilled', 'cancelled'],
        default: 'open'
    },
    createdAt: { type: Date, default: Date.now }
});

crisisResourceRequestSchema.virtual('quantityPledged').get(function () {
    return (this.pledges || []).reduce((sum, p) => sum + (p.quantity || 0), 0);
});

crisisResourceRequestSchema.set('toJSON', { virtuals: true });
crisisResourceRequestSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CrisisResourceRequest', crisisResourceRequestSchema);
