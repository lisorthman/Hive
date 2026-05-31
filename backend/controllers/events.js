const Event = require('../models/Event');
const User = require('../models/User');
const { recordAudit } = require('../utils/auditLog');
const Attendance = require('../models/Attendance');
const { recommendEventsForUser } = require('../utils/recommendEvents');
const Notification = require('../models/Notification');
const { promoteFromWaitlist } = require('../utils/waitlist');
const notifyEventVolunteers = require('../utils/notifyEventVolunteers');
const { joinMission, leaveMission, getParticipation } = require('../utils/shiftSlots');
const { sendCrisisAlerts } = require('../utils/crisisAlerts');
const {
    fetchDiscoveryFeed,
    fetchJoinedMissions,
    fetchWaitlistedMissions
} = require('../utils/missionFeed');

const userOnList = (list, userId) =>
    list.some((id) => id.toString() === userId.toString());

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
    try {
        const data = await fetchDiscoveryFeed();

        res.status(200).json({
            success: true,
            count: data.length,
            data
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get personalized event recommendations for volunteer
// @route   GET /api/events/recommended?lat=&lng=
// @access  Private (volunteer, admin)
exports.getRecommendedEvents = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('interests skills availability');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const { lat, lng } = req.query;
        const data = await recommendEventsForUser(user, { lat, lng, limit: 12 });

        res.status(200).json({
            success: true,
            count: data.length,
            data
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get events for logged in NGO
// @route   GET /api/events/my-events
// @access  Private (NGO)
exports.getMyEvents = async (req, res) => {
    try {
        const events = await Event.find({ organization: req.user.id }).populate({
            path: 'organization',
            select: 'name email'
        });

        res.status(200).json({
            success: true,
            count: events.length,
            data: events
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get events joined by logged in volunteer
// @route   GET /api/events/joined
// @access  Private (Volunteer)
exports.getJoinedEvents = async (req, res) => {
    try {
        const data = await fetchJoinedMissions(req.user.id);

        res.status(200).json({
            success: true,
            count: data.length,
            data
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get events on waitlist for logged in volunteer
// @route   GET /api/events/waitlisted
// @access  Private (Volunteer)
exports.getWaitlistedEvents = async (req, res) => {
    try {
        const data = await fetchWaitlistedMissions(req.user.id);

        res.status(200).json({
            success: true,
            count: data.length,
            data
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Current user's participation on an event
// @route   GET /api/events/:id/participation
// @access  Private
exports.getEventParticipation = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const data = getParticipation({
            doc: event,
            userId: req.user.id,
            useShiftSlots: event.useShiftSlots
        });

        res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate({
            path: 'organization',
            select: 'name email'
        });

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        res.status(200).json({ success: true, data: event });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private (NGO)
exports.createEvent = async (req, res) => {
    try {
        req.body.organization = req.user.id;
        req.body.ngoName = req.user.name;

        if (req.user.role !== 'ngo' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Only NGOs can create events' });
        }

        if (req.body.useShiftSlots) {
            if (!req.body.shiftSlots?.length) {
                return res.status(400).json({
                    success: false,
                    error: 'Add at least one shift slot when using shift slots'
                });
            }
            req.body.shiftSlots = req.body.shiftSlots.map((s) => ({
                label: s.label,
                startTime: s.startTime,
                endTime: s.endTime,
                capacity: s.capacity,
                volunteersJoined: [],
                waitlist: []
            }));
        }

        if (req.body.missionMode === 'emergency') {
            if (req.user.role === 'ngo' && req.user.verificationStatus !== 'verified') {
                return res.status(403).json({
                    success: false,
                    error: 'Only verified NGOs can create emergency missions'
                });
            }
            const crisis = req.body.crisis || {};
            if (!crisis.disasterType) {
                return res.status(400).json({
                    success: false,
                    error: 'disasterType is required for emergency missions'
                });
            }
            req.body.category = req.body.category || 'Disaster Relief';
            req.body.status = 'ongoing';
            req.body.crisis = {
                urgencyLevel: crisis.urgencyLevel || 'high',
                disasterType: crisis.disasterType,
                responseDeadline: crisis.responseDeadline || null,
                affectedAreaName: crisis.affectedAreaName || req.body.location?.name || '',
                radiusKm: crisis.radiusKm || 25,
                immediateNeeds: crisis.immediateNeeds || [],
                requiredSkills: crisis.requiredSkills || [],
                deploymentMode: crisis.deploymentMode || 'rapid',
                crisisStatus: 'active'
            };
        }

        const event = await Event.create(req.body);

        if (event.missionMode === 'emergency') {
            await sendCrisisAlerts(event, req.user);
        }

        res.status(201).json({
            success: true,
            data: event
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
exports.updateEvent = async (req, res) => {
    try {
        let event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (event.organization.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to update this event' });
        }

        const previousCapacity = event.capacity;
        const volunteerIds = [...event.volunteersJoined];

        event = await Event.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (event.capacity > previousCapacity) {
            while (
                event.volunteersJoined.length < event.capacity &&
                event.waitlist.length > 0
            ) {
                await promoteFromWaitlist(event);
                event = await Event.findById(event._id);
            }
        }

        const changedFields = Object.keys(req.body).filter(
            (k) => !['organization', 'ngoName'].includes(k)
        );
        if (volunteerIds.length > 0 && changedFields.length > 0) {
            await notifyEventVolunteers({
                event,
                senderId: req.user.id,
                type: 'event_updated',
                message: `Mission "${event.title}" was updated by the organizer. Please review the latest details.`,
                volunteerIds
            });
        }

        res.status(200).json({ success: true, data: event });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (event.organization.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to delete this event' });
        }

        const volunteerIds = [
            ...event.volunteersJoined.map((id) => id.toString()),
            ...event.waitlist.map((id) => id.toString())
        ];
        const uniqueVolunteerIds = [...new Set(volunteerIds)];

        if (uniqueVolunteerIds.length > 0) {
            await notifyEventVolunteers({
                event,
                senderId: req.user.id,
                type: 'event_cancelled',
                message: `Mission "${event.title}" has been cancelled by the organizer.`,
                volunteerIds: uniqueVolunteerIds
            });
        }

        await recordAudit({
            actor: req.user,
            action: 'event_deleted',
            targetType: 'event',
            targetId: event._id,
            payload: {
                eventId: event._id.toString(),
                eventTitle: event.title,
                organizationId: event.organization.toString(),
                deletedByRole: req.user.role
            }
        });

        await event.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Join event or join waitlist
// @route   PUT /api/events/:id/join
// @access  Private (Volunteer)
exports.joinEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (event.status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'This mission has been cancelled' });
        }

        const result = await joinMission({
            doc: event,
            userId: req.user.id,
            shiftSlotId: req.body.shiftSlotId,
            useShiftSlots: event.useShiftSlots
        });

        if (result.membership === 'joined') {
            try {
                await Attendance.create({
                    event: event._id,
                    volunteer: req.user.id,
                    shiftSlotId: result.shiftSlotId || null,
                    status: 'joined',
                    deploymentRole:
                        event.missionMode === 'emergency' && req.body.deploymentRole
                            ? String(req.body.deploymentRole).trim().slice(0, 80)
                            : null
                });
            } catch (error) {
                if (error.code !== 11000) {
                    console.error('Failed to create attendance:', error);
                }
            }

            try {
                await Notification.create({
                    recipient: event.organization,
                    sender: req.user.id,
                    event: event._id,
                    type: 'volunteer_joined',
                    message: `${req.user.name} has joined your mission: ${event.title}`
                });
            } catch (error) {
                console.error('Failed to create notification:', error);
            }
        }

        const updated = await Event.findById(event._id);
        res.status(200).json({
            success: true,
            ...result,
            data: updated
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Leave event or leave waitlist
// @route   DELETE /api/events/:id/leave
// @access  Private (Volunteer)
exports.leaveEvent = async (req, res) => {
    try {
        let event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const shiftSlotId = req.body?.shiftSlotId || req.query?.shiftSlotId;
        const result = await leaveMission({
            doc: event,
            userId: req.user.id,
            shiftSlotId,
            useShiftSlots: event.useShiftSlots
        });

        if (result.membership === 'none' && !result.message?.includes('waitlist')) {
            try {
                const filter = { event: event._id, volunteer: req.user.id };
                if (shiftSlotId) filter.shiftSlotId = shiftSlotId;
                await Attendance.deleteMany(filter);
            } catch (error) {
                console.error('Failed to delete attendance:', error);
            }

            try {
                await Notification.create({
                    recipient: event.organization,
                    sender: req.user.id,
                    event: event._id,
                    type: 'volunteer_left',
                    message: `${req.user.name} has left your mission: ${event.title}`
                });
            } catch (error) {
                console.error('Failed to create notification:', error);
            }

            if (!event.useShiftSlots) {
                event = await Event.findById(event._id);
                await promoteFromWaitlist(event);
            }
        }

        res.status(200).json({
            success: true,
            ...result,
            data: await Event.findById(event._id)
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get volunteers joined/waitlisted for NGO event
// @route   GET /api/events/:id/volunteers
// @access  Private (NGO/Admin)
exports.getEventVolunteers = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('volunteersJoined', 'name email bio interests skills availability')
            .populate('waitlist', 'name email bio interests skills availability');

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (event.organization.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to view volunteers for this event' });
        }

        res.status(200).json({
            success: true,
            data: {
                event: {
                    _id: event._id,
                    title: event.title
                },
                joined: event.volunteersJoined || [],
                waitlisted: event.waitlist || []
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Remove volunteer from event with organizer message
// @route   DELETE /api/events/:id/volunteers/:volunteerId
// @access  Private (NGO/Admin)
exports.removeEventVolunteer = async (req, res) => {
    try {
        const { id, volunteerId } = req.params;
        const { message } = req.body || {};

        let event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (event.organization.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to remove volunteers from this event' });
        }

        const inJoined = event.volunteersJoined.some((v) => v.toString() === volunteerId);
        const inWaitlist = event.waitlist.some((v) => v.toString() === volunteerId);

        if (!inJoined && !inWaitlist) {
            return res.status(400).json({ success: false, error: 'Volunteer is not part of this event' });
        }

        event.volunteersJoined = event.volunteersJoined.filter((v) => v.toString() !== volunteerId);
        event.waitlist = event.waitlist.filter((v) => v.toString() !== volunteerId);
        await event.save();

        await Attendance.deleteMany({ event: event._id, volunteer: volunteerId });

        try {
            await Notification.create({
                recipient: volunteerId,
                sender: req.user.id,
                event: event._id,
                type: 'volunteer_removed',
                message:
                    message?.trim() ||
                    `You were removed from "${event.title}" by the organizer.`
            });
        } catch (error) {
            console.error('Failed to create removal notification:', error);
        }

        if (inJoined && !event.useShiftSlots) {
            event = await Event.findById(event._id);
            await promoteFromWaitlist(event);
        }

        const refreshed = await Event.findById(event._id)
            .populate('volunteersJoined', 'name email bio interests skills availability')
            .populate('waitlist', 'name email bio interests skills availability');

        res.status(200).json({
            success: true,
            data: {
                joined: refreshed.volunteersJoined || [],
                waitlisted: refreshed.waitlist || []
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
