const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
        type: mongoose.Schema.ObjectId,
        ref: 'Event'
    },
    impactPost: {
        type: mongoose.Schema.ObjectId,
        ref: 'ImpactPost'
    },
    type: {
        type: String,
        enum: [
            'volunteer_joined',
            'volunteer_left',
            'volunteer_removed',
            'volunteer_login',
            'event_updated',
            'event_cancelled',
            'promoted_from_waitlist',
            'impact_story_tagged',
            'impact_story_liked',
            'impact_story_commented'
        ],
        default: 'volunteer_joined'
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Notification', NotificationSchema);
