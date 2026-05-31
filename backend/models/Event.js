const mongoose = require('mongoose');
const shiftSlotSchema = require('./ShiftSlotSchema');

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
    useShiftSlots: {
        type: Boolean,
        default: false
    },
    shiftSlots: [shiftSlotSchema],
    volunteersJoined: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
    ],
    waitlist: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
    ],
    missionMode: {
        type: String,
        enum: ['normal', 'emergency'],
        default: 'normal'
    },
    crisis: {
        urgencyLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        },
        disasterType: {
            type: String,
            enum: [
                'flood',
                'landslide',
                'cyclone',
                'wildfire',
                'earthquake',
                'medical',
                'food_shortage',
                'shelter',
                'other'
            ],
            default: 'other'
        },
        responseDeadline: { type: Date, default: null },
        affectedAreaName: { type: String, default: '' },
        radiusKm: { type: Number, default: 25 },
        immediateNeeds: [{ type: String, trim: true }],
        requiredSkills: [{ type: String, trim: true }],
        deploymentMode: {
            type: String,
            enum: ['standard', 'rapid'],
            default: 'rapid'
        },
        crisisStatus: {
            type: String,
            enum: ['active', 'stand_down', 'resolved'],
            default: 'active'
        },
        partnerNgos: [
            {
                ngo: { type: mongoose.Schema.ObjectId, ref: 'User' },
                status: {
                    type: String,
                    enum: ['pending', 'accepted', 'declined'],
                    default: 'pending'
                },
                invitedAt: { type: Date, default: Date.now }
            }
        ]
    },
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    checkInCode: {
        type: String,
        default: null
    },
    prepNotes: {
        type: String,
        default: ''
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

eventSchema.index({ missionMode: 1, 'crisis.crisisStatus': 1 });

module.exports = mongoose.model('Event', eventSchema);
