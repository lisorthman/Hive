const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    organization: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    ngoName: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: [true, 'Please add a date']
    },
    location: {
        name: {
            type: String,
            required: [true, 'Please add a location name']
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere'
        }
    },
    category: {
        type: String,
        required: [true, 'Please add a category'],
        enum: ['Environmental', 'Social Work', 'Education', 'Animal Welfare', 'Healthcare', 'Disaster Relief', 'Other']
    },
    image: {
        type: String,
        default: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80'
    },
    capacity: {
        type: Number,
        required: [true, 'Please add capacity']
    },
    volunteersJoined: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
    ],
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Event', eventSchema);
