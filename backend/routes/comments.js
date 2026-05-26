const express = require('express');
const {
    getEventComments,
    createEventComment,
    deleteEventComment
} = require('../controllers/comments');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/event/:eventId', getEventComments);
router.post('/event/:eventId', protect, createEventComment);
router.delete('/:id', protect, authorize('admin'), deleteEventComment);

module.exports = router;
