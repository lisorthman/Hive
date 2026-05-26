const mongoose = require('mongoose');
const EventReview = require('../models/EventReview');
const Event = require('../models/Event');

const updateEventRating = async (eventId) => {
    const stats = await EventReview.aggregate([
        { $match: { event: new mongoose.Types.ObjectId(eventId) } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 }
            }
        }
    ]);

    const averageRating = stats[0]
        ? Math.round(stats[0].averageRating * 10) / 10
        : 0;
    const reviewCount = stats[0]?.reviewCount || 0;

    await Event.findByIdAndUpdate(eventId, { averageRating, reviewCount });
    return { averageRating, reviewCount };
};

module.exports = updateEventRating;
