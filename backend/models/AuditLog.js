const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    actor: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    actorName: {
        type: String,
        required: true
    },
    actorRole: {
        type: String,
        enum: ['volunteer', 'ngo', 'admin'],
        required: true
    },
    action: {
        type: String,
        enum: [
            'ngo_status_changed',
            'comment_deleted',
            'event_deleted',
            'user_suspended',
            'user_activated',
            'user_removed',
            'impact_post_deleted',
            'impact_comment_deleted',
            'impact_content_flagged'
        ],
        required: true
    },
    targetType: {
        type: String,
        enum: ['user', 'event', 'comment', 'impact_post', 'impact_comment'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.ObjectId,
        required: true
    },
    payloadHash: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
