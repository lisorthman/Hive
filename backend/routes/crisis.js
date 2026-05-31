const express = require('express');
const {
    getCrisisMap,
    broadcastCrisisAlert,
    updateCrisisStatus
} = require('../controllers/crisis');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/map', getCrisisMap);
router.post('/:eventId/alert', protect, authorize('ngo', 'admin'), broadcastCrisisAlert);
router.put('/:eventId/status', protect, authorize('ngo', 'admin'), updateCrisisStatus);

module.exports = router;
