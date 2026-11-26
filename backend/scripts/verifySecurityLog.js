/**
 * R5 – Verify the security event hash chain from the command line (Policy §8.3.4).
 *
 *   npm run security:verify
 *
 * Exit codes: 0 = chain intact, 1 = tampering detected, 2 = could not run the check.
 * The result is itself recorded in the security log (log_integrity_check / _failed);
 * a failed check raises a critical alert for the admins.
 */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { verifyAndRecord, flush } = require('../utils/securityLog');

const main = async () => {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set (backend/.env).');
        return 2;
    }
    await mongoose.connect(process.env.MONGO_URI);

    const result = await verifyAndRecord({ source: 'cli' });
    await flush();

    console.log('Hive security log integrity check');
    console.log('──────────────────────────────────');
    console.log(`Records checked : ${result.checked}`);
    console.log(`Sequence range  : ${result.firstSeq ?? '-'} … ${result.lastSeq ?? '-'}`);
    console.log(`Head hash       : ${result.headHash ?? '-'}`);
    console.log(`Verified at     : ${result.verifiedAt.toISOString()}`);

    if (result.valid) {
        console.log('Result          : INTACT');
        return 0;
    }
    console.log(`Result          : TAMPERED (${result.issueCount} issue(s))`);
    for (const issue of result.issues) {
        const extra = Object.entries(issue)
            .filter(([k]) => k !== 'seq' && k !== 'problem')
            .map(([k, v]) => `${k}=${v}`)
            .join(' ');
        console.log(`  seq ${issue.seq}: ${issue.problem}${extra ? ` (${extra})` : ''}`);
    }
    return 1;
};

main()
    .then(async (code) => {
        await mongoose.disconnect().catch(() => {});
        process.exit(code);
    })
    .catch(async (err) => {
        console.error('Integrity check could not run:', err.message);
        await mongoose.disconnect().catch(() => {});
        process.exit(2);
    });
