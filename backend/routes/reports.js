const express = require('express');
const { exportImpactReport } = require('../controllers/reports');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/impact', protect, authorize('ngo', 'admin'), exportImpactReport);

module.exports = router;
