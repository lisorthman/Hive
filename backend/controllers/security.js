/**
 * R5 – Admin security monitoring API (Policy §8.3.6, §8.3.7).
 * All routes are behind protect + authorize('admin') in routes/admin.js.
 * There is deliberately no endpoint that edits or deletes security events (§8.3.5).
 */
const mongoose = require('mongoose');
const SecurityEvent = require('../models/SecurityEvent');
const SecurityAlert = require('../models/SecurityAlert');
const { EVENT_TYPES, OUTCOMES, retentionDays } = SecurityEvent;
const { logSecurityEvent, verifyAndRecord, cleanString } = require('../utils/securityLog');

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Only plain string query values are accepted (no arrays / objects). */
const readString = (query, key) => {
    const value = query[key];
    if (value === undefined || value === '') return { value: undefined };
    if (typeof value !== 'string') return { error: `${key} must be a single string value` };
    return { value };
};

// @desc    List security events (newest first, paginated by seq)
// @route   GET /api/admin/security-events?type&outcome&ip&email&before&limit
// @access  Private/Admin
exports.getSecurityEvents = async (req, res) => {
    try {
        const params = {};
        for (const key of ['type', 'outcome', 'ip', 'email', 'before', 'limit']) {
            const { value, error } = readString(req.query, key);
            if (error) return res.status(400).json({ success: false, error });
            params[key] = value;
        }

        const filter = {};
        if (params.type) {
            if (!EVENT_TYPES.includes(params.type)) {
                return res.status(400).json({ success: false, error: 'Unknown event type' });
            }
            filter.eventType = params.type;
        }
        if (params.outcome) {
            if (!OUTCOMES.includes(params.outcome)) {
                return res.status(400).json({ success: false, error: 'Unknown outcome' });
            }
            filter.outcome = params.outcome;
        }
        if (params.ip) {
            if (params.ip.length > 64) return res.status(400).json({ success: false, error: 'ip is too long' });
            filter.ip = params.ip.trim();
        }
        if (params.email) {
            if (params.email.length > 254) return res.status(400).json({ success: false, error: 'email is too long' });
            filter.userEmail = { $regex: escapeRegex(params.email.trim().toLowerCase()), $options: 'i' };
        }
        if (params.before) {
            const before = Number(params.before);
            if (!Number.isInteger(before) || before < 1) {
                return res.status(400).json({ success: false, error: 'before must be a positive integer' });
            }
            filter.seq = { $lt: before };
        }

        let limit = 50;
        if (params.limit) {
            limit = Number(params.limit);
            if (!Number.isInteger(limit)) return res.status(400).json({ success: false, error: 'limit must be an integer' });
            limit = Math.min(200, Math.max(1, limit));
        }

        const events = await SecurityEvent.find(filter).sort({ seq: -1 }).limit(limit).lean();
        const last = events[events.length - 1];

        res.status(200).json({
            success: true,
            count: events.length,
            nextBefore: events.length === limit && last ? last.seq : null,
            data: events
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Last-24h counts, open alerts, total events, last integrity check
// @route   GET /api/admin/security-events/summary
// @access  Private/Admin
exports.getSecuritySummary = async (req, res) => {
    try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [counts, openAlerts, totalEvents, lastCheck] = await Promise.all([
            Promise.all(EVENT_TYPES.map((type) =>
                SecurityEvent.countDocuments({ eventType: type, timestamp: { $gte: since } }))),
            SecurityAlert.countDocuments({ status: 'open' }),
            SecurityEvent.countDocuments({}),
            SecurityEvent.findOne({ eventType: { $in: ['log_integrity_check', 'log_integrity_failed'] } })
                .sort({ seq: -1 })
                .lean()
        ]);

        const last24h = {};
        EVENT_TYPES.forEach((type, i) => { last24h[type] = counts[i]; });

        res.status(200).json({
            success: true,
            data: {
                last24h,
                openAlerts,
                totalEvents,
                retentionDays: retentionDays(),
                lastIntegrityCheck: lastCheck
                    ? {
                        seq: lastCheck.seq,
                        at: lastCheck.timestamp,
                        valid: lastCheck.eventType === 'log_integrity_check',
                        checked: lastCheck.details?.checked ?? null,
                        issueCount: lastCheck.details?.issueCount ?? null,
                        headHash: lastCheck.details?.headHash ?? null
                    }
                    : null
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Verify the hash chain now (result is itself logged; failure raises a critical alert)
// @route   POST /api/admin/security-events/verify
// @access  Private/Admin
exports.verifySecurityLog = async (req, res) => {
    try {
        const result = await verifyAndRecord({ req, user: req.user, source: 'admin_api' });
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Integrity check could not be completed' });
    }
};

// @desc    List security alerts
// @route   GET /api/admin/security-alerts?status=open|acknowledged
// @access  Private/Admin
exports.getSecurityAlerts = async (req, res) => {
    try {
        const { value: status, error } = readString(req.query, 'status');
        if (error) return res.status(400).json({ success: false, error });
        const filter = {};
        if (status) {
            if (!['open', 'acknowledged'].includes(status)) {
                return res.status(400).json({ success: false, error: 'Invalid status' });
            }
            filter.status = status;
        }
        const alerts = await SecurityAlert.find(filter).sort({ lastSeenAt: -1 }).limit(100).lean();
        res.status(200).json({ success: true, count: alerts.length, data: alerts });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Acknowledge an alert (records reviewer + time; evidence for the §8.3.7 24-hour review)
// @route   PUT /api/admin/security-alerts/:id/acknowledge  { note }
// @access  Private/Admin
exports.acknowledgeSecurityAlert = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ success: false, error: 'Alert not found' });
        }
        const rawNote = req.body?.note;
        if (rawNote !== undefined && rawNote !== null && typeof rawNote !== 'string') {
            return res.status(400).json({ success: false, error: 'note must be a string' });
        }
        const note = cleanString((rawNote || '').trim(), 500) || null;

        const alert = await SecurityAlert.findById(req.params.id).lean();
        if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
        if (alert.status === 'acknowledged') {
            return res.status(400).json({ success: false, error: 'Alert has already been acknowledged' });
        }

        const acknowledgedAt = new Date();
        // Conditional update so two admins cannot both acknowledge the same alert.
        const updated = await SecurityAlert.findOneAndUpdate(
            { _id: alert._id, status: 'open' },
            {
                $set: {
                    status: 'acknowledged',
                    acknowledgedBy: req.user._id,
                    acknowledgedByName: req.user.name,
                    acknowledgedAt,
                    note
                }
            },
            { new: true }
        ).lean();
        if (!updated) {
            return res.status(400).json({ success: false, error: 'Alert has already been acknowledged' });
        }

        const minutesOpen = Math.round((acknowledgedAt - new Date(alert.createdAt || alert.firstSeenAt)) / 60000);
        await logSecurityEvent({
            eventType: 'security_alert_acknowledged',
            outcome: 'success',
            req,
            user: req.user,
            reason: alert.kind,
            details: {
                alertId: String(alert._id),
                kind: alert.kind,
                key: alert.key,
                minutesOpen,
                withinReviewTarget: minutesOpen <= 24 * 60,
                note
            }
        });

        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
