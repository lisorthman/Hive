const crypto = require('crypto');
const Attendance = require('../models/Attendance');
const Event = require('../models/Event');

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
        const allRecords = await Attendance.find({ volunteer: req.user.id });
        
        const checkedIn = allRecords.filter(r => r.status === 'checked-in');
        const totalHours = checkedIn.reduce((sum, r) => sum + r.hoursWorked, 0);

        res.status(200).json({
            success: true,
            data: {
                totalHours,
                checkedInCount: checkedIn.length,
                joinedCount: allRecords.length
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
