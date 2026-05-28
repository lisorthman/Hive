const express = require('express');
const {
    getEventAttendance,
    updateAttendanceManual,
    generateCheckInCode,
    checkInVolunteer,
    getMyAttendanceStatus,
    getVolunteerStats,
    getVolunteerStatsForOrg,
    getLeaderboard
} = require('../controllers/attendance');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Volunteer / Public authenticated routes
router.get('/my-stats', protect, authorize('volunteer', 'admin'), getVolunteerStats);
router.get(
    '/volunteer/:volunteerId/summary',
    protect,
    authorize('ngo', 'admin'),
    getVolunteerStatsForOrg
);
router.get('/leaderboard', protect, getLeaderboard);
router.post('/event/:eventId/check-in', protect, authorize('volunteer', 'admin'), checkInVolunteer);
router.get('/event/:eventId/my-status', protect, getMyAttendanceStatus);

// NGO / Admin routes
router.get('/event/:eventId', protect, authorize('ngo', 'admin'), getEventAttendance);
router.put('/event/:eventId/manual', protect, authorize('ngo', 'admin'), updateAttendanceManual);
router.put('/event/:eventId/code', protect, authorize('ngo', 'admin'), generateCheckInCode);

module.exports = router;
