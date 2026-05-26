const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');

// @desc    Get public NGO impact profile
// @route   GET /api/ngos/:id
// @access  Public
exports.getNGOProfile = async (req, res) => {
    try {
        const ngo = await User.findById(req.params.id).select('name role bio verificationStatus createdAt');

        if (!ngo || ngo.role !== 'ngo') {
            return res.status(404).json({ success: false, error: 'NGO not found' });
        }

        if (ngo.verificationStatus !== 'verified') {
            return res.status(404).json({ success: false, error: 'NGO profile is not public yet' });
        }

        const events = await Event.find({ organization: ngo._id }).select(
            'title date status category averageRating reviewCount capacity volunteersJoined'
        );

        const eventIds = events.map((e) => e._id);
        const checkedInRecords = await Attendance.find({
            event: { $in: eventIds },
            status: 'checked-in'
        });

        const totalVolunteersCheckedIn = checkedInRecords.length;
        const totalVolunteerHours = checkedInRecords.reduce(
            (sum, r) => sum + (r.hoursWorked || 0),
            0
        );

        const ratedEvents = events.filter((e) => e.reviewCount > 0);
        const averageRating =
            ratedEvents.length > 0
                ? Math.round(
                    (ratedEvents.reduce((sum, e) => sum + e.averageRating, 0) / ratedEvents.length) * 10
                ) / 10
                : 0;

        const activeEvents = events.filter((e) =>
            ['upcoming', 'ongoing'].includes(e.status)
        );
        const pastEvents = events.filter((e) =>
            ['completed', 'cancelled'].includes(e.status)
        );

        res.status(200).json({
            success: true,
            data: {
                ngo: {
                    _id: ngo._id,
                    name: ngo.name,
                    bio: ngo.bio,
                    memberSince: ngo.createdAt
                },
                stats: {
                    totalEvents: events.length,
                    activeEvents: activeEvents.length,
                    totalVolunteersCheckedIn,
                    totalVolunteerHours,
                    averageRating
                },
                activeEvents,
                pastEvents
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get events for an NGO (public)
// @route   GET /api/ngos/:id/events
// @access  Public
exports.getNGOEvents = async (req, res) => {
    try {
        const ngo = await User.findById(req.params.id);
        if (!ngo || ngo.role !== 'ngo' || ngo.verificationStatus !== 'verified') {
            return res.status(404).json({ success: false, error: 'NGO not found' });
        }

        const events = await Event.find({ organization: ngo._id })
            .select('-checkInCode')
            .sort('-date');

        res.status(200).json({ success: true, count: events.length, data: events });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
