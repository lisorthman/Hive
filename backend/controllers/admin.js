const User = require('../models/User');
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
