const mongoose = require('mongoose');

/**
 * R5 – Security alerts raised from the security event log.
 * Policy §8.3.6 (alerting) and §8.3.7 (alerts reviewed and acknowledged within 24 hours).
 */
const securityAlertSchema = new mongoose.Schema({
    kind: {
        type: String,
        enum: ['brute_force_ip', 'brute_force_account', 'log_integrity_failure'],
        required: true
    },
    key: { type: String, required: true },          // "ip:<addr>", "user:<id>", "email:<addr>", "chain:security_events"
    severity: {
        type: String,
        enum: ['info', 'low', 'medium', 'high', 'critical'],
        default: 'high'
    },
    message: { type: String, required: true },
    count: { type: Number, default: 0 },
    windowMinutes: { type: Number, default: null },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    firstEventSeq: { type: Number, default: null },
    lastEventSeq: { type: Number, default: null },
    status: { type: String, enum: ['open', 'acknowledged'], default: 'open' },
    acknowledgedBy: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    acknowledgedByName: { type: String, default: null },
    acknowledgedAt: { type: Date, default: null },
    note: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

securityAlertSchema.index({ key: 1, status: 1, lastSeenAt: -1 });
securityAlertSchema.index({ status: 1, lastSeenAt: -1 });

module.exports = mongoose.model('SecurityAlert', securityAlertSchema);
