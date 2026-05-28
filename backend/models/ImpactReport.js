const mongoose = require('mongoose');

const impactReportSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    targetType: {
        type: String,
        enum: ['impact_post', 'impact_comment'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.ObjectId,
        required: true
    },
    reason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    status: {
        type: String,
        enum: ['open', 'resolved', 'dismissed'],
        default: 'open'
    },
    createdAt: { type: Date, default: Date.now }
});

impactReportSchema.index({ targetType: 1, targetId: 1, status: 1 });
impactReportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('ImpactReport', impactReportSchema);
