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

// @desc    Get current volunteer's attendance status for an event
// @route   GET /api/attendance/event/:eventId/my-status
// @access  Private
exports.getMyAttendanceStatus = async (req, res) => {
    try {
        const attendance = await Attendance.findOne({
            event: req.params.eventId,
            volunteer: req.user.id
        });

        res.status(200).json({
            success: true,
            data: {
                status: attendance?.status || null,
                checkedIn: attendance?.status === 'checked-in',
                canReview: attendance?.status === 'checked-in',
                hoursWorked: attendance?.hoursWorked || 0
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// ─── Shared Gamification Logic ────────────────────────────────────────────────
// Score formula: joining = 100pts, check-in = 50pts extra, each verified hour = 10pts
// Level: 1 level per 500pts, starting at Level 1
function calcScore(joinedCount, checkedInCount, totalHours) {
    return (joinedCount * 100) + (checkedInCount * 50) + (totalHours * 10);
}

function calcLevel(score) {
    return Math.floor(score / 500) + 1;
}

function calcBadges(joinedCount, checkedInCount, totalHours, categories) {
    const badges = [];

    // ── Milestone: First Contact ───────────────────────────────────────────
    if (joinedCount >= 1) badges.push({
        id: 'first_step', name: 'First Step',
        description: 'Joined your first volunteering mission',
        icon: 'Star', color: 'blue'
    });
    if (joinedCount >= 3) badges.push({
        id: 'explorer', name: 'Explorer',
        description: 'Joined 3 or more missions',
        icon: 'Compass', color: 'sky'
    });
    if (joinedCount >= 5) badges.push({
        id: 'committed', name: 'Committed',
        description: 'Joined 5 or more missions — you are dedicated!',
        icon: 'Flag', color: 'indigo'
    });
    if (joinedCount >= 10) badges.push({
        id: 'champion', name: 'Champion',
        description: 'Joined 10 missions — a true community champion',
        icon: 'Trophy', color: 'violet'
    });
    if (joinedCount >= 20) badges.push({
        id: 'legend', name: 'Legend',
        description: 'Joined 20 missions — you are a Hive Legend!',
        icon: 'Crown', color: 'amber'
    });

    // ── Milestone: Check-In Streaks ────────────────────────────────────────
    if (checkedInCount >= 1) badges.push({
        id: 'verified_volunteer', name: 'Verified Volunteer',
        description: 'Completed your first verified check-in',
        icon: 'CheckCircle', color: 'emerald'
    });
    if (checkedInCount >= 5) badges.push({
        id: 'reliable', name: 'Reliable',
        description: 'Completed 5 verified check-ins',
        icon: 'ShieldCheck', color: 'teal'
    });
    if (checkedInCount >= 10) badges.push({
        id: 'dependable', name: 'Dependable',
        description: 'Completed 10 verified check-ins — always shows up!',
        icon: 'ShieldCheck', color: 'cyan'
    });

    // ── Milestone: Hours Tiers ─────────────────────────────────────────────
    if (totalHours >= 5) badges.push({
        id: 'bronze_helper', name: 'Bronze Helper',
        description: 'Logged 5+ verified hours of service',
        icon: 'Award', color: 'orange'
    });
    if (totalHours >= 20) badges.push({
        id: 'silver_helper', name: 'Silver Helper',
        description: 'Logged 20+ verified hours of service',
        icon: 'Award', color: 'slate'
    });
    if (totalHours >= 50) badges.push({
        id: 'gold_helper', name: 'Gold Helper',
        description: 'Logged 50+ verified hours — outstanding dedication',
        icon: 'Award', color: 'yellow'
    });
    if (totalHours >= 100) badges.push({
        id: 'platinum_hero', name: 'Platinum Hero',
        description: 'Logged 100+ verified hours — a true community hero',
        icon: 'Zap', color: 'purple'
    });
    if (totalHours >= 200) badges.push({
        id: 'diamond_legend', name: 'Diamond Legend',
        description: 'Logged 200+ verified hours — legendary status achieved',
        icon: 'Gem', color: 'fuchsia'
    });

    // ── Category Badges ────────────────────────────────────────────────────
    if (categories.has('Environmental')) badges.push({
        id: 'eco_warrior', name: 'Eco Warrior',
        description: 'Completed a verified Environmental mission',
        icon: 'Leaf', color: 'green'
    });
    if (categories.has('Social Work')) badges.push({
        id: 'social_champion', name: 'Social Champion',
        description: 'Completed a verified Social Work mission',
        icon: 'Users', color: 'pink'
    });
    if (categories.has('Education')) badges.push({
        id: 'scholar', name: 'Scholar',
        description: 'Completed a verified Education mission',
        icon: 'BookOpen', color: 'teal'
    });
    if (categories.has('Animal Welfare')) badges.push({
        id: 'animal_guardian', name: 'Animal Guardian',
        description: 'Completed a verified Animal Welfare mission',
        icon: 'Heart', color: 'rose'
    });
    if (categories.has('Disaster Relief')) badges.push({
        id: 'first_responder', name: 'First Responder',
        description: 'Completed a verified Disaster Relief mission',
        icon: 'AlertTriangle', color: 'red'
    });
    if (categories.has('Healthcare')) badges.push({
        id: 'healer', name: 'Healer',
        description: 'Completed a verified Healthcare mission',
        icon: 'Activity', color: 'blue'
    });

    return badges;
}
// ──────────────────────────────────────────────────────────────────────────────

// @desc    Get verified volunteer stats (total hours, check-ins, score, badges)
// @route   GET /api/attendance/my-stats
// @access  Private (Volunteer)
exports.getVolunteerStats = async (req, res) => {
    try {
        const allRecords = await Attendance.find({ volunteer: req.user.id }).populate('event');
        
        const checkedIn = allRecords.filter(r => r.status === 'checked-in');
        const totalHours = checkedIn.reduce((sum, r) => sum + r.hoursWorked, 0);
        const joinedCount = allRecords.length;
        const checkedInCount = checkedIn.length;

        const communityScore = calcScore(joinedCount, checkedInCount, totalHours);
        const level = calcLevel(communityScore);

        // Categories from checked-in events only
        const checkedInCategories = new Set(
            checkedIn.filter(r => r.event).map(r => r.event.category)
        );

        const badges = calcBadges(joinedCount, checkedInCount, totalHours, checkedInCategories);

        // Next badge hints
        const nextMilestones = [];
        if (joinedCount < 3) nextMilestones.push({ badge: 'Explorer', need: `Join ${3 - joinedCount} more event(s)` });
        else if (joinedCount < 5) nextMilestones.push({ badge: 'Committed', need: `Join ${5 - joinedCount} more event(s)` });
        else if (joinedCount < 10) nextMilestones.push({ badge: 'Champion', need: `Join ${10 - joinedCount} more event(s)` });
        else if (joinedCount < 20) nextMilestones.push({ badge: 'Legend', need: `Join ${20 - joinedCount} more event(s)` });

        if (totalHours < 5) nextMilestones.push({ badge: 'Bronze Helper', need: `Log ${5 - totalHours} more hour(s)` });
        else if (totalHours < 20) nextMilestones.push({ badge: 'Silver Helper', need: `Log ${20 - totalHours} more hour(s)` });
        else if (totalHours < 50) nextMilestones.push({ badge: 'Gold Helper', need: `Log ${50 - totalHours} more hour(s)` });
        else if (totalHours < 100) nextMilestones.push({ badge: 'Platinum Hero', need: `Log ${100 - totalHours} more hour(s)` });
        else if (totalHours < 200) nextMilestones.push({ badge: 'Diamond Legend', need: `Log ${200 - totalHours} more hour(s)` });

        const nextLevelScore = level * 500;
        const pointsToNextLevel = nextLevelScore - communityScore;

        res.status(200).json({
            success: true,
            data: {
                totalHours,
                checkedInCount,
                joinedCount,
                communityScore,
                level,
                pointsToNextLevel,
                badges,
                nextMilestones
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
            { $unwind: '$userData' },
            { $match: { 'userData.role': 'volunteer' } },
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
            const checkedInCount = user.checkedInCount || 0;
            const score = calcScore(joinedCount, checkedInCount, totalHours);
            const level = calcLevel(score);

            const categories = new Set((user.checkedInCategories || []).filter(Boolean));
            const badges = calcBadges(joinedCount, checkedInCount, totalHours, categories).map(b => b.id);

            return {
                id: user._id,
                name: user.name,
                email: user.email,
                totalHours,
                joinedCount,
                checkedInCount,
                score,
                level,
                badges
            };
        });

        // Include volunteers with zero activity
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

