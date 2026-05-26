const express = require('express');
const {
    getEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    joinEvent,
    getMyEvents,
    getJoinedEvents,
    getWaitlistedEvents,
    getEventParticipation,
    leaveEvent,
    getRecommendedEvents
} = require('../controllers/events');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.get('/my-events', protect, authorize('ngo', 'admin'), getMyEvents);
router.get('/joined', protect, authorize('volunteer', 'admin'), getJoinedEvents);
router.get('/waitlisted', protect, authorize('volunteer', 'admin'), getWaitlistedEvents);
router.get('/recommended', protect, authorize('volunteer', 'admin'), getRecommendedEvents);

router
    .route('/')
    .get(getEvents)
    .post(protect, authorize('ngo', 'admin'), createEvent);

router.get('/:id/participation', protect, getEventParticipation);

router
    .route('/:id')
    .get(getEvent)
    .put(protect, authorize('ngo', 'admin'), updateEvent)
    .delete(protect, authorize('ngo', 'admin'), deleteEvent);

router.route('/:id/join').put(protect, authorize('volunteer', 'admin'), joinEvent);
router.route('/:id/leave').delete(protect, authorize('volunteer', 'admin'), leaveEvent);

module.exports = router;
