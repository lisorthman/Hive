const Event = require('../models/Event');
const User = require('../models/User');
const { recordAudit } = require('../utils/auditLog');
const Attendance = require('../models/Attendance');
const { recommendEventsForUser } = require('../utils/recommendEvents');
const Notification = require('../models/Notification');
const { promoteFromWaitlist } = require('../utils/waitlist');
const notifyEventVolunteers = require('../utils/notifyEventVolunteers');

const userOnList = (list, userId) =>
    list.some((id) => id.toString() === userId.toString());

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
    try {
        const events = await Event.find().populate({
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
        const events = await Event.find({ volunteersJoined: req.user.id }).populate({
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

// @desc    Get events on waitlist for logged in volunteer
// @route   GET /api/events/waitlisted
// @access  Private (Volunteer)
exports.getWaitlistedEvents = async (req, res) => {
    try {
        const events = await Event.find({ waitlist: req.user.id }).populate({
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

// @desc    Current user's participation on an event
// @route   GET /api/events/:id/participation
// @access  Private
exports.getEventParticipation = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const userId = req.user.id.toString();
        let membership = 'none';
        let waitlistPosition = null;

        if (userOnList(event.volunteersJoined, userId)) {
            membership = 'joined';
        } else if (userOnList(event.waitlist, userId)) {
            membership = 'waitlisted';
            waitlistPosition =
                event.waitlist.findIndex((id) => id.toString() === userId) + 1;
        }

        res.status(200).json({
            success: true,
            data: {
                membership,
                waitlistPosition,
                spotsLeft: Math.max(0, event.capacity - event.volunteersJoined.length),
                waitlistCount: event.waitlist.length,
                isFull: event.volunteersJoined.length >= event.capacity
            }
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

        const event = await Event.create(req.body);

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

        const userId = req.user.id.toString();

        if (userOnList(event.volunteersJoined, userId)) {
            return res.status(400).json({ success: false, error: 'You have already joined this event' });
        }

        if (userOnList(event.waitlist, userId)) {
            return res.status(400).json({
                success: false,
                error: 'You are already on the waitlist for this event'
            });
        }

        if (event.volunteersJoined.length >= event.capacity) {
            event.waitlist.push(req.user.id);
            await event.save();

            const position = event.waitlist.length;

            return res.status(200).json({
                success: true,
                membership: 'waitlisted',
                waitlistPosition: position,
                data: event,
                message: `Mission is full. You are #${position} on the waitlist.`
            });
        }

        event.volunteersJoined.push(req.user.id);
        await event.save();

        try {
            await Attendance.create({
                event: event._id,
                volunteer: req.user.id,
                status: 'joined'
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

        res.status(200).json({
            success: true,
            membership: 'joined',
            data: event
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

        const userId = req.user.id.toString();
        const onWaitlist = userOnList(event.waitlist, userId);
        const onJoined = userOnList(event.volunteersJoined, userId);

        if (!onWaitlist && !onJoined) {
            return res.status(400).json({
                success: false,
                error: 'You are not registered or waitlisted for this event'
            });
        }

        if (onWaitlist) {
            event.waitlist = event.waitlist.filter((id) => id.toString() !== userId);
            await event.save();
            return res.status(200).json({
                success: true,
                membership: 'none',
                data: event,
                message: 'Removed from waitlist'
            });
        }

        event.volunteersJoined = event.volunteersJoined.filter(
            (v) => v.toString() !== userId
        );
        await event.save();

        try {
            await Attendance.deleteOne({ event: event._id, volunteer: req.user.id });
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

        event = await Event.findById(event._id);
        await promoteFromWaitlist(event);

        res.status(200).json({
            success: true,
            membership: 'none',
            data: await Event.findById(event._id)
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
