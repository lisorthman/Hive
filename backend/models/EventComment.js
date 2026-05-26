const mongoose = require('mongoose');

const eventCommentSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.ObjectId,
        ref: 'Event',
        required: true
    },
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    body: {
        type: String,
        required: [true, 'Please add a comment'],
        trim: true,
        maxlength: [2000, 'Comment cannot exceed 2000 characters']
    },
    parentComment: {
        type: mongoose.Schema.ObjectId,
        ref: 'EventComment',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

eventCommentSchema.index({ event: 1, createdAt: 1 });
eventCommentSchema.index({ event: 1, parentComment: 1 });

module.exports = mongoose.model('EventComment', eventCommentSchema);
