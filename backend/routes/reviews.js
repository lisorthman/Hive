const express = require('express');
const {
    getEventReviews,
    getMyEventReview,
    submitEventReview,
    getNGOReviewSummary
} = require('../controllers/reviews');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/ngo/summary', protect, authorize('ngo', 'admin'), getNGOReviewSummary);
router.get('/event/:eventId', getEventReviews);
router.get('/event/:eventId/mine', protect, authorize('volunteer', 'admin'), getMyEventReview);
router.post('/event/:eventId', protect, authorize('volunteer', 'admin'), submitEventReview);

module.exports = router;
