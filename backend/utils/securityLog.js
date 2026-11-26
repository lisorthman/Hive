/**
 * R5 – Security event logging, tamper-evident storage and alerting (Control C5).
 *
 * Risk R5: Insufficient Security Event Logging & Monitoring (OWASP A09:2025, STRIDE: Repudiation).
 * Policy: Hive Information Security Policy, Section 8 "Logging and Monitoring Policy".
 *
 *   §8.3.2  Required content of every security event record      → buildEvent()
 *   §8.3.3  No secrets / personal data beyond what is needed;
 *           log injection prevented                               → sanitize*()
 *   §8.3.4  Tamper evidence (SHA-256 hash chain) + verification   → computeHash(), verifyChain()
 *   §8.3.5  Append-only storage                                   → models/SecurityEvent.js hooks
 *   §8.3.6  Automated alerting on suspicious patterns             → evaluateAlerts()
 *   §8.3.7  Alerts reviewed/acknowledged within 24 hours          → controllers/security.js
 *   §8.3.8  Retention ≥ 365 days                                  → models/SecurityEvent.js TTL
 *
 * logSecurityEvent() never throws: logging must not break the request being logged.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const SecurityEvent = require('../models/SecurityEvent');
const SecurityAlert = require('../models/SecurityAlert');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const { EVENT_TYPES, OUTCOMES, SEVERITIES, retentionDays } = SecurityEvent;

const GENESIS_HASH = '0'.repeat(64);
const DAY_MS = 24 * 60 * 60 * 1000;

// Injectable clock (tests only).
let clock = () => new Date();
const now = () => clock();
const _setClock = (fn) => { clock = typeof fn === 'function' ? fn : () => new Date(); };

const positiveInt = (raw, fallback) => {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};
// §8.3.6 – alert thresholds (configurable, defaults: 10 events in 5 minutes).
const alertThreshold = () => positiveInt(process.env.SECURITY_ALERT_THRESHOLD, 10);
const alertWindowMinutes = () => positiveInt(process.env.SECURITY_ALERT_WINDOW_MINUTES, 5);

// ── §8.3.3 Sanitising ──────────────────────────────────────────────────────
// Keys that could carry credentials, session material or private documents are dropped.
const SENSITIVE_KEY = /password|token|secret|authorization|cookie|jwt|session|document/i;
// CWE-117: control characters (CR/LF etc.) would let an attacker forge log lines.
const CONTROL_CHARS = new RegExp(`[${String.fromCharCode(0x00)}-${String.fromCharCode(0x1f)}${String.fromCharCode(0x7f)}-${String.fromCharCode(0x9f)}${String.fromCharCode(0x2028, 0x2029)}]`, 'g'); // U+0000–001F, U+007F–009F, U+2028, U+2029
const MAX_STRING = 500;
const MAX_DEPTH = 4;
const MAX_KEYS = 30;
const MAX_ARRAY = 20;
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const TOKEN_SEGMENT = /^[A-Za-z0-9._~%+=-]{32,}$/;

const cleanString = (value, max = MAX_STRING) => {
    if (value === undefined || value === null) return null;
    const text = String(value).replace(CONTROL_CHARS, '');
    return text.length > max ? `${text.slice(0, max)}…` : text;
};

const cleanKey = (key) => {
    const text = cleanString(key, 64) || '_';
    // MongoDB operator / path injection: no leading "$" and no "." in stored keys.
    return text.replace(/^\$+/, '_').replace(/\./g, '_');
};

const sanitizeValue = (value, depth = 0) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') return cleanString(value);
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'function' || typeof value === 'symbol') return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    if (typeof value.toHexString === 'function') return value.toHexString();
    if (Buffer.isBuffer(value)) return '[binary]';
    if (depth >= MAX_DEPTH) return '[truncated]';
    if (Array.isArray(value)) return value.slice(0, MAX_ARRAY).map((v) => sanitizeValue(v, depth + 1));
    if (typeof value === 'object') {
        const out = {};
        for (const [key, v] of Object.entries(value).slice(0, MAX_KEYS)) {
            if (v === undefined || SENSITIVE_KEY.test(key)) continue;
            out[cleanKey(key)] = sanitizeValue(v, depth + 1);
        }
        return out;
    }
    return cleanString(value);
};

/** Sanitise the free-form `details` object. Returns null when nothing is left. */
const sanitizeDetails = (details) => {
    if (details === undefined || details === null) return null;
    const isPlainObject = typeof details === 'object' && !Array.isArray(details) && !(details instanceof Date);
    const cleaned = sanitizeValue(isPlainObject ? details : { value: details });
    return cleaned && typeof cleaned === 'object' && Object.keys(cleaned).length ? cleaned : null;
};

/**
 * Path only (query strings dropped). Path segments that look like secrets
 * (32+ token characters, e.g. the email verification token) become ":redacted";
 * 24-character MongoDB ObjectIds are kept because they identify the target.
 */
const sanitizeRoute = (url) => {
    if (!url) return null;
    const pathOnly = String(url).split(/[?#]/)[0];
    const redacted = pathOnly
        .split('/')
        .map((seg) => (!OBJECT_ID.test(seg) && TOKEN_SEGMENT.test(seg) ? ':redacted' : seg))
        .join('/');
    return cleanString(redacted, 200);
};

/**
 * Client IP from req.ip only. X-Forwarded-For is honoured only when the operator
 * sets TRUST_PROXY (see index.js), so a client cannot forge the logged address.
 */
const getClientIp = (req) => {
    const raw = req?.ip || req?.socket?.remoteAddress || null;
    if (!raw) return null;
    return cleanString(String(raw).replace(/^::ffff:/, ''), 64);
};

// ── Event construction (§8.3.2) ────────────────────────────────────────────
const DEFAULT_SEVERITY = {
    login_success: 'info',
    login_failure: 'low',
    login_denied: 'low',
    account_locked: 'high',
    rate_limited: 'medium',
    auth_required: 'low',
    access_denied: 'medium',
    upload_rejected: 'low',
    validation_failure: 'low',
    role_changed: 'high',
    account_status_changed: 'medium',
    ngo_verification_changed: 'medium',
    user_removed: 'high',
    admin_action: 'low',
    security_alert_raised: 'high',
    security_alert_acknowledged: 'info',
    log_integrity_check: 'info',
    log_integrity_failed: 'critical'
};

// §8.3.6 – events that indicate guessing / probing and count toward brute-force alerts.
const COUNTED_TYPES = new Set([
    'login_failure',
    'login_denied',
    'account_locked',
    'rate_limited',
    'auth_required',
    'access_denied'
]);

/** A guest with no token (normal browsing) is logged but not counted. */
const countsTowardAlert = (eventType, outcome, reason) =>
    COUNTED_TYPES.has(eventType)
    && outcome !== 'success'
    && !(eventType === 'auth_required' && reason === 'missing_token');

const buildEvent = ({ eventType, outcome, req, user, email, statusCode, reason, details, severity } = {}) => {
    if (!EVENT_TYPES.includes(eventType)) {
        throw new Error(`Unknown security event type: ${cleanString(eventType, 60)}`);
    }
    const actor = user || req?.user || null;
    const rawId = actor ? (actor._id ?? actor.id) : null;
    const userId = rawId ? cleanString(String(rawId), 64) : null;
    const rawEmail = email ?? actor?.email ?? null;
    const userEmail = rawEmail ? cleanString(String(rawEmail).trim().toLowerCase(), 254) : null;
    const cleanReason = cleanString(reason, 120);
    const finalOutcome = OUTCOMES.includes(outcome) ? outcome : 'failure';
    const finalSeverity = SEVERITIES.includes(severity)
        ? severity
        : (eventType === 'auth_required' && cleanReason === 'missing_token' ? 'info' : DEFAULT_SEVERITY[eventType]);

    return {
        timestamp: now(),
        eventType,
        severity: finalSeverity,
        outcome: finalOutcome,
        userId,
        userEmail: userEmail || null,
        userRole: actor?.role ? cleanString(actor.role, 20) : null,
        ip: req ? getClientIp(req) : null,
        userAgent: req ? cleanString(req.headers?.['user-agent'], 300) : null,
        method: req?.method ? cleanString(req.method, 10) : null,
        route: req ? sanitizeRoute(req.originalUrl || req.url) : null,
        statusCode: Number.isInteger(statusCode) ? statusCode : null,
        reason: cleanReason,
        details: sanitizeDetails(details),
        subject: userId ? `user:${userId}` : (userEmail ? `email:${userEmail}` : null),
        countsTowardAlert: countsTowardAlert(eventType, finalOutcome, cleanReason)
    };
};

// ── §8.3.4 Hash chain ──────────────────────────────────────────────────────
const HASHED_FIELDS = [
    'seq', 'timestamp', 'eventType', 'severity', 'outcome',
    'userId', 'userEmail', 'userRole', 'ip', 'userAgent', 'method', 'route',
    'statusCode', 'reason', 'details', 'subject', 'countsTowardAlert',
    'prevHash', 'prevTimestamp'
];

/** Deterministic JSON: object keys sorted at every level, Dates as ISO strings. */
const canonicalJson = (value) => {
    if (value === undefined || value === null) return 'null';
    if (value instanceof Date) return JSON.stringify(value.toISOString());
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
    if (typeof value === 'object') {
        if (typeof value.toHexString === 'function') return JSON.stringify(value.toHexString());
        const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
        return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
    }
    return JSON.stringify(value);
};

/** hash = SHA-256(canonical JSON of every field, including prevHash). */
const computeHash = (record) => {
    const fields = {};
    for (const f of HASHED_FIELDS) fields[f] = record[f] === undefined ? null : record[f];
    return crypto.createHash('sha256').update(canonicalJson(fields)).digest('hex');
};

// ── Serialised writer ──────────────────────────────────────────────────────
// All appends run one at a time through this promise queue so seq/prevHash never race
// inside this process. A second process is handled by the unique seq index + retry.
let tail = Promise.resolve();
const enqueue = (task) => {
    const run = tail.then(task);
    tail = run.catch(() => {});
    return run;
};

/** Resolves once every queued write (including writes queued meanwhile) has finished. */
const flush = async () => {
    let current;
    do {
        current = tail;
        await current;
    } while (current !== tail);
};

const MAX_APPEND_ATTEMPTS = 5;

const appendRecord = async (fields) => {
    for (let attempt = 1; attempt <= MAX_APPEND_ATTEMPTS; attempt++) {
        const last = await SecurityEvent.findOne({})
            .sort({ seq: -1 })
            .select('seq hash timestamp')
            .lean();
        const record = {
            seq: last ? last.seq + 1 : 1,
            ...fields,
            prevHash: last ? last.hash : GENESIS_HASH,
            prevTimestamp: last ? last.timestamp : null
        };
        record.hash = computeHash(record);
        try {
            await SecurityEvent.create(record);
            return record;
        } catch (err) {
            // Another writer took this seq: re-read the tail and try again.
            if (err && err.code === 11000 && attempt < MAX_APPEND_ATTEMPTS) continue;
            throw err;
        }
    }
    throw new Error('Could not append security event');
};

// Optional JSON-lines copy (off-database evidence; see residual risks in TESTING.md).
const DEFAULT_LOG_FILE = path.join(__dirname, '../logs/security-events.log');
const logFilePath = () => {
    const configured = (process.env.SECURITY_LOG_FILE || '').trim();
    if (configured.toLowerCase() === 'off') return null;
    return configured ? path.resolve(configured) : DEFAULT_LOG_FILE;
};
const writeFileCopy = async (record) => {
    const file = logFilePath();
    if (!file) return;
    try {
        await fs.promises.mkdir(path.dirname(file), { recursive: true });
        await fs.promises.appendFile(file, `${JSON.stringify(record)}\n`, 'utf8');
    } catch (err) {
        console.error('[security-log] could not write log file:', err.message);
    }
};

const appendAndCopy = async (fields) => {
    try {
        const record = await appendRecord(fields);
        await writeFileCopy(record);
        return record;
    } catch (err) {
        // Database unavailable: keep the event in the file copy so it is not lost.
        await writeFileCopy({ ...fields, persisted: false, persistError: cleanString(err.message, 200) });
        throw err;
    }
};

// ── §8.3.6 Alerting ────────────────────────────────────────────────────────
const notifyAdmins = async (message) => {
    const admins = await User.find({ role: 'admin', accountStatus: { $ne: 'suspended' } })
        .select('_id')
        .lean();
    if (!admins.length) return;
    await Notification.insertMany(admins.map((admin) => ({
        recipient: admin._id,
        sender: admin._id, // system notification: no human sender
        type: 'security_alert',
        message: cleanString(message, 1000)
    })));
};

/** Log security_alert_raised for each new alert, then send ONE notification per admin. */
const announceAlerts = async (alerts, triggerSeq = null) => {
    for (const alert of alerts) {
        await appendAndCopy(buildEvent({
            eventType: 'security_alert_raised',
            outcome: 'success',
            severity: alert.severity,
            reason: alert.kind,
            details: {
                alertId: String(alert._id),
                kind: alert.kind,
                key: alert.key,
                count: alert.count,
                windowMinutes: alert.windowMinutes,
                triggerSeq
            }
        }));
    }
    const message = alerts.length === 1
        ? `Security alert: ${alerts[0].message}`
        : `Security alerts: ${alerts.map((a) => a.message).join('; ')}`;
    try {
        await notifyAdmins(message);
    } catch (err) {
        console.error('[security-log] could not notify admins:', err.message);
    }
};

const evaluateAlerts = async (record) => {
    const windowMinutes = alertWindowMinutes();
    const threshold = alertThreshold();
    const since = new Date(now().getTime() - windowMinutes * 60 * 1000);

    const checks = [];
    if (record.ip) {
        checks.push({ kind: 'brute_force_ip', key: `ip:${record.ip}`, filter: { ip: record.ip }, label: `IP address ${record.ip}` });
    }
    if (record.subject) {
        checks.push({
            kind: 'brute_force_account',
            key: record.subject,
            filter: { subject: record.subject },
            label: `account ${record.userEmail || record.subject}`
        });
    }

    const raised = [];
    for (const check of checks) {
        const base = { ...check.filter, countsTowardAlert: true, timestamp: { $gte: since } };
        const count = await SecurityEvent.countDocuments(base);
        if (count < threshold) continue;

        const message = `${count} failed or refused authentication attempts for ${check.label} in ${windowMinutes} minutes`;
        const existing = await SecurityAlert.findOne({
            kind: check.kind,
            key: check.key,
            status: 'open',
            lastSeenAt: { $gte: since }
        }).sort({ lastSeenAt: -1 }).lean();

        if (existing) {
            // Same ongoing incident: update it instead of raising a duplicate alert.
            await SecurityAlert.updateOne({ _id: existing._id }, {
                $set: {
                    count: Math.max(count, existing.count || 0),
                    lastSeenAt: record.timestamp,
                    lastEventSeq: record.seq,
                    message
                }
            });
            continue;
        }

        const first = await SecurityEvent.findOne(base).sort({ seq: 1 }).select('seq timestamp').lean();
        raised.push(await SecurityAlert.create({
            kind: check.kind,
            key: check.key,
            severity: 'high',
            message,
            count,
            windowMinutes,
            firstSeenAt: first?.timestamp || record.timestamp,
            lastSeenAt: record.timestamp,
            firstEventSeq: first?.seq ?? record.seq,
            lastEventSeq: record.seq,
            status: 'open'
        }));
    }

    if (raised.length) await announceAlerts(raised, record.seq);
};

const processEvent = async (fields) => {
    const record = await appendAndCopy(fields);
    if (record.countsTowardAlert) {
        try {
            await evaluateAlerts(record);
        } catch (err) {
            console.error('[security-log] alert evaluation failed:', err.message);
        }
    }
    return record;
};

/**
 * Record a security event. Never throws; resolves to the stored record, or null.
 * @param {object} input
 * @param {string} input.eventType - one of SecurityEvent.EVENT_TYPES
 * @param {'success'|'failure'|'denied'} input.outcome
 * @param {import('express').Request} [input.req] - IP, user agent, method and route come from here
 * @param {object} [input.user] - acting user (defaults to req.user)
 * @param {string} [input.email] - attempted email when there is no user
 * @param {number} [input.statusCode]
 * @param {string} [input.reason]
 * @param {object} [input.details] - sanitised before storage
 * @param {string} [input.severity] - overrides the default for the event type
 */
const logSecurityEvent = (input) => {
    let fields;
    try {
        fields = buildEvent(input || {});
    } catch (err) {
        console.error('[security-log] rejected security event:', err.message);
        return Promise.resolve(null);
    }
    return enqueue(() => processEvent(fields)).catch((err) => {
        console.error('[security-log] failed to record security event:', err.message);
        return null;
    });
};

// ── §8.3.4 Verification ────────────────────────────────────────────────────
/**
 * Walk the whole chain in seq order and report problems:
 *   hash_mismatch          – a record was edited
 *   broken_link            – prevHash does not match the previous record (edited + re-hashed)
 *   seq_gap                – records missing in the middle (deleted)
 *   missing_oldest_records – oldest records gone before reaching the retention age
 *   audit_entry_missing / audit_entry_modified – a mirrored AuditLog entry was deleted / changed
 */
const verifyChain = async ({ maxIssues = 100 } = {}) => {
    const issues = [];
    let issueCount = 0;
    const addIssue = (seq, problem, extra = {}) => {
        issueCount += 1;
        if (issues.length < maxIssues) issues.push({ seq, problem, ...extra });
    };

    const retentionCutoff = new Date(now().getTime() - retentionDays() * DAY_MS);
    const auditRefs = new Map();
    let checked = 0;
    let firstSeq = null;
    let lastSeq = null;
    let headHash = null;
    let prev = null;

    const cursor = SecurityEvent.find({}).sort({ seq: 1 }).lean().cursor();
    for await (const rec of cursor) {
        checked += 1;
        if (computeHash(rec) !== rec.hash) addIssue(rec.seq, 'hash_mismatch');

        if (prev === null) {
            firstSeq = rec.seq;
            if (rec.seq === 1) {
                if (rec.prevHash !== GENESIS_HASH) addIssue(rec.seq, 'broken_link');
            } else {
                // Oldest records may only be missing because the retention TTL removed them.
                const prevTs = rec.prevTimestamp ? new Date(rec.prevTimestamp) : null;
                if (!prevTs || prevTs >= retentionCutoff) {
                    addIssue(rec.seq, 'missing_oldest_records', { missing: rec.seq - 1 });
                }
            }
        } else if (rec.seq !== prev.seq + 1) {
            addIssue(rec.seq, 'seq_gap', { missing: rec.seq - prev.seq - 1 });
        } else if (rec.prevHash !== prev.hash) {
            addIssue(rec.seq, 'broken_link');
        }

        if (rec.details && rec.details.auditLogId) {
            auditRefs.set(String(rec.details.auditLogId), { seq: rec.seq, payloadHash: rec.details.payloadHash });
        }
        prev = rec;
        lastSeq = rec.seq;
        headHash = rec.hash;
    }

    // Mirrored audit entries must still exist unchanged.
    const ids = [...auditRefs.keys()].filter((id) => mongoose.isValidObjectId(id));
    for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const found = await AuditLog.find({ _id: { $in: chunk } }).select('_id payloadHash').lean();
        const byId = new Map(found.map((entry) => [String(entry._id), entry]));
        for (const id of chunk) {
            const ref = auditRefs.get(id);
            const entry = byId.get(id);
            if (!entry) addIssue(ref.seq, 'audit_entry_missing', { auditLogId: id });
            else if (entry.payloadHash !== ref.payloadHash) addIssue(ref.seq, 'audit_entry_modified', { auditLogId: id });
        }
    }

    issues.sort((a, b) => a.seq - b.seq);
    return {
        valid: issueCount === 0,
        checked,
        firstSeq,
        lastSeq,
        headHash,
        issueCount,
        issues,
        verifiedAt: now()
    };
};

const INTEGRITY_ALERT_KEY = 'chain:security_events';

const raiseIntegrityAlert = async (result) => {
    const first = result.issues[0];
    const message = `Security log integrity check failed: ${result.issueCount} issue(s)`
        + (first ? `, first at seq ${first.seq} (${first.problem})` : '');
    const at = now();
    const existing = await SecurityAlert.findOne({ key: INTEGRITY_ALERT_KEY, status: 'open' }).lean();
    if (existing) {
        await SecurityAlert.updateOne({ _id: existing._id }, {
            $set: { count: (existing.count || 0) + 1, lastSeenAt: at, message }
        });
        return;
    }
    const alert = await SecurityAlert.create({
        kind: 'log_integrity_failure',
        key: INTEGRITY_ALERT_KEY,
        severity: 'critical',
        message,
        count: 1,
        firstSeenAt: at,
        lastSeenAt: at,
        firstEventSeq: first ? first.seq : null,
        lastEventSeq: result.lastSeq,
        status: 'open'
    });
    await announceAlerts([alert]);
};

/** verifyChain + log the result; a failed check raises a critical alert. */
const verifyAndRecord = async ({ req, user, source = 'api' } = {}) => {
    let result;
    try {
        result = await verifyChain();
    } catch (err) {
        await logSecurityEvent({
            eventType: 'log_integrity_failed',
            outcome: 'failure',
            req,
            user,
            reason: 'verification_error',
            details: { source, error: err.message }
        });
        throw err;
    }

    await logSecurityEvent({
        eventType: result.valid ? 'log_integrity_check' : 'log_integrity_failed',
        outcome: result.valid ? 'success' : 'failure',
        severity: result.valid ? 'info' : 'critical',
        req,
        user,
        reason: result.valid ? 'chain_intact' : 'chain_tampered',
        details: {
            source,
            checked: result.checked,
            firstSeq: result.firstSeq,
            lastSeq: result.lastSeq,
            headHash: result.headHash,
            issueCount: result.issueCount,
            issues: result.issues.slice(0, 10)
        }
    });

    if (!result.valid) {
        await enqueue(() => raiseIntegrityAlert(result)).catch((err) => {
            console.error('[security-log] could not raise integrity alert:', err.message);
        });
    }
    return result;
};

module.exports = {
    logSecurityEvent,
    flush,
    verifyChain,
    verifyAndRecord,
    computeHash,
    canonicalJson,
    sanitizeDetails,
    sanitizeRoute,
    cleanString,
    getClientIp,
    countsTowardAlert,
    alertThreshold,
    alertWindowMinutes,
    retentionDays,
    GENESIS_HASH,
    COUNTED_TYPES,
    _setClock
};
