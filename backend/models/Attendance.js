const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ['joined', 'checked-in', 'absent'],
        default: 'joined'
    },
    hoursWorked: {
        type: Number,
        default: 0
    },
    checkedInAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure a volunteer has only one attendance record per event
attendanceSchema.index({ event: 1, volunteer: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
