const Event = require('../models/Event');

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
        // Add user to req.body
        req.body.organization = req.user.id;
        req.body.ngoName = req.user.name;

        // Check for role
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

        // Make sure user is event owner
        if (event.organization.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to update this event' });
        }

        event = await Event.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

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

        // Make sure user is event owner
        if (event.organization.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to delete this event' });
        }

        await event.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Join event
// @route   PUT /api/events/:id/join
// @access  Private (Volunteer)
exports.joinEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Check if event is full
        if (event.volunteersJoined.length >= event.capacity) {
            return res.status(400).json({ success: false, error: 'Event is already full' });
        }

        // Check if user already joined
        if (event.volunteersJoined.includes(req.user.id)) {
            return res.status(400).json({ success: false, error: 'You have already joined this event' });
        }

        // Add user to volunteersJoined
        event.volunteersJoined.push(req.user.id);
        await event.save();

        // Create notification for NGO
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                recipient: event.organization,
                sender: req.user.id,
                event: event._id,
                type: 'volunteer_joined',
                message: `${req.user.name} has joined your mission: ${event.title}`
            });
        } catch (error) {
            console.error('Failed to create notification:', error);
            // Don't fail the join if notification fails
        }

        res.status(200).json({ success: true, data: event });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Leave event
// @route   DELETE /api/events/:id/leave
// @access  Private (Volunteer)
exports.leaveEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Check if user already joined
        if (!event.volunteersJoined.includes(req.user.id)) {
            return res.status(400).json({ success: false, error: 'You have not joined this event' });
        }

        // Remove user from volunteersJoined
        event.volunteersJoined = event.volunteersJoined.filter(
            v => v.toString() !== req.user.id
        );
        await event.save();

        // Create notification for NGO
        try {
            const Notification = require('../models/Notification');
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

        res.status(200).json({ success: true, data: event });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
