const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { NGO_DOCS_DIR, ensureNgoDocsDir, hasPdfSignature } = require('../utils/ngoDocuments');

// NGO verification documents go to a private folder that is never served statically.
ensureNgoDocsDir();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, NGO_DOCS_DIR);
    },
    filename: function (req, file, cb) {
        // Random, unguessable name. The client's original file name is not used.
        cb(null, `${crypto.randomBytes(16).toString('hex')}.pdf`);
    }
});

// Accept only PDFs: both the declared MIME type and the extension must match.
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (file.mimetype === 'application/pdf' && ext === '.pdf') {
        cb(null, true);
    } else {
        cb(new Error('Error: PDFs only!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5MB, single file
    fileFilter: fileFilter
});

/**
 * Runs after multer. Checks the file content really is a PDF
 * (a renamed .exe or .html with a fake MIME type is rejected and deleted).
 */
upload.verifyPdfContent = (req, res, next) => {
    if (!req.file) return next();
    if (hasPdfSignature(req.file.path)) return next();

    fs.unlink(req.file.path, () => {});
    return res.status(400).json({
        success: false,
        error: 'Uploaded file is not a valid PDF'
    });
};

/**
 * Single NGO document upload for registration: multer + JSON errors + content check.
 */
upload.ngoDocument = (fieldName) => [
    (req, res, next) => {
        upload.single(fieldName)(req, res, (err) => {
            if (!err) return next();
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? 'Verification document must be 5MB or smaller'
                : err.message || 'Invalid upload';
            return res.status(400).json({ success: false, error: message });
        });
    },
    upload.verifyPdfContent
];

module.exports = upload;
