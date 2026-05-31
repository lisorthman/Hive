const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.ObjectId,
        ref: 'Event'
    },
    eventInstance: {
        type: mongoose.Schema.ObjectId,
        ref: 'EventInstance'
    },
    shiftSlotId: {
        type: String,
        default: null
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
    deploymentRole: {
        type: String,
        default: null,
        trim: true
    },
    safetyAcknowledgedAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

attendanceSchema.index({ event: 1, volunteer: 1, shiftSlotId: 1 }, { unique: true, sparse: true });
attendanceSchema.index({ eventInstance: 1, volunteer: 1, shiftSlotId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
