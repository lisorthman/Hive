const Event = require('../models/Event');
const { sendCrisisAlerts, sendCrisisStatusNotice } = require('../utils/crisisAlerts');
const { recordAudit } = require('../utils/auditLog');

const activeCrisisFilter = {
    missionMode: 'emergency',
    'crisis.crisisStatus': 'active',
    status: { $ne: 'cancelled' }
};

// @desc    Active emergency missions for crisis map
// @route   GET /api/crisis/map
// @access  Public (auth optional for richer data)
exports.getCrisisMap = async (req, res) => {
    try {
        const missions = await Event.find(activeCrisisFilter)
            .populate('organization', 'name')
            .sort({ 'crisis.urgencyLevel': -1, date: 1 })
            .lean();

        const urgencyRank = { critical: 4, high: 3, medium: 2, low: 1 };
        missions.sort(
            (a, b) =>
                (urgencyRank[b.crisis?.urgencyLevel] || 0) -
                (urgencyRank[a.crisis?.urgencyLevel] || 0)
        );

        res.status(200).json({
            success: true,
            count: missions.length,
            data: missions.map((m) => ({
                ...m,
                spotsLeft: Math.max(0, m.capacity - (m.volunteersJoined?.length || 0))
            }))
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Broadcast crisis alert to opted-in volunteers
// @route   POST /api/crisis/:eventId/alert
// @access  Private (NGO owner / Admin)
exports.broadcastCrisisAlert = async (req, res) => {
    try {
        const mission = await Event.findById(req.params.eventId);
        if (!mission || mission.missionMode !== 'emergency') {
            return res.status(404).json({ success: false, error: 'Emergency mission not found' });
        }
        if (
            req.user.role !== 'admin' &&
            mission.organization.toString() !== req.user.id
        ) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const result = await sendCrisisAlerts(mission, req.user);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update crisis status (active / stand_down / resolved)
// @route   PUT /api/crisis/:eventId/status
// @access  Private (NGO owner / Admin)
exports.updateCrisisStatus = async (req, res) => {
    try {
        const { crisisStatus, message } = req.body;
        if (!['active', 'stand_down', 'resolved'].includes(crisisStatus)) {
            return res.status(400).json({ success: false, error: 'Invalid crisis status' });
        }

        const mission = await Event.findById(req.params.eventId);
        if (!mission || mission.missionMode !== 'emergency') {
            return res.status(404).json({ success: false, error: 'Emergency mission not found' });
        }
        if (
            req.user.role !== 'admin' &&
            mission.organization.toString() !== req.user.id
        ) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        mission.crisis.crisisStatus = crisisStatus;
        if (crisisStatus === 'resolved') {
            mission.status = 'completed';
        } else if (crisisStatus === 'active') {
            mission.status = 'ongoing';
        }
        await mission.save();

        if (crisisStatus === 'stand_down') {
            await sendCrisisStatusNotice(mission, req.user, 'crisis_stand_down', message);
        } else if (crisisStatus === 'resolved') {
            await sendCrisisStatusNotice(mission, req.user, 'crisis_resolved', message);
        }

        await recordAudit({
            actor: req.user,
            action: 'crisis_status_updated',
            targetType: 'event',
            targetId: mission._id,
            payload: { crisisStatus, title: mission.title }
        });

        res.status(200).json({ success: true, data: mission });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
