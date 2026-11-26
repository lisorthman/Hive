const mongoose = require('mongoose');

/**
 * R5 – Security event log (OWASP A09:2025, STRIDE: Repudiation).
 * Hive Information Security Policy, Section 8 "Logging and Monitoring Policy".
 *
 * Every record is linked into a SHA-256 hash chain (§8.3.4) and the collection is
 * append-only (§8.3.5). Records are written only by utils/securityLog.js.
 */

const EVENT_TYPES = [
    'login_success',
    'login_failure',
    'login_denied',
    'account_locked',            // R1 (Member 1) – account lockout
    'rate_limited',              // R1 (Member 1) – rate limiting
    'auth_required',
    'access_denied',
    'upload_rejected',
    'validation_failure',        // R4 (Member 4) – input validation
    'role_changed',
    'account_status_changed',
    'ngo_verification_changed',
    'user_removed',
    'admin_action',
    'security_alert_raised',
    'security_alert_acknowledged',
    'log_integrity_check',
    'log_integrity_failed'
];

const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];
const OUTCOMES = ['success', 'failure', 'denied'];

// §8.3.8 – security events are kept for at least 365 days (default 400).
const MIN_RETENTION_DAYS = 365;
const DEFAULT_RETENTION_DAYS = 400;

const retentionDays = () => {
    const configured = parseInt(process.env.SECURITY_LOG_RETENTION_DAYS, 10);
    if (!Number.isFinite(configured)) return DEFAULT_RETENTION_DAYS;
    return Math.max(MIN_RETENTION_DAYS, configured);
};

// §8.3.2 – the minimum content of a security event record.
const securityEventSchema = new mongoose.Schema({
    seq: { type: Number, required: true, unique: true },
    timestamp: { type: Date, required: true },           // always UTC (JS Date)
    eventType: { type: String, enum: EVENT_TYPES, required: true },
    severity: { type: String, enum: SEVERITIES, required: true },
    outcome: { type: String, enum: OUTCOMES, required: true },
    userId: { type: String, default: null },
    userEmail: { type: String, default: null },
    userRole: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    method: { type: String, default: null },
    route: { type: String, default: null },
    statusCode: { type: Number, default: null },
    reason: { type: String, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: null },
    subject: { type: String, default: null },             // account key for alert counting
    countsTowardAlert: { type: Boolean, default: false },
    // §8.3.4 – hash chain. prevTimestamp lets verifyChain tell whether missing
    // oldest records were removed by the retention TTL or deleted early.
    prevHash: { type: String, required: true },
    prevTimestamp: { type: Date, default: null },
    hash: { type: String, required: true }
}, {
    // Stored document must equal the hashed document: keep empty objects.
    minimize: false,
    versionKey: false
});

securityEventSchema.index({ timestamp: 1 }, {
    name: 'retention_ttl',
    expireAfterSeconds: retentionDays() * 24 * 60 * 60
});
securityEventSchema.index({ ip: 1, timestamp: -1 });
securityEventSchema.index({ subject: 1, timestamp: -1 });
securityEventSchema.index({ eventType: 1, timestamp: -1 });

// ── §8.3.5 Append-only ─────────────────────────────────────────────────────
const appendOnlyError = () => {
    const err = new Error('Security events are append-only and cannot be modified or deleted');
    err.code = 'SECURITY_LOG_APPEND_ONLY';
    return err;
};
const refuse = function () { throw appendOnlyError(); };

for (const op of [
    'updateOne',
    'updateMany',
    'replaceOne',
    'findOneAndUpdate',
    'findOneAndReplace',
    'findOneAndDelete',
    'deleteOne',
    'deleteMany'
]) {
    securityEventSchema.pre(op, { document: true, query: true }, refuse);
}
securityEventSchema.pre('bulkWrite', refuse);

// A document may be validated/saved only once, when it is first inserted.
securityEventSchema.pre('validate', function () {
    if (!this.isNew) throw appendOnlyError();
});
securityEventSchema.pre('save', function () {
    if (!this.isNew) throw appendOnlyError();
});

const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);

module.exports = SecurityEvent;
module.exports.EVENT_TYPES = EVENT_TYPES;
module.exports.SEVERITIES = SEVERITIES;
module.exports.OUTCOMES = OUTCOMES;
module.exports.MIN_RETENTION_DAYS = MIN_RETENTION_DAYS;
module.exports.retentionDays = retentionDays;
