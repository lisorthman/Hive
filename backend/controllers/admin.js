const User = require('../models/User');
const Event = require('../models/Event');
const AuditLog = require('../models/AuditLog');
const { recordAudit } = require('../utils/auditLog');

// @desc    Get all NGOs (filtered by status query param optional)
// @route   GET /api/admin/ngos
// @access  Private/Admin
exports.getNGOs = async (req, res) => {
    try {
        const query = { role: 'ngo' };
        // If status is provided in query, filter by it
        if (req.query.status) {
            query.verificationStatus = req.query.status;
        }

        const users = await User.find(query);
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Update NGO Verification Status
// @route   PUT /api/admin/ngo-status/:id
// @access  Private/Admin
exports.updateNGOStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!['verified', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const previousStatus = user.verificationStatus;
        user.verificationStatus = status;
        await user.save();

        await recordAudit({
            actor: req.user,
            action: 'ngo_status_changed',
            targetType: 'user',
            targetId: user._id,
            payload: {
                ngoId: user._id.toString(),
                ngoName: user.name,
                previousStatus,
                newStatus: status
            }
        });

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error('Update NGO Status Error:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Server Error'
        });
    }
};

// @desc    Platform stats for admin dashboard
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getAdminStats = async (req, res) => {
    try {
        const [
            totalUsers,
            volunteers,
            ngos,
            admins,
            pendingNgos,
            verifiedNgos,
            totalEvents,
            activeEvents
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'volunteer' }),
            User.countDocuments({ role: 'ngo' }),
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({ role: 'ngo', verificationStatus: 'pending' }),
            User.countDocuments({ role: 'ngo', verificationStatus: 'verified' }),
            Event.countDocuments(),
            Event.countDocuments({ status: { $in: ['upcoming', 'ongoing'] } })
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                volunteers,
                ngos,
                admins,
                pendingNgos,
                verifiedNgos,
                totalEvents,
                activeEvents
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    List users for admin dashboard
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAdminUsers = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
        const role = req.query.role;

        const query = role ? { role } : {};
        const users = await User.find(query)
            .select('name email role verificationStatus accountStatus createdAt')
            .sort('-createdAt')
            .limit(limit)
            .lean();

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Suspend or activate a volunteer/NGO account
// @route   PUT /api/admin/users/:id/account-status
// @access  Private/Admin
exports.updateUserAccountStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'suspended'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid account status' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ success: false, error: 'Cannot change status of admin accounts' });
        }

        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ success: false, error: 'Cannot change your own account status' });
        }

        const previousStatus = user.accountStatus || 'active';
        user.accountStatus = status;
        await user.save();

        await recordAudit({
            actor: req.user,
            action: status === 'suspended' ? 'user_suspended' : 'user_activated',
            targetType: 'user',
            targetId: user._id,
            payload: {
                userId: user._id.toString(),
                userName: user.name,
                userRole: user.role,
                previousStatus,
                newStatus: status
            }
        });

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
};

// @desc    Permanently remove a volunteer or NGO account
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.removeUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ success: false, error: 'Cannot remove admin accounts' });
        }

        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ success: false, error: 'Cannot remove your own account' });
        }

        const Event = require('../models/Event');
        const Attendance = require('../models/Attendance');

        if (user.role === 'ngo') {
            await Event.deleteMany({ organization: user._id });
        } else {
            await Event.updateMany(
                {},
                {
                    $pull: {
                        volunteersJoined: user._id,
                        waitlist: user._id
                    }
                }
            );
            await Attendance.deleteMany({ volunteer: user._id });
        }

        await recordAudit({
            actor: req.user,
            action: 'user_removed',
            targetType: 'user',
            targetId: user._id,
            payload: {
                userId: user._id.toString(),
                userName: user.name,
                userEmail: user.email,
                userRole: user.role
            }
        });

        await user.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
};

// @desc    Get admin audit log entries
// @route   GET /api/admin/audit-logs
// @access  Private/Admin
exports.getAuditLogs = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const logs = await AuditLog.find()
            .sort('-createdAt')
            .limit(limit)
            .lean();

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};
