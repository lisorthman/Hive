const Event = require('../models/Event');
const EventReview = require('../models/EventReview');
const Attendance = require('../models/Attendance');
const updateEventRating = require('../utils/updateEventRating');

// @desc    Get reviews for an event
// @route   GET /api/reviews/event/:eventId
// @access  Public
exports.getEventReviews = async (req, res) => {
    try {
        const reviews = await EventReview.find({ event: req.params.eventId })
            .populate({ path: 'volunteer', select: 'name' })
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get current user's review for an event
// @route   GET /api/reviews/event/:eventId/mine
// @access  Private (volunteer)
exports.getMyEventReview = async (req, res) => {
    try {
        const review = await EventReview.findOne({
            event: req.params.eventId,
            volunteer: req.user.id
        });

        res.status(200).json({ success: true, data: review });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Submit or update review (verified check-in required)
// @route   POST /api/reviews/event/:eventId
// @access  Private (volunteer)
exports.submitEventReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
        }

        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const attendance = await Attendance.findOne({
            event: req.params.eventId,
            volunteer: req.user.id,
            status: 'checked-in'
        });

        if (!attendance) {
            return res.status(403).json({
                success: false,
                error: 'Only volunteers with verified check-in can leave a review'
            });
        }

        let review = await EventReview.findOne({
            event: req.params.eventId,
            volunteer: req.user.id
        });

        if (review) {
            review.rating = rating;
            review.comment = comment || '';
            await review.save();
        } else {
            review = await EventReview.create({
                event: req.params.eventId,
                volunteer: req.user.id,
                rating,
                comment: comment || ''
            });
        }

        const ratingSummary = await updateEventRating(req.params.eventId);

        const populated = await EventReview.findById(review._id).populate({
            path: 'volunteer',
            select: 'name'
        });

        res.status(200).json({
            success: true,
            data: populated,
            ratingSummary
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get reviews for NGO's events (dashboard)
// @route   GET /api/reviews/ngo/summary
// @access  Private (ngo, admin)
exports.getNGOReviewSummary = async (req, res) => {
    try {
        const events = await Event.find({ organization: req.user.id }).select('_id title averageRating reviewCount date');
        const eventIds = events.map((e) => e._id);

        const reviews = await EventReview.find({ event: { $in: eventIds } })
            .populate({ path: 'volunteer', select: 'name' })
            .populate({ path: 'event', select: 'title' })
            .sort('-createdAt')
            .limit(50);

        const ratedEvents = events.filter((e) => e.reviewCount > 0);
        const overallAvg = ratedEvents.length
            ? Math.round(
                (ratedEvents.reduce((sum, e) => sum + e.averageRating, 0) / ratedEvents.length) * 10
            ) / 10
            : 0;

        res.status(200).json({
            success: true,
            data: {
                overallAverage: Number.isFinite(overallAvg) ? overallAvg : 0,
                events,
                recentReviews: reviews
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
