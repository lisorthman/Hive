const express = require('express');
const {
    getEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    joinEvent,
    getMyEvents
} = require('../controllers/events');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.get('/my-events', protect, authorize('ngo', 'admin'), getMyEvents);

router
    .route('/')
    .get(getEvents)
    .post(protect, authorize('ngo', 'admin'), createEvent);

router
    .route('/:id')
    .get(getEvent)
    .put(protect, authorize('ngo', 'admin'), updateEvent)
    .delete(protect, authorize('ngo', 'admin'), deleteEvent);

router.route('/:id/join').put(protect, authorize('volunteer', 'admin'), joinEvent);

module.exports = router;
