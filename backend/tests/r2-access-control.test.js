/**
 * R2 – Unauthorized NGO Document Disclosure (Access Control) tests.
 *
 * Run: cd backend && npm test
 *
 * Uses Node's built-in test runner. No database is needed: the User and
 * AuditLog models are stubbed, and the real routes/middleware are mounted on
 * a throwaway Express app.
 */
process.env.JWT_SECRET = 'r2-test-secret';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const SecurityEvent = require('../models/SecurityEvent');
const SecurityAlert = require('../models/SecurityAlert');
const Notification = require('../models/Notification');
const { flush: flushSecurityLog } = require('../utils/securityLog');
const { createFakeSecurityStore } = require('./helpers/fakeSecurityStore');
const upload = require('../middleware/upload');
const {
    NGO_DOCS_DIR,
    resolveNgoDocumentPath,
    hasPdfSignature
} = require('../utils/ngoDocuments');

// ── Test data ────────────────────────────────────────────────────────────
const IDS = {
    admin: 'a00000000000000000000001',
    ngo: 'a00000000000000000000002',
    volunteer: 'a00000000000000000000003',
    ngoNoFile: 'a00000000000000000000004'
};
const TEST_DOC = `r2-test-${Date.now()}.pdf`;
const TMP_DIR = fs.mkdtempSync(path.join(require('os').tmpdir(), 'hive-r2-'));

const users = {
    [IDS.admin]: { _id: IDS.admin, id: IDS.admin, name: 'Admin', role: 'admin', accountStatus: 'active' },
    [IDS.ngo]: { _id: IDS.ngo, id: IDS.ngo, name: 'Save Earth', role: 'ngo', accountStatus: 'active', verificationDocument: TEST_DOC },
    [IDS.volunteer]: { _id: IDS.volunteer, id: IDS.volunteer, name: 'Alex', role: 'volunteer', accountStatus: 'active' },
    [IDS.ngoNoFile]: { _id: IDS.ngoNoFile, id: IDS.ngoNoFile, name: 'Ghost NGO', role: 'ngo', accountStatus: 'active', verificationDocument: 'missing.pdf' }
};

const auditEntries = [];
const tokenFor = (id) => `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}`;
const countPrivateFiles = () => fs.readdirSync(NGO_DOCS_DIR).length;

/** Mimic a Mongoose query: awaitable and supports .select(). */
const fakeQuery = (value) => ({
    select: () => Promise.resolve(value),
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject)
});

let server;
let baseUrl;
const originals = {};
// R5: recordAudit mirrors into the security log; keep that in memory too.
const securityStore = createFakeSecurityStore();

before(async () => {
    fs.writeFileSync(path.join(NGO_DOCS_DIR, TEST_DOC), '%PDF-1.4 r2 test document');

    originals.findById = User.findById;
    originals.findOne = User.findOne;
    originals.auditCreate = AuditLog.create;
    User.findById = (id) => fakeQuery(users[String(id)] || null);
    User.findOne = () => fakeQuery({ _id: IDS.ngo }); // every email "already exists"
    AuditLog.create = async (entry) => { auditEntries.push(entry); return entry; };
    securityStore.install([SecurityEvent, SecurityAlert, Notification]);

    const app = express();
    app.use(express.json());
    app.use('/api/auth', require('../routes/auth'));
    app.use('/api/admin', require('../routes/admin'));
    app.use('/uploads', require('../middleware/publicUploads'));

    await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await flushSecurityLog();
    securityStore.restore();
    server?.close();
    User.findById = originals.findById;
    User.findOne = originals.findOne;
    AuditLog.create = originals.auditCreate;
    fs.rmSync(path.join(NGO_DOCS_DIR, TEST_DOC), { force: true });
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

const getDocument = (ngoId, auth) =>
    fetch(`${baseUrl}/api/admin/ngos/${ngoId}/document`, {
        headers: auth ? { Authorization: auth } : {}
    });

const registerNgo = (contents, type, fileName = 'doc.pdf') => {
    const form = new FormData();
    form.append('name', 'Test NGO');
    form.append('email', 'r2-test@example.invalid');
    form.append('password', 'abcdefg1');
    form.append('role', 'ngo');
    form.append('verificationDocument', new Blob([contents], { type }), fileName);
    return fetch(`${baseUrl}/api/auth/register`, { method: 'POST', body: form });
};

// ── 1. Public exposure removed ───────────────────────────────────────────
describe('R2: no public access to NGO documents', () => {
    test('a document in private storage is not reachable by URL', async () => {
        const res = await fetch(`${baseUrl}/uploads/${TEST_DOC}`);
        assert.equal(res.status, 404);
    });

    test('old-style public path /uploads/<file>.pdf returns 404', async () => {
        const res = await fetch(`${baseUrl}/uploads/seed-demo-ngo.pdf`);
        assert.equal(res.status, 404);
    });

    test('private folder is outside the public static folder', () => {
        const publicDir = path.resolve(__dirname, '../uploads');
        assert.ok(!path.resolve(NGO_DOCS_DIR).startsWith(publicDir));
    });
});

// ── 2. Admin-only document route ─────────────────────────────────────────
describe('R2: GET /api/admin/ngos/:id/document', () => {
    test('no token → 401', async () => {
        const res = await getDocument(IDS.ngo);
        assert.equal(res.status, 401);
    });

    test('invalid token → 401', async () => {
        const res = await getDocument(IDS.ngo, 'Bearer not-a-real-token');
        assert.equal(res.status, 401);
    });

    test('NGO user (even the owner) → 403', async () => {
        const res = await getDocument(IDS.ngo, tokenFor(IDS.ngo));
        assert.equal(res.status, 403);
    });

    test('volunteer → 403', async () => {
        const res = await getDocument(IDS.ngo, tokenFor(IDS.volunteer));
        assert.equal(res.status, 403);
    });

    test('admin → 200 with the PDF and safe headers', async () => {
        const res = await getDocument(IDS.ngo, tokenFor(IDS.admin));
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('content-type'), 'application/pdf');
        assert.equal(res.headers.get('cache-control'), 'no-store');
        assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
        const body = Buffer.from(await res.arrayBuffer()).toString('ascii');
        assert.ok(body.startsWith('%PDF-'));
    });

    test('admin view is written to the audit log', async () => {
        auditEntries.length = 0;
        await getDocument(IDS.ngo, tokenFor(IDS.admin));
        assert.equal(auditEntries.length, 1);
        assert.equal(auditEntries[0].action, 'ngo_document_viewed');
        assert.equal(auditEntries[0].actorRole, 'admin');
        assert.equal(String(auditEntries[0].targetId), IDS.ngo);
    });

    test('non-NGO account id → 404', async () => {
        const res = await getDocument(IDS.volunteer, tokenFor(IDS.admin));
        assert.equal(res.status, 404);
    });

    test('NGO whose file is missing → 404', async () => {
        const res = await getDocument(IDS.ngoNoFile, tokenFor(IDS.admin));
        assert.equal(res.status, 404);
    });

    test('unknown id → 404', async () => {
        const res = await getDocument('a0000000000000000000ffff', tokenFor(IDS.admin));
        assert.equal(res.status, 404);
    });
});

// ── 3. Path traversal protection ─────────────────────────────────────────
describe('R2: stored path cannot escape private storage', () => {
    for (const ref of ['../../.env', '../index.js', '/etc/passwd', '..\\..\\.env', '', null, 42]) {
        test(`rejects ${JSON.stringify(ref)}`, () => {
            assert.equal(resolveNgoDocumentPath(ref), null);
        });
    }

    test('resolves a real document by file name', () => {
        assert.equal(resolveNgoDocumentPath(TEST_DOC), path.join(NGO_DOCS_DIR, TEST_DOC));
    });
});

// ── 4. Upload validation ─────────────────────────────────────────────────
describe('R2: upload validation', () => {
    const runFilter = (file) => new Promise((resolve) => {
        upload.fileFilter({}, file, (err, ok) => resolve({ err, ok }));
    });

    test('accepts application/pdf with .pdf extension', async () => {
        const { err, ok } = await runFilter({ originalname: 'cert.PDF', mimetype: 'application/pdf' });
        assert.equal(err, null);
        assert.equal(ok, true);
    });

    test('rejects HTML mime type', async () => {
        const { err } = await runFilter({ originalname: 'cert.pdf', mimetype: 'text/html' });
        assert.ok(err);
    });

    test('rejects .exe with a faked PDF mime type', async () => {
        const { err } = await runFilter({ originalname: 'malware.exe', mimetype: 'application/pdf' });
        assert.ok(err);
    });

    test('PDF signature check', () => {
        const good = path.join(TMP_DIR, 'good.pdf');
        const bad = path.join(TMP_DIR, 'bad.pdf');
        fs.writeFileSync(good, '%PDF-1.7 content');
        fs.writeFileSync(bad, '<html><script>alert(1)</script></html>');
        assert.equal(hasPdfSignature(good), true);
        assert.equal(hasPdfSignature(bad), false);
        assert.equal(hasPdfSignature(path.join(TMP_DIR, 'nope.pdf')), false);
    });

    test('register: HTML disguised as PDF → 400 and file deleted', async () => {
        const before = countPrivateFiles();
        const res = await registerNgo('<html>evil</html>', 'application/pdf');
        const data = await res.json();
        assert.equal(res.status, 400);
        assert.match(data.error, /not a valid PDF/);
        assert.equal(countPrivateFiles(), before);
    });

    test('register: wrong mime type → 400 JSON error', async () => {
        const res = await registerNgo('%PDF-1.4', 'text/html');
        assert.equal(res.status, 400);
        assert.equal((await res.json()).success, false);
    });

    test('register: file over 5MB → 400', async () => {
        const big = Buffer.alloc(5 * 1024 * 1024 + 1, 0x20);
        big.write('%PDF-1.4');
        const res = await registerNgo(big, 'application/pdf');
        assert.equal(res.status, 400);
        assert.match((await res.json()).error, /5MB/);
    });

    test('register: valid PDF but registration fails → no orphan file', async () => {
        const before = countPrivateFiles();
        const res = await registerNgo('%PDF-1.4 valid', 'application/pdf');
        assert.equal(res.status, 400); // email already exists (stubbed)
        await new Promise((r) => setTimeout(r, 100)); // cleanup runs after response
        assert.equal(countPrivateFiles(), before);
    });
});
