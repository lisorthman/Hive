const express = require('express');
const path = require('path');

/**
 * Public static uploads: impact story photos only.
 * NGO verification documents are private (backend/private/ngo-documents) and are
 * only available to admins via GET /api/admin/ngos/:id/document.
 */
const publicUploads = express.Router();

publicUploads.use('/impact', express.static(path.join(__dirname, '../uploads/impact'), {
    dotfiles: 'deny',
    index: false,
    setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff')
}));

module.exports = publicUploads;
