const mongoose = require('mongoose');

const impactCommentSchema = new mongoose.Schema({
    post: {
        type: mongoose.Schema.ObjectId,
        ref: 'ImpactPost',
        required: true
    },
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    parentComment: {
        type: mongoose.Schema.ObjectId,
        ref: 'ImpactComment',
        default: null
    },
    reportsCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

impactCommentSchema.index({ post: 1, createdAt: 1 });
impactCommentSchema.index({ post: 1, parentComment: 1 });

module.exports = mongoose.model('ImpactComment', impactCommentSchema);
