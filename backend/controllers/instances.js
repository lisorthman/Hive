const EventInstance = require('../models/EventInstance');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const { joinMission, leaveMission, getParticipation } = require('../utils/shiftSlots');

// @desc    Get single instance
// @route   GET /api/instances/:id
// @access  Public
exports.getInstance = async (req, res) => {
    try {
        const instance = await EventInstance.findById(req.params.id)
            .populate({ path: 'organization', select: 'name email' })
            .populate({ path: 'series', select: 'title recurrence seriesStart seriesEnd' });

        if (!instance) {
            return res.status(404).json({ success: false, error: 'Mission date not found' });
        }

        res.status(200).json({
            success: true,
            data: { ...instance.toObject(), missionType: 'instance' }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Participation on an instance
// @route   GET /api/instances/:id/participation
// @access  Private
exports.getInstanceParticipation = async (req, res) => {
    try {
        const instance = await EventInstance.findById(req.params.id);
        if (!instance) {
            return res.status(404).json({ success: false, error: 'Mission date not found' });
        }

        const data = getParticipation({
            doc: instance,
            userId: req.user.id,
            useShiftSlots: instance.useShiftSlots
        });

        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    RSVP to a specific instance date (optional shift slot)
// @route   PUT /api/instances/:id/join
// @access  Private (Volunteer)
exports.joinInstance = async (req, res) => {
    try {
        const instance = await EventInstance.findById(req.params.id);
        if (!instance) {
            return res.status(404).json({ success: false, error: 'Mission date not found' });
        }
        if (instance.status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'This date has been cancelled' });
        }

        const result = await joinMission({
            doc: instance,
            userId: req.user.id,
            shiftSlotId: req.body.shiftSlotId,
            useShiftSlots: instance.useShiftSlots
        });

        if (result.membership === 'joined') {
            try {
                await Attendance.create({
                    eventInstance: instance._id,
                    volunteer: req.user.id,
                    shiftSlotId: result.shiftSlotId || null,
                    status: 'joined'
                });
            } catch (error) {
                if (error.code !== 11000) {
                    console.error('Failed to create instance attendance:', error);
                }
            }

            try {
                await Notification.create({
                    recipient: instance.organization,
                    sender: req.user.id,
                    event: instance._id,
                    type: 'volunteer_joined',
                    message: `${req.user.name} RSVP'd for ${instance.title} on ${new Date(instance.date).toLocaleDateString()}`
                });
            } catch (error) {
                console.error('Failed to create notification:', error);
            }
        }

        const updated = await EventInstance.findById(instance._id);
        res.status(200).json({
            success: true,
            ...result,
            data: { ...updated.toObject(), missionType: 'instance' }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Cancel RSVP for an instance
// @route   DELETE /api/instances/:id/leave
// @access  Private (Volunteer)
exports.leaveInstance = async (req, res) => {
    try {
        let instance = await EventInstance.findById(req.params.id);
        if (!instance) {
            return res.status(404).json({ success: false, error: 'Mission date not found' });
        }

        const shiftSlotId = req.body?.shiftSlotId || req.query?.shiftSlotId;
        const result = await leaveMission({
            doc: instance,
            userId: req.user.id,
            shiftSlotId,
            useShiftSlots: instance.useShiftSlots
        });

        if (result.membership === 'none' && !result.message?.includes('waitlist')) {
            try {
                const filter = {
                    eventInstance: instance._id,
                    volunteer: req.user.id
                };
                if (shiftSlotId) filter.shiftSlotId = shiftSlotId;
                await Attendance.deleteMany(filter);
            } catch (error) {
                console.error('Failed to delete instance attendance:', error);
            }
        }

        instance = await EventInstance.findById(instance._id);
        res.status(200).json({
            success: true,
            ...result,
            data: { ...instance.toObject(), missionType: 'instance' }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
