const crypto = require('crypto');
const Attendance = require('../models/Attendance');
const Event = require('../models/Event');
const User = require('../models/User');

// @desc    Get all attendance records for an event
// @route   GET /api/attendance/event/:eventId
// @access  Private (NGO/Admin)
exports.getEventAttendance = async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Verify that user is owner of the organization or admin
        if (event.organization.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to view attendance for this event' });
        }

        const attendance = await Attendance.find({ event: req.params.eventId })
            .populate('volunteer', 'name email')
            .sort('createdAt');

        res.status(200).json({ success: true, count: attendance.length, data: attendance });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Manually update status and hours for event participants
// @route   PUT /api/attendance/event/:eventId/manual
// @access  Private (NGO/Admin)
exports.updateAttendanceManual = async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Verify that user is owner of the organization or admin
        if (event.organization.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to manage attendance for this event' });
        }

        const { records } = req.body; // Array of { volunteerId, status, hoursWorked }
        if (!Array.isArray(records)) {
            return res.status(400).json({ success: false, error: 'Invalid payload: records array required' });
        }

        const updatedRecords = [];
        for (const record of records) {
            const { volunteerId, status, hoursWorked } = record;

            // Update or upsert attendance record
            const attendance = await Attendance.findOneAndUpdate(
                { event: req.params.eventId, volunteer: volunteerId },
                {
                    status,
                    hoursWorked: hoursWorked || 0,
                    ...(status === 'checked-in' ? { checkedInAt: new Date() } : {})
                },
                { new: true, upsert: true }
            );

            // Synchronize event volunteersJoined array if needed
            if (!event.volunteersJoined.includes(volunteerId)) {
                event.volunteersJoined.push(volunteerId);
            }
            updatedRecords.push(attendance);
        }

        await event.save();

        res.status(200).json({ success: true, data: updatedRecords });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Generate a new check-in code for QR code check-in
// @route   PUT /api/attendance/event/:eventId/code
// @access  Private (NGO/Admin)
exports.generateCheckInCode = async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (event.organization.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, error: 'Not authorized to modify this event' });
        }

        const code = crypto.randomBytes(8).toString('hex');
        event.checkInCode = code;
        await event.save();

        res.status(200).json({ success: true, code });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Check-in volunteer using code
// @route   POST /api/attendance/event/:eventId/check-in
// @access  Private (Volunteer)
exports.checkInVolunteer = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, error: 'Check-in code is required' });
        }

        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (!event.checkInCode || event.checkInCode !== code) {
            return res.status(400).json({ success: false, error: 'Invalid or expired check-in code' });
        }

        let attendance = await Attendance.findOne({ event: req.params.eventId, volunteer: req.user.id });

        if (!attendance) {
            // Automatically join if capacity permits
            if (event.volunteersJoined.length >= event.capacity) {
                return res.status(400).json({ success: false, error: 'Event is already full' });
            }
            event.volunteersJoined.push(req.user.id);
            await event.save();

            attendance = await Attendance.create({
                event: req.params.eventId,
                volunteer: req.user.id,
                status: 'checked-in',
                checkedInAt: new Date(),
                hoursWorked: 4 // default hours
            });
        } else {
            attendance.status = 'checked-in';
            attendance.checkedInAt = new Date();
            if (attendance.hoursWorked === 0) {
                attendance.hoursWorked = 4; // assign default if not set
            }
            await attendance.save();
        }

        res.status(200).json({ success: true, message: 'Check-in successful', data: attendance });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get verified volunteer stats (total hours, check-ins)
// @route   GET /api/attendance/my-stats
// @access  Private (Volunteer)
exports.getVolunteerStats = async (req, res) => {
    try {
        const allRecords = await Attendance.find({ volunteer: req.user.id }).populate('event');
        
        const checkedIn = allRecords.filter(r => r.status === 'checked-in');
        const totalHours = checkedIn.reduce((sum, r) => sum + r.hoursWorked, 0);
        const joinedCount = allRecords.length;

        // Score: formula is (joinedCount * 100) + (totalHours * 10)
        const communityScore = (joinedCount * 100) + (totalHours * 10);

        // Level = Math.floor(communityScore / 300) + 1
        const level = Math.floor(communityScore / 300) + 1;

        // Dynamic badges
        const badges = [];

        // Milestone Badges:
        if (joinedCount >= 1) {
            badges.push({
                id: 'first_step',
                name: 'First Step',
                description: 'Joined or completed your first volunteering event',
                icon: 'Award',
                color: 'blue'
            });
        }
        if (totalHours >= 5) {
            badges.push({
                id: 'bronze_helper',
                name: 'Bronze Helper',
                description: 'Logged 5 or more verified hours of service',
                icon: 'Award',
                color: 'orange'
            });
        }
        if (totalHours >= 20) {
            badges.push({
                id: 'silver_helper',
                name: 'Silver Helper',
                description: 'Logged 20 or more verified hours of service',
                icon: 'Award',
                color: 'slate'
            });
        }
        if (totalHours >= 50) {
            badges.push({
                id: 'gold_helper',
                name: 'Gold Helper',
                description: 'Logged 50 or more verified hours of service',
                icon: 'Award',
                color: 'yellow'
            });
        }

        // Category Badges:
        const checkedInCategories = new Set(
            checkedIn.filter(r => r.event).map(r => r.event.category)
        );

        if (checkedInCategories.has('Environmental')) {
            badges.push({
                id: 'eco_warrior',
                name: 'Eco Warrior',
                description: 'Completed a verified Environmental event',
                icon: 'TrendingUp',
                color: 'green'
            });
        }
        if (checkedInCategories.has('Social Work')) {
            badges.push({
                id: 'social_champion',
                name: 'Social Champion',
                description: 'Completed a verified Social Work event',
                icon: 'Users',
                color: 'purple'
            });
        }
        if (checkedInCategories.has('Education')) {
            badges.push({
                id: 'scholar',
                name: 'Scholar',
                description: 'Completed a verified Education event',
                icon: 'Award',
                color: 'teal'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                totalHours,
                checkedInCount: checkedIn.length,
                joinedCount,
                communityScore,
                level,
                badges
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get volunteer leaderboard
// @route   GET /api/attendance/leaderboard
// @access  Private (Authenticated Users)
exports.getLeaderboard = async (req, res) => {
    try {
        const leaderboardData = await Attendance.aggregate([
            {
                $lookup: {
                    from: 'events',
                    localField: 'event',
                    foreignField: '_id',
                    as: 'eventData'
                }
            },
            {
                $unwind: {
                    path: '$eventData',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: '$volunteer',
                    totalHours: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'checked-in'] }, '$hoursWorked', 0]
                        }
                    },
                    checkedInCount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'checked-in'] }, 1, 0]
                        }
                    },
                    joinedCount: { $sum: 1 },
                    checkedInCategories: {
                        $addToSet: {
                            $cond: [{ $eq: ['$status', 'checked-in'] }, '$eventData.category', null]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            {
                $unwind: '$userData'
            },
            {
                $match: {
                    'userData.role': 'volunteer'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: '$userData.name',
                    email: '$userData.email',
                    totalHours: 1,
                    checkedInCount: 1,
                    joinedCount: 1,
                    checkedInCategories: 1
                }
            }
        ]);

        const rankedUsers = leaderboardData.map(user => {
            const totalHours = user.totalHours || 0;
            const joinedCount = user.joinedCount || 0;
            const score = (joinedCount * 100) + (totalHours * 10);
            const level = Math.floor(score / 300) + 1;

            const badges = [];
            if (joinedCount >= 1) badges.push('first_step');
            if (totalHours >= 5) badges.push('bronze_helper');
            if (totalHours >= 20) badges.push('silver_helper');
            if (totalHours >= 50) badges.push('gold_helper');
            
            const categories = new Set(user.checkedInCategories || []);
            if (categories.has('Environmental')) badges.push('eco_warrior');
            if (categories.has('Social Work')) badges.push('social_champion');
            if (categories.has('Education')) badges.push('scholar');

            return {
                id: user._id,
                name: user.name,
                email: user.email,
                totalHours,
                joinedCount,
                checkedInCount: user.checkedInCount,
                score,
                level,
                badges
            };
        });

        // Add 0-attendance volunteers
        const allVolunteers = await User.find({ role: 'volunteer' });
        const existingIds = new Set(rankedUsers.map(u => u.id.toString()));

        for (const vol of allVolunteers) {
            if (!existingIds.has(vol._id.toString())) {
                rankedUsers.push({
                    id: vol._id,
                    name: vol.name,
                    email: vol.email,
                    totalHours: 0,
                    joinedCount: 0,
                    checkedInCount: 0,
                    score: 0,
                    level: 1,
                    badges: []
                });
            }
        }

        rankedUsers.sort((a, b) => b.score - a.score);

        res.status(200).json({ success: true, data: rankedUsers });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
