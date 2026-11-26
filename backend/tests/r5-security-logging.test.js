/**
 * R5 – Insufficient Security Event Logging & Monitoring (OWASP A09:2025, STRIDE: Repudiation).
 * Control C5: security event logging, tamper-evident storage and alerting.
 * Policy: Hive Information Security Policy, Section 8 "Logging and Monitoring Policy".
 *
 * Run: cd backend && npm test
 *
 * Uses Node's built-in test runner. No database is needed: SecurityEvent,
 * SecurityAlert, Notification and AuditLog run on an in-memory fake
 * (tests/helpers/fakeSecurityStore.js), User is stubbed, and the real
 * routes/middleware are mounted on a throwaway Express app.
 */
process.env.JWT_SECRET = 'r5-test-secret';
process.env.JWT_EXPIRE = '1h';
delete process.env.SECURITY_ALERT_THRESHOLD;
delete process.env.SECURITY_ALERT_WINDOW_MINUTES;
delete process.env.SECURITY_LOG_RETENTION_DAYS;

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const SecurityEvent = require('../models/SecurityEvent');
const SecurityAlert = require('../models/SecurityAlert');
const Notification = require('../models/Notification');
const securityLog = require('../utils/securityLog');
const { recordAudit } = require('../utils/auditLog');
const { securityMonitor } = require('../middleware/securityMonitor');
const { createFakeSecurityStore, matches, queryOf } = require('./helpers/fakeSecurityStore');

const { logSecurityEvent, flush, verifyChain, computeHash, GENESIS_HASH } = securityLog;

// ── Test data ────────────────────────────────────────────────────────────
const PASSWORD = 'Correct-Pass1';
const IDS = {
    admin1: 'b00000000000000000000001',
    admin2: 'b00000000000000000000002',
    adminSuspended: 'b00000000000000000000003',
    alex: 'b00000000000000000000004',
    suspended: 'b00000000000000000000005',
    unverified: 'b00000000000000000000006',
    ngoPending: 'b00000000000000000000007',
    ngoVerified: 'b00000000000000000000008'
};

const makeUser = (id, fields) => ({
    _id: id,
    id,
    name: fields.email.split('@')[0],
    accountStatus: 'active',
    verificationStatus: 'verified',
    emailVerified: true,
    matchPassword: async (candidate) => candidate === PASSWORD,
    ...fields
});

const users = {
    [IDS.admin1]: makeUser(IDS.admin1, { email: 'admin1@hive.test', role: 'admin' }),
    [IDS.admin2]: makeUser(IDS.admin2, { email: 'admin2@hive.test', role: 'admin' }),
    [IDS.adminSuspended]: makeUser(IDS.adminSuspended, { email: 'old-admin@hive.test', role: 'admin', accountStatus: 'suspended' }),
    [IDS.alex]: makeUser(IDS.alex, { email: 'alex@volunteer.com', role: 'volunteer' }),
    [IDS.suspended]: makeUser(IDS.suspended, { email: 'banned@volunteer.com', role: 'volunteer', accountStatus: 'suspended' }),
    [IDS.unverified]: makeUser(IDS.unverified, {
        email: 'new@volunteer.com', role: 'volunteer', emailVerified: false, emailVerificationToken: 'abc'
    }),
    [IDS.ngoPending]: makeUser(IDS.ngoPending, { email: 'pending@ngo.org', role: 'ngo', verificationStatus: 'pending' }),
    [IDS.ngoVerified]: makeUser(IDS.ngoVerified, { email: 'save@earth.org', role: 'ngo' })
};
const allUsers = () => Object.values(users);

const tokenFor = (id) => `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}`;

const fake = createFakeSecurityStore();
const events = () => fake.docs('SecurityEvent');
const alerts = () => fake.docs('SecurityAlert');
const notifications = () => fake.docs('Notification');
const ofType = (type) => events().filter((e) => e.eventType === type);
const lastEvent = () => events()[events().length - 1];

/** Let the response 'finish' handler run, then wait for every queued write. */
const settle = async () => {
    await new Promise((r) => setTimeout(r, 15));
    await flush();
};

const fakeReq = (overrides = {}) => ({
    ip: '10.0.0.5',
    method: 'PUT',
    originalUrl: `/api/admin/users/${IDS.alex}/account-status`,
    headers: { 'user-agent': 'r5-test-agent' },
    ...overrides
});

let server;
let baseUrl;
const originals = {};

before(async () => {
    for (const name of ['findById', 'findOne', 'find', 'create']) originals[name] = User[name];
    User.findById = (id) => queryOf(() => allUsers().filter((u) => u._id === String(id)), { single: true });
    User.findOne = (filter) => queryOf(() => allUsers().filter((u) => matches(u, filter)), { single: true });
    User.find = (filter) => queryOf(() => allUsers().filter((u) => matches(u, filter)));
    User.create = async (payload) => ({ _id: 'b000000000000000000000ff', ...payload });

    fake.install([SecurityEvent, SecurityAlert, Notification, AuditLog]);

    const app = express();
    app.use(express.json());
    app.use(securityMonitor);
    app.use('/api/auth', require('../routes/auth'));
    app.use('/api/admin', require('../routes/admin'));
    app.use('/api/impact-posts', require('../routes/impactPosts'));

    await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await flush();
    server?.close();
    for (const [name, fn] of Object.entries(originals)) User[name] = fn;
    fake.restore();
    securityLog._setClock(null);
});

beforeEach(async () => {
    await flush();
    fake.reset();
});

const login = (email, password) => fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'r5-test-agent' },
    body: JSON.stringify({ email, password })
});

const api = (path, { method = 'GET', auth, body } = {}) => fetch(`${baseUrl}${path}`, {
    method,
    headers: {
        ...(auth ? { Authorization: auth } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
});

const failLogins = async (n, emailFor) => {
    for (let i = 0; i < n; i++) await login(emailFor(i), 'wrong-password-1');
    await settle();
};

// ── 1. Authentication events (§8.3.1, §8.3.2) ───────────────────────────
describe('R5: authentication events are logged', () => {
    test('wrong password → login_failure with IP, route, status and user', async () => {
        const res = await login('alex@volunteer.com', 'wrong-password-1');
        assert.equal(res.status, 401);
        await settle();
        const e = lastEvent();
        assert.equal(e.eventType, 'login_failure');
        assert.equal(e.reason, 'wrong_password');
        assert.equal(e.outcome, 'failure');
        assert.equal(e.ip, '127.0.0.1');
        assert.equal(e.method, 'POST');
        assert.equal(e.route, '/api/auth/login');
        assert.equal(e.statusCode, 401);
        assert.equal(e.userId, IDS.alex);
        assert.equal(e.userEmail, 'alex@volunteer.com');
        assert.equal(e.userAgent, 'r5-test-agent');
        assert.equal(e.subject, `user:${IDS.alex}`);
        assert.equal(e.countsTowardAlert, true);
        assert.ok(e.timestamp instanceof Date);
    });

    test('unknown account → login_failure keyed by the attempted email', async () => {
        await login('Nobody@Example.com', 'whatever-1');
        await settle();
        const e = lastEvent();
        assert.equal(e.reason, 'unknown_account');
        assert.equal(e.userId, null);
        assert.equal(e.userEmail, 'nobody@example.com');
        assert.equal(e.subject, 'email:nobody@example.com');
    });

    test('missing credentials → login_failure (400)', async () => {
        const res = await login('alex@volunteer.com', '');
        assert.equal(res.status, 400);
        await settle();
        assert.equal(lastEvent().reason, 'missing_credentials');
        assert.equal(lastEvent().statusCode, 400);
    });

    test('correct password → login_success, not counted', async () => {
        const res = await login('alex@volunteer.com', PASSWORD);
        assert.equal(res.status, 200);
        await settle();
        const e = lastEvent();
        assert.equal(e.eventType, 'login_success');
        assert.equal(e.outcome, 'success');
        assert.equal(e.statusCode, 200);
        assert.equal(e.userRole, 'volunteer');
        assert.equal(e.countsTowardAlert, false);
    });

    for (const [email, reason] of [
        ['banned@volunteer.com', 'account_suspended'],
        ['new@volunteer.com', 'email_not_verified'],
        ['pending@ngo.org', 'ngo_pending_verification']
    ]) {
        test(`login_denied: ${reason}`, async () => {
            const res = await login(email, PASSWORD);
            assert.equal(res.status, 403);
            await settle();
            const e = lastEvent();
            assert.equal(e.eventType, 'login_denied');
            assert.equal(e.reason, reason);
            assert.equal(e.outcome, 'denied');
            assert.equal(e.statusCode, 403);
        });
    }

    test('password and forged token never appear in the log (§8.3.3)', async () => {
        const secretPassword = 'Sup3r-Secret-Pa55!';
        const forged = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImZvcmdlZCJ9.forged-signature-value';
        await login('alex@volunteer.com', secretPassword);
        await api('/api/admin/stats', { auth: `Bearer ${forged}` });
        await settle();
        const dump = JSON.stringify(events());
        assert.ok(!dump.includes(secretPassword));
        assert.ok(!dump.includes(forged));
        assert.ok(!dump.includes('forged-signature-value'));
        assert.ok(!dump.toLowerCase().includes('bearer'));
    });

    test('missing token is logged but not counted; forged/expired tokens are counted', async () => {
        await api('/api/admin/stats');
        await api('/api/admin/stats', { auth: 'Bearer not-a-real-token' });
        const expired = jwt.sign({ id: IDS.alex, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);
        await api('/api/admin/stats', { auth: `Bearer ${expired}` });
        await settle();
        const [missing, invalid, exp] = ofType('auth_required');
        assert.equal(missing.reason, 'missing_token');
        assert.equal(missing.countsTowardAlert, false);
        assert.equal(missing.severity, 'info');
        assert.equal(invalid.reason, 'invalid_token');
        assert.equal(invalid.countsTowardAlert, true);
        assert.equal(exp.reason, 'expired_token');
        assert.equal(exp.countsTowardAlert, true);
    });

    test('403 role refusal is logged with the required roles', async () => {
        const res = await api('/api/admin/stats', { auth: tokenFor(IDS.alex) });
        assert.equal(res.status, 403);
        await settle();
        const e = lastEvent();
        assert.equal(e.eventType, 'access_denied');
        assert.equal(e.reason, 'role_not_permitted');
        assert.deepEqual(e.details.requiredRoles, ['admin']);
        assert.equal(e.userId, IDS.alex);
        assert.equal(e.countsTowardAlert, true);
    });

    test('admin self-registration attempt is logged (severity high)', async () => {
        const res = await api('/api/auth/register', {
            method: 'POST',
            body: { name: 'Mallory', email: 'mallory@example.com', password: 'abcdefg1', role: 'admin' }
        });
        assert.equal(res.status, 201);
        await settle();
        const e = lastEvent();
        assert.equal(e.eventType, 'access_denied');
        assert.equal(e.reason, 'admin_self_registration_blocked');
        assert.equal(e.severity, 'high');
        assert.equal(e.userEmail, 'mallory@example.com');
        assert.equal(e.details.assignedRole, 'volunteer');
    });

    test('log injection: newlines in the attempted email are stripped (CWE-117)', async () => {
        await login('evil@example.com\n2026-01-01 login_success admin', 'x1');
        await settle();
        assert.ok(!/[\r\n]/.test(lastEvent().userEmail));
    });
});

// ── 2. Upload rejections (§8.3.1) ────────────────────────────────────────
describe('R5: rejected uploads are logged', () => {
    const registerNgo = (contents, type, fileName = 'doc.pdf') => {
        const form = new FormData();
        form.append('name', 'Test NGO');
        form.append('email', 'r5-ngo@example.invalid');
        form.append('password', 'abcdefg1');
        form.append('role', 'ngo');
        form.append('verificationDocument', new Blob([contents], { type }), fileName);
        return fetch(`${baseUrl}/api/auth/register`, { method: 'POST', body: form });
    };

    test('fake PDF (HTML content) → upload_rejected content_signature_mismatch', async () => {
        const res = await registerNgo('<html>evil</html>', 'application/pdf');
        assert.equal(res.status, 400);
        await settle();
        const e = lastEvent();
        assert.equal(e.eventType, 'upload_rejected');
        assert.equal(e.reason, 'content_signature_mismatch');
        assert.equal(e.statusCode, 400);
        assert.equal(e.route, '/api/auth/register');
    });

    test('wrong file type → upload_rejected invalid_file_type', async () => {
        const res = await registerNgo('%PDF-1.4', 'text/html', 'page.html');
        assert.equal(res.status, 400);
        await settle();
        const e = lastEvent();
        assert.equal(e.eventType, 'upload_rejected');
        assert.equal(e.reason, 'invalid_file_type');
        assert.equal(e.details.declaredMimetype, 'text/html');
    });

    test('non-image impact photo → JSON 400 + upload_rejected', async () => {
        const form = new FormData();
        form.append('photos', new Blob(['not an image'], { type: 'text/plain' }), 'notes.txt');
        const res = await fetch(`${baseUrl}/api/impact-posts/upload-photos`, {
            method: 'POST',
            headers: { Authorization: tokenFor(IDS.ngoVerified) },
            body: form
        });
        assert.equal(res.status, 400);
        assert.match(res.headers.get('content-type'), /application\/json/);
        assert.equal((await res.json()).success, false);
        await settle();
        const e = lastEvent();
        assert.equal(e.eventType, 'upload_rejected');
        assert.equal(e.reason, 'invalid_file_type');
        assert.equal(e.userId, IDS.ngoVerified);
    });
});

// ── 3. Alerting (§8.3.6) ─────────────────────────────────────────────────
describe('R5: brute-force alerting', () => {
    test('12 failures for one account → exactly one account alert, one notification per admin', async () => {
        await failLogins(12, () => 'alex@volunteer.com');
        const accountAlerts = alerts().filter((a) => a.kind === 'brute_force_account');
        assert.equal(accountAlerts.length, 1);
        assert.equal(accountAlerts[0].key, `user:${IDS.alex}`);
        assert.equal(accountAlerts[0].count, 12);
        assert.equal(accountAlerts[0].status, 'open');
        assert.equal(accountAlerts[0].firstEventSeq, 1);

        // Active admins only, one notification each, even though the IP alert opened too.
        const recipients = notifications().map((n) => String(n.recipient)).sort();
        assert.deepEqual(recipients, [IDS.admin1, IDS.admin2]);
        assert.ok(notifications().every((n) => n.type === 'security_alert'));
        assert.ok(ofType('security_alert_raised').length >= 1);
    });

    test('10 failures from one IP across different accounts → IP alert', async () => {
        await failLogins(10, (i) => `user${i}@example.com`);
        const ipAlerts = alerts().filter((a) => a.kind === 'brute_force_ip');
        assert.equal(ipAlerts.length, 1);
        assert.equal(ipAlerts[0].key, 'ip:127.0.0.1');
        assert.equal(alerts().filter((a) => a.kind === 'brute_force_account').length, 0);
    });

    test('9 failures → no alert', async () => {
        await failLogins(9, () => 'alex@volunteer.com');
        assert.equal(alerts().length, 0);
        assert.equal(notifications().length, 0);
    });

    test('failures older than the 5-minute window do not count', async () => {
        const old = new Date(Date.now() - 6 * 60 * 1000);
        for (let i = 0; i < 9; i++) {
            events().push({
                seq: i + 1, timestamp: old, eventType: 'login_failure', outcome: 'failure', severity: 'low',
                ip: '127.0.0.1', subject: `user:${IDS.alex}`, countsTowardAlert: true, prevHash: 'x', hash: `old${i}`
            });
        }
        await failLogins(2, () => 'alex@volunteer.com');
        assert.equal(alerts().length, 0);
    });

    test('15 guest requests without a token → no alert', async () => {
        for (let i = 0; i < 15; i++) await api('/api/impact-posts');
        await settle();
        assert.equal(ofType('auth_required').length, 15);
        assert.equal(alerts().length, 0);
    });
});

// ── 4. Hash chain (§8.3.4) ───────────────────────────────────────────────
describe('R5: tamper-evident hash chain', () => {
    const writeEvents = async (n) => {
        for (let i = 0; i < n; i++) {
            logSecurityEvent({ eventType: 'admin_action', outcome: 'success', req: fakeReq(), reason: `step_${i}` });
        }
        await flush();
    };

    test('an untouched chain verifies as valid', async () => {
        await writeEvents(5);
        const result = await verifyChain();
        assert.equal(result.valid, true);
        assert.equal(result.checked, 5);
        assert.equal(result.firstSeq, 1);
        assert.equal(result.lastSeq, 5);
        assert.equal(events()[0].prevHash, GENESIS_HASH);
        assert.equal(result.headHash, events()[4].hash);
        assert.match(result.headHash, /^[a-f0-9]{64}$/);
    });

    test('an edited record is detected (hash_mismatch)', async () => {
        await writeEvents(5);
        events()[2].reason = 'nothing_to_see_here';
        const result = await verifyChain();
        assert.equal(result.valid, false);
        assert.deepEqual(result.issues, [{ seq: 3, problem: 'hash_mismatch' }]);
    });

    test('an edit with a recomputed hash breaks the next link', async () => {
        await writeEvents(5);
        events()[2].userEmail = 'someone-else@example.com';
        events()[2].hash = computeHash(events()[2]);
        const result = await verifyChain();
        assert.equal(result.valid, false);
        assert.deepEqual(result.issues, [{ seq: 4, problem: 'broken_link' }]);
    });

    test('a deleted record is detected (seq_gap)', async () => {
        await writeEvents(5);
        events().splice(2, 1);
        const result = await verifyChain();
        assert.equal(result.valid, false);
        assert.deepEqual(result.issues, [{ seq: 4, problem: 'seq_gap', missing: 1 }]);
    });

    test('deleted oldest records (younger than retention) are detected', async () => {
        await writeEvents(5);
        events().splice(0, 2);
        const result = await verifyChain();
        assert.equal(result.valid, false);
        assert.deepEqual(result.issues, [{ seq: 3, problem: 'missing_oldest_records', missing: 2 }]);
    });

    test('oldest records removed after the retention period are accepted', async () => {
        securityLog._setClock(() => new Date(Date.now() - 500 * 24 * 60 * 60 * 1000));
        await writeEvents(2);
        securityLog._setClock(null);
        await writeEvents(2);
        events().splice(0, 2); // what the TTL index would do
        const result = await verifyChain();
        assert.equal(result.valid, true);
        assert.equal(result.firstSeq, 3);
    });

    test('25 concurrent events → contiguous seq and a valid chain', async () => {
        await Promise.all(Array.from({ length: 25 }, (_, i) =>
            logSecurityEvent({ eventType: 'access_denied', outcome: 'denied', req: fakeReq({ ip: `10.1.0.${i}` }), reason: 'concurrent' })));
        await flush();
        assert.deepEqual(events().map((e) => e.seq), Array.from({ length: 25 }, (_, i) => i + 1));
        assert.equal((await verifyChain()).valid, true);
    });

    test('a duplicate seq (another writer) is retried by re-reading the tail', async () => {
        const realCreate = SecurityEvent.create;
        let calls = 0;
        SecurityEvent.create = async (doc) => {
            calls += 1;
            if (calls === 1) {
                // Another process appends seq 1 first.
                await realCreate({ ...doc, reason: 'other_process', hash: computeHash({ ...doc, reason: 'other_process' }) });
                const err = new Error('E11000 duplicate key');
                err.code = 11000;
                throw err;
            }
            return realCreate(doc);
        };
        try {
            const stored = await logSecurityEvent({ eventType: 'admin_action', outcome: 'success', reason: 'mine' });
            assert.equal(stored.seq, 2);
            assert.equal(stored.prevHash, events()[0].hash);
        } finally {
            SecurityEvent.create = realCreate;
        }
        assert.equal((await verifyChain()).valid, true);
    });

    test('the audit log is mirrored; deleting or editing a mirrored audit entry is detected', async () => {
        const admin = users[IDS.admin1];
        await recordAudit({
            actor: admin, action: 'user_suspended', targetType: 'user', targetId: IDS.alex,
            payload: { userId: IDS.alex, newStatus: 'suspended' }, req: fakeReq()
        });
        await recordAudit({
            actor: admin, action: 'ngo_status_changed', targetType: 'user', targetId: IDS.ngoPending,
            payload: { ngoId: IDS.ngoPending, newStatus: 'verified' }, req: fakeReq()
        });
        await recordAudit({
            actor: admin, action: 'event_deleted', targetType: 'event', targetId: IDS.alex,
            payload: { eventId: IDS.alex }, req: fakeReq()
        });
        await flush();

        assert.deepEqual(events().map((e) => e.eventType), ['account_status_changed', 'ngo_verification_changed', 'admin_action']);
        const audits = fake.docs('AuditLog');
        const mirrored = events()[0];
        assert.equal(mirrored.details.auditLogId, String(audits[0]._id));
        assert.equal(mirrored.details.payloadHash, audits[0].payloadHash);
        assert.equal(mirrored.userId, IDS.admin1);
        assert.equal(mirrored.ip, '10.0.0.5');
        assert.equal((await verifyChain()).valid, true);

        audits[1].payloadHash = 'f'.repeat(64);
        audits.splice(0, 1);
        const result = await verifyChain();
        assert.equal(result.valid, false);
        assert.deepEqual(result.issues.map((i) => [i.seq, i.problem]), [
            [1, 'audit_entry_missing'],
            [2, 'audit_entry_modified']
        ]);
    });
});

// ── 5. Append-only storage and retention (§8.3.5, §8.3.8) ───────────────
describe('R5: append-only storage and retention', () => {
    const expectRefused = (promiseFactory) => assert.rejects(promiseFactory, (err) => {
        assert.equal(err.code, 'SECURITY_LOG_APPEND_ONLY');
        return true;
    });

    const operations = {
        updateOne: () => SecurityEvent.updateOne({ seq: 1 }, { $set: { reason: 'x' } }),
        updateMany: () => SecurityEvent.updateMany({}, { $set: { reason: 'x' } }),
        replaceOne: () => SecurityEvent.replaceOne({ seq: 1 }, { seq: 1 }),
        findOneAndUpdate: () => SecurityEvent.findOneAndUpdate({ seq: 1 }, { $set: { reason: 'x' } }),
        findOneAndReplace: () => SecurityEvent.findOneAndReplace({ seq: 1 }, { seq: 1 }),
        findOneAndDelete: () => SecurityEvent.findOneAndDelete({ seq: 1 }),
        deleteOne: () => SecurityEvent.deleteOne({ seq: 1 }),
        deleteMany: () => SecurityEvent.deleteMany({}),
        bulkWrite: () => SecurityEvent.bulkWrite([{ deleteOne: { filter: { seq: 1 } } }])
    };
    for (const [name, run] of Object.entries(operations)) {
        test(`${name} is refused`, () => expectRefused(run));
    }

    const storedEvent = () => SecurityEvent.hydrate({
        _id: '665f00000000000000000001',
        seq: 1, timestamp: new Date(), eventType: 'login_failure', severity: 'low', outcome: 'failure',
        prevHash: GENESIS_HASH, hash: 'a'.repeat(64)
    });

    test('re-saving an existing event is refused', () => {
        const doc = storedEvent();
        doc.reason = 'edited';
        return expectRefused(() => doc.save());
    });

    test('deleting a loaded event document is refused', () => expectRefused(() => storedEvent().deleteOne()));

    test('TTL retention index is at least 365 days', () => {
        const ttl = SecurityEvent.schema.indexes().find(([, opts]) => opts.name === 'retention_ttl');
        assert.ok(ttl, 'retention_ttl index exists');
        assert.deepEqual(ttl[0], { timestamp: 1 });
        assert.ok(ttl[1].expireAfterSeconds >= 365 * 24 * 60 * 60);
    });

    test('SECURITY_LOG_RETENTION_DAYS can never go below 365 (default 400)', () => {
        const saved = process.env.SECURITY_LOG_RETENTION_DAYS;
        try {
            delete process.env.SECURITY_LOG_RETENTION_DAYS;
            assert.equal(SecurityEvent.retentionDays(), 400);
            process.env.SECURITY_LOG_RETENTION_DAYS = '30';
            assert.equal(SecurityEvent.retentionDays(), 365);
            process.env.SECURITY_LOG_RETENTION_DAYS = '730';
            assert.equal(SecurityEvent.retentionDays(), 730);
        } finally {
            if (saved === undefined) delete process.env.SECURITY_LOG_RETENTION_DAYS;
            else process.env.SECURITY_LOG_RETENTION_DAYS = saved;
        }
    });
});

// ── 6. Admin API (§8.3.6, §8.3.7) ────────────────────────────────────────
describe('R5: admin security API', () => {
    const admin = tokenFor(IDS.admin1);

    test('a volunteer gets 403 and the refusal is logged', async () => {
        const res = await api('/api/admin/security-events', { auth: tokenFor(IDS.alex) });
        assert.equal(res.status, 403);
        await settle();
        const e = lastEvent();
        assert.equal(e.eventType, 'access_denied');
        assert.equal(e.route, '/api/admin/security-events');
        assert.equal(e.userId, IDS.alex);
    });

    test('events can be filtered by type, outcome, ip and email', async () => {
        await login('alex@volunteer.com', PASSWORD);
        await login('alex@volunteer.com', 'wrong-password-1');
        await login('nobody@example.com', 'wrong-password-1');
        await settle();

        const byType = await (await api('/api/admin/security-events?type=login_failure', { auth: admin })).json();
        assert.equal(byType.count, 2);
        assert.ok(byType.data.every((e) => e.eventType === 'login_failure'));
        assert.ok(byType.data[0].seq > byType.data[1].seq, 'newest first');

        const byOutcome = await (await api('/api/admin/security-events?outcome=success', { auth: admin })).json();
        assert.ok(byOutcome.data.length >= 1 && byOutcome.data.every((e) => e.outcome === 'success'));

        const byEmail = await (await api('/api/admin/security-events?email=ALEX@', { auth: admin })).json();
        assert.ok(byEmail.data.length >= 2 && byEmail.data.every((e) => e.userEmail === 'alex@volunteer.com'));

        const regexAttempt = await (await api('/api/admin/security-events?email=.*', { auth: admin })).json();
        assert.equal(regexAttempt.count, 0, 'email filter is escaped, not a regex');

        const byIp = await (await api('/api/admin/security-events?ip=127.0.0.1&limit=2', { auth: admin })).json();
        assert.equal(byIp.count, 2);
        assert.equal(byIp.nextBefore, byIp.data[1].seq);
        const page2 = await (await api(`/api/admin/security-events?before=${byIp.nextBefore}`, { auth: admin })).json();
        assert.ok(page2.data.every((e) => e.seq < byIp.nextBefore));
    });

    for (const query of ['type=bogus', 'outcome=maybe', 'type=login_failure&type=login_success', 'before=abc', 'limit=ten']) {
        test(`bad query "${query}" → 400`, async () => {
            const res = await api(`/api/admin/security-events?${query}`, { auth: admin });
            assert.equal(res.status, 400);
        });
    }

    test('summary reports 24h counts, open alerts, totals and retention', async () => {
        await failLogins(3, () => 'alex@volunteer.com');
        await login('alex@volunteer.com', PASSWORD);
        await settle();
        const total = events().length;
        const { data } = await (await api('/api/admin/security-events/summary', { auth: admin })).json();
        assert.equal(data.last24h.login_failure, 3);
        assert.equal(data.last24h.login_success, 1);
        assert.equal(data.openAlerts, 0);
        assert.equal(data.totalEvents, total);
        assert.equal(data.retentionDays, 400);
        assert.equal(data.lastIntegrityCheck, null);
    });

    test('verify: intact chain → valid and the check is logged', async () => {
        await failLogins(2, () => 'alex@volunteer.com');
        const res = await api('/api/admin/security-events/verify', { method: 'POST', auth: admin });
        assert.equal(res.status, 200);
        const { data } = await res.json();
        assert.equal(data.valid, true);
        assert.equal(data.checked, 2);
        await settle();
        const e = lastEvent();
        assert.equal(e.eventType, 'log_integrity_check');
        assert.equal(e.userId, IDS.admin1);
        assert.equal(e.details.headHash, data.headHash);
    });

    test('verify: tampered chain → invalid, critical alert and admin notifications', async () => {
        await failLogins(3, () => 'alex@volunteer.com');
        events()[1].reason = 'tampered';
        const { data } = await (await api('/api/admin/security-events/verify', { method: 'POST', auth: admin })).json();
        assert.equal(data.valid, false);
        assert.deepEqual(data.issues, [{ seq: 2, problem: 'hash_mismatch' }]);
        await settle();

        assert.ok(ofType('log_integrity_failed').length === 1);
        const integrity = alerts().filter((a) => a.kind === 'log_integrity_failure');
        assert.equal(integrity.length, 1);
        assert.equal(integrity[0].severity, 'critical');
        assert.equal(notifications().length, 2);

        const { data: summary } = await (await api('/api/admin/security-events/summary', { auth: admin })).json();
        assert.equal(summary.lastIntegrityCheck.valid, false);
        assert.equal(summary.openAlerts, 1);
    });

    test('acknowledge records the reviewer; a second acknowledge → 400', async () => {
        await failLogins(10, () => 'alex@volunteer.com');
        const list = await (await api('/api/admin/security-alerts?status=open', { auth: admin })).json();
        assert.ok(list.count >= 1);
        const alertId = list.data[0]._id;

        const res = await api(`/api/admin/security-alerts/${alertId}/acknowledge`, {
            method: 'PUT', auth: admin, body: { note: 'Checked: test traffic\nfrom CI' }
        });
        assert.equal(res.status, 200);
        const { data } = await res.json();
        assert.equal(data.status, 'acknowledged');
        assert.equal(String(data.acknowledgedBy), IDS.admin1);
        assert.equal(data.acknowledgedByName, 'admin1');
        assert.ok(data.acknowledgedAt);
        await settle();

        const e = ofType('security_alert_acknowledged')[0];
        assert.equal(e.details.alertId, alertId);
        assert.equal(typeof e.details.minutesOpen, 'number');
        assert.equal(e.details.withinReviewTarget, true);
        assert.ok(!/\n/.test(e.details.note));

        const again = await api(`/api/admin/security-alerts/${alertId}/acknowledge`, { method: 'PUT', auth: admin, body: {} });
        assert.equal(again.status, 400);

        const missing = await api('/api/admin/security-alerts/not-an-id/acknowledge', { method: 'PUT', auth: admin, body: {} });
        assert.equal(missing.status, 404);

        const ackList = await (await api('/api/admin/security-alerts?status=acknowledged', { auth: admin })).json();
        assert.ok(ackList.data.some((a) => String(a._id) === alertId));
    });

    test('there are no routes to edit or delete security events', async () => {
        for (const [method, path] of [
            ['DELETE', '/api/admin/security-events/1'],
            ['PUT', '/api/admin/security-events/1'],
            ['DELETE', '/api/admin/security-events'],
            ['PATCH', '/api/admin/security-events/1'],
            ['DELETE', '/api/admin/security-alerts/665f00000000000000000001']
        ]) {
            const res = await api(path, { method, auth: admin, body: method === 'DELETE' ? undefined : {} });
            assert.equal(res.status, 404, `${method} ${path}`);
        }
    });
});

// ── 7. Sanitiser (§8.3.3) ────────────────────────────────────────────────
describe('R5: sanitiser', () => {
    const { sanitizeDetails, sanitizeRoute, cleanString, getClientIp } = securityLog;

    test('drops secrets, strips control characters and replaces $ / . in keys', () => {
        const out = sanitizeDetails({
            password: 'p', newPassword: 'p', accessToken: 't', Authorization: 'Bearer x', cookie: 'c',
            jwt: 'j', sessionId: 's', apiSecret: 's', verificationDocument: 'd.pdf',
            note: 'line1\nline2\r\nFAKE ENTRY\u0000',
            nested: { refreshToken: 'r', ok: 1 },
            $where: 'sleep(1)',
            'profile.email': 'a@b.c'
        });
        assert.deepEqual(Object.keys(out).sort(), ['_where', 'nested', 'note', 'profile_email']);
        assert.equal(out.note, 'line1line2FAKE ENTRY');
        assert.deepEqual(out.nested, { ok: 1 });
    });

    test('caps string length and nesting depth', () => {
        assert.ok(cleanString('x'.repeat(5000)).length <= 501);
        const deep = sanitizeDetails({ a: { b: { c: { d: { e: 'too deep' } } } } });
        assert.equal(deep.a.b.c.d, '[truncated]');
    });

    test('routes: query strings removed, tokens redacted, ObjectIds kept', () => {
        const token = 'a1b2c3d4'.repeat(5); // 40-char email verification token
        assert.equal(sanitizeRoute(`/api/auth/verify-email/${token}?utm=x`), '/api/auth/verify-email/:redacted');
        assert.equal(sanitizeRoute('/api/admin/ngos/665f1c2b3a4d5e6f70819203/document?download=1'),
            '/api/admin/ngos/665f1c2b3a4d5e6f70819203/document');
        assert.equal(sanitizeRoute('/api/events?search=%0d%0a'), '/api/events');
    });

    test('client IP comes from req.ip only (X-Forwarded-For is ignored)', () => {
        const req = { ip: '::ffff:192.0.2.10', headers: { 'x-forwarded-for': '1.2.3.4' } };
        assert.equal(getClientIp(req), '192.0.2.10');
    });

    test('unknown event types are rejected without throwing', async () => {
        const result = await logSecurityEvent({ eventType: 'made_up', outcome: 'success' });
        assert.equal(result, null);
        assert.equal(events().length, 0);
    });
});
