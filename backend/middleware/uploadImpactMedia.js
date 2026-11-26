const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { flagSecurityEvent } = require('./securityMonitor');

const uploadDir = path.join(__dirname, '../uploads/impact');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const MAX_PHOTO_MB = 8;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `impact-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    const err = new Error('Only image uploads are supported for impact stories');
    err.code = 'INVALID_FILE_TYPE';
    err.details = { declaredMimetype: file.mimetype, extension: path.extname(file.originalname || '').toLowerCase() };
    cb(err, false);
};

const upload = multer({
    storage,
    limits: { fileSize: MAX_PHOTO_MB * 1024 * 1024 },
    fileFilter
});

/**
 * Impact photo upload with JSON errors. R5 (§8.3.1): rejected uploads are flagged as
 * upload_rejected instead of falling through to Express's default HTML error page.
 */
upload.photos = (fieldName, maxCount) => (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
        if (!err) return next();
        let message = err.message || 'Invalid upload';
        if (err.code === 'LIMIT_FILE_SIZE') message = `Each photo must be ${MAX_PHOTO_MB}MB or smaller`;
        if (err.code === 'LIMIT_UNEXPECTED_FILE') message = `Upload at most ${maxCount} photos in the "${fieldName}" field`;
        flagSecurityEvent(res, {
            eventType: 'upload_rejected',
            outcome: 'denied',
            reason: err.code === 'INVALID_FILE_TYPE' ? 'invalid_file_type' : String(err.code || 'upload_error').toLowerCase(),
            details: { field: fieldName, ...(err.details || {}) }
        });
        return res.status(400).json({ success: false, error: message });
    });
};

module.exports = upload;
