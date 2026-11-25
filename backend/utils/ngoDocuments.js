const fs = require('fs');
const path = require('path');

/**
 * Private storage for NGO verification documents (R2 – Access Control).
 *
 * This folder is NOT served by express.static. Documents are only reachable
 * through GET /api/admin/ngos/:id/document, which requires an admin JWT.
 */
const NGO_DOCS_DIR = path.join(__dirname, '../private/ngo-documents');

// Older records stored the file in the public uploads folder as "uploads/<name>.pdf".
const LEGACY_UPLOADS_DIR = path.join(__dirname, '../uploads');

const ensureNgoDocsDir = () => {
    if (!fs.existsSync(NGO_DOCS_DIR)) {
        fs.mkdirSync(NGO_DOCS_DIR, { recursive: true });
    }
};

/**
 * Turn a stored reference into a safe absolute path inside an allowed folder.
 * Only the base name is used, so values like "../../.env" cannot escape the folder.
 * Returns null when the file does not exist.
 */
const resolveNgoDocumentPath = (storedRef) => {
    if (!storedRef || typeof storedRef !== 'string') return null;
    const fileName = path.basename(storedRef);
    if (!fileName.toLowerCase().endsWith('.pdf')) return null;

    for (const dir of [NGO_DOCS_DIR, LEGACY_UPLOADS_DIR]) {
        const candidate = path.join(dir, fileName);
        if (candidate.startsWith(dir + path.sep) && fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
};

/** Delete a stored document; errors are ignored (the file may already be gone). */
const removeNgoDocument = (storedRef) => {
    const filePath = resolveNgoDocumentPath(storedRef);
    if (filePath) {
        fs.unlink(filePath, () => {});
    }
};

/** True when the file starts with the PDF signature "%PDF-". */
const hasPdfSignature = (filePath) => {
    let fd;
    try {
        fd = fs.openSync(filePath, 'r');
        const header = Buffer.alloc(5);
        fs.readSync(fd, header, 0, 5, 0);
        return header.toString('ascii') === '%PDF-';
    } catch {
        return false;
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
    }
};

module.exports = {
    NGO_DOCS_DIR,
    LEGACY_UPLOADS_DIR,
    ensureNgoDocsDir,
    resolveNgoDocumentPath,
    removeNgoDocument,
    hasPdfSignature
};
