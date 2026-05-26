const mongoose = require('mongoose');

const eventReviewSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.ObjectId,
        ref: 'Event',
        required: true
    },
    volunteer: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: [true, 'Please add a rating'],
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        maxlength: [1000, 'Review cannot exceed 1000 characters']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

eventReviewSchema.index({ event: 1, volunteer: 1 }, { unique: true });

module.exports = mongoose.model('EventReview', eventReviewSchema);
