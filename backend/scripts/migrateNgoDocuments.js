/**
 * One-time migration for R2 (Access Control).
 *
 * Moves NGO verification documents that were saved in the PUBLIC uploads folder
 * (verificationDocument = "uploads/<name>.pdf") into private storage with a new
 * random name, and updates each NGO record to point at the new file.
 *
 * Usage: npm run migrate:ngo-docs
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const { NGO_DOCS_DIR, LEGACY_UPLOADS_DIR, ensureNgoDocsDir } = require('../utils/ngoDocuments');

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    ensureNgoDocsDir();

    const ngos = await User.find({ role: 'ngo', verificationDocument: { $exists: true, $ne: '' } })
        .select('name verificationDocument');

    let moved = 0;
    let missing = 0;
    const movedFrom = new Set();

    for (const ngo of ngos) {
        const ref = ngo.verificationDocument;
        // Already migrated: plain file name that exists in private storage.
        if (!ref.includes('/') && fs.existsSync(path.join(NGO_DOCS_DIR, ref))) continue;

        const legacyPath = path.join(LEGACY_UPLOADS_DIR, path.basename(ref));
        if (!fs.existsSync(legacyPath) && !movedFrom.has(legacyPath)) {
            console.warn(`  ! File missing for ${ngo.name}: ${ref}`);
            missing++;
            continue;
        }

        const newName = `${crypto.randomBytes(16).toString('hex')}.pdf`;
        // Several seed NGOs can share one legacy file, so copy first and delete after the loop.
        fs.copyFileSync(legacyPath, path.join(NGO_DOCS_DIR, newName));
        movedFrom.add(legacyPath);

        ngo.verificationDocument = newName;
        await ngo.save({ validateBeforeSave: false });
        moved++;
    }

    for (const oldPath of movedFrom) {
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    console.log(`Done. Moved ${moved} document(s) to private storage. Missing: ${missing}.`);
    await mongoose.disconnect();
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
