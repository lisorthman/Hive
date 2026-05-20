const express = require('express');
const {
    getEventAttendance,
    updateAttendanceManual,
    generateCheckInCode,
    checkInVolunteer,
    getVolunteerStats
} = require('../controllers/attendance');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Volunteer routes
router.get('/my-stats', protect, authorize('volunteer', 'admin'), getVolunteerStats);
router.post('/event/:eventId/check-in', protect, authorize('volunteer', 'admin'), checkInVolunteer);

// NGO / Admin routes
router.get('/event/:eventId', protect, authorize('ngo', 'admin'), getEventAttendance);
router.put('/event/:eventId/manual', protect, authorize('ngo', 'admin'), updateAttendanceManual);
router.put('/event/:eventId/code', protect, authorize('ngo', 'admin'), generateCheckInCode);

module.exports = router;
