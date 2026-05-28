const mongoose = require('mongoose');

const impactPostSchema = new mongoose.Schema({
    ngo: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
        type: mongoose.Schema.ObjectId,
        ref: 'Event',
        default: null
    },
    eventInstance: {
        type: mongoose.Schema.ObjectId,
        ref: 'EventInstance',
        default: null
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 140
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },
    photos: [{ type: String }],
    taggedVolunteers: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    hashtags: [{ type: String, trim: true }],
    visibility: {
        type: String,
        enum: ['public', 'community'],
        default: 'public'
    },
    likes: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    savesCount: { type: Number, default: 0 },
    reportsCount: { type: Number, default: 0 },
    volunteerContributions: [{
        author: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true, trim: true, maxlength: 2000 },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        createdAt: { type: Date, default: Date.now }
    }],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    updatedAt: { type: Date, default: Date.now }
},
{
    timestamps: false
});

impactPostSchema.index({ createdAt: -1 });
impactPostSchema.index({ ngo: 1, createdAt: -1 });
impactPostSchema.index({ visibility: 1, createdAt: -1 });
impactPostSchema.index({ hashtags: 1 });
impactPostSchema.index({ event: 1 });
impactPostSchema.index({ eventInstance: 1 });

module.exports = mongoose.model('ImpactPost', impactPostSchema);
