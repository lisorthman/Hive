const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');
const CrisisResourceRequest = require('../models/CrisisResourceRequest');
const CrisisUpdate = require('../models/CrisisUpdate');
const {
    sendCrisisAlerts,
    sendCrisisStatusNotice,
    notifyResourceNeeded,
    notifyCrisisUpdate
} = require('../utils/crisisAlerts');
const { matchCrisisVolunteers } = require('../utils/matchCrisisVolunteers');
const { computeCrisisAnalytics, buildCrisisImpactDraft } = require('../utils/crisisAnalytics');
const { recordAudit } = require('../utils/auditLog');

const activeCrisisFilter = {
    missionMode: 'emergency',
    'crisis.crisisStatus': 'active',
    status: { $ne: 'cancelled' }
};

const assertMissionAccess = (mission, user) => {
    if (!mission || mission.missionMode !== 'emergency') {
        return { ok: false, status: 404, error: 'Emergency mission not found' };
    }
    const isOwner = mission.organization.toString() === user.id;
    const isPartner = (mission.crisis?.partnerNgos || []).some(
        (p) => p.ngo?.toString() === user.id && p.status === 'accepted'
    );
    if (user.role !== 'admin' && !isOwner && !isPartner) {
        return { ok: false, status: 403, error: 'Not authorized' };
    }
    return { ok: true, isOwner, isPartner };
};

// @desc    Active emergency missions for crisis map
// @route   GET /api/crisis/map
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

// @desc    Preview skill-matched volunteers for targeted alerts
// @route   GET /api/crisis/:eventId/matched-volunteers
exports.getMatchedVolunteers = async (req, res) => {
    try {
        const mission = await Event.findById(req.params.eventId);
        const access = assertMissionAccess(mission, req.user);
        if (!access.ok) {
            return res.status(access.status).json({ success: false, error: access.error });
        }

        const options = {
            skillsOnly: req.query.skillsOnly === 'true',
            maxRadiusKm: req.query.maxRadiusKm ? parseFloat(req.query.maxRadiusKm) : undefined,
            targetSkills: req.query.skills
                ? String(req.query.skills)
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                : undefined,
            limit: req.query.limit ? parseInt(req.query.limit, 10) : 50
        };

        const ranked = await matchCrisisVolunteers(mission, options);

        res.status(200).json({
            success: true,
            count: ranked.length,
            data: ranked.map((r) => ({
                _id: r.volunteer._id,
                name: r.volunteer.name,
                email: r.volunteer.email,
                skills: r.volunteer.skills,
                score: r.score,
                reasons: r.reasons
            }))
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Broadcast crisis alert (optionally targeted)
// @route   POST /api/crisis/:eventId/alert
exports.broadcastCrisisAlert = async (req, res) => {
    try {
        const mission = await Event.findById(req.params.eventId);
        const access = assertMissionAccess(mission, req.user);
        if (!access.ok) {
            return res.status(access.status).json({ success: false, error: access.error });
        }

        const options = {
            skillsOnly: req.body.skillsOnly === true,
            maxRadiusKm: req.body.maxRadiusKm,
            targetSkills: req.body.targetSkills,
            minScore: req.body.minScore,
            limit: req.body.limit,
            enforceRadius: req.body.enforceRadius === true,
            message: req.body.message
        };

        const result = await sendCrisisAlerts(mission, req.user, options);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update crisis status (active / stand_down / resolved)
// @route   PUT /api/crisis/:eventId/status
exports.updateCrisisStatus = async (req, res) => {
    try {
        const { crisisStatus, message } = req.body;
        if (!['active', 'stand_down', 'resolved'].includes(crisisStatus)) {
            return res.status(400).json({ success: false, error: 'Invalid crisis status' });
        }

        const mission = await Event.findById(req.params.eventId);
        const access = assertMissionAccess(mission, req.user);
        if (!access.ok) {
            return res.status(access.status).json({ success: false, error: access.error });
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

        let analytics = null;
        let impactDraft = null;
        if (crisisStatus === 'resolved') {
            analytics = await computeCrisisAnalytics(mission);
            impactDraft = buildCrisisImpactDraft(mission, analytics);
        }

        await recordAudit({
            actor: req.user,
            action: 'crisis_status_updated',
            targetType: 'event',
            targetId: mission._id,
            payload: { crisisStatus, title: mission.title }
        });

        res.status(200).json({
            success: true,
            data: mission,
            analytics,
            impactDraft
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Admin overview of all active crisis missions
// @route   GET /api/crisis/admin/overview
exports.getAdminCrisisOverview = async (req, res) => {
    try {
        const missions = await Event.find({
            missionMode: 'emergency',
            'crisis.crisisStatus': { $in: ['active', 'stand_down'] },
            status: { $ne: 'cancelled' }
        })
            .populate('organization', 'name email')
            .sort({ 'crisis.urgencyLevel': -1, createdAt: -1 })
            .lean();

        const withStats = await Promise.all(
            missions.map(async (m) => ({
                ...m,
                analytics: await computeCrisisAnalytics(m)
            }))
        );

        res.status(200).json({ success: true, count: withStats.length, data: withStats });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Public crisis summary (active or resolved emergencies)
// @route   GET /api/crisis/:eventId/summary
exports.getCrisisSummary = async (req, res) => {
    try {
        const mission = await Event.findById(req.params.eventId)
            .populate('organization', 'name')
            .lean();
        if (!mission || mission.missionMode !== 'emergency') {
            return res.status(404).json({ success: false, error: 'Crisis mission not found' });
        }

        const [analytics, updates, resources] = await Promise.all([
            computeCrisisAnalytics(mission),
            CrisisUpdate.find({ event: mission._id })
                .sort({ isPinned: -1, createdAt: -1 })
                .limit(20)
                .populate('author', 'name role')
                .lean(),
            CrisisResourceRequest.find({ event: mission._id, status: { $ne: 'cancelled' } })
                .select('item quantityNeeded unit status pledges priority')
                .lean()
        ]);

        res.status(200).json({
            success: true,
            data: {
                mission: {
                    _id: mission._id,
                    title: mission.title,
                    description: mission.description,
                    ngoName: mission.ngoName,
                    organization: mission.organization,
                    location: mission.location,
                    crisis: mission.crisis,
                    status: mission.status,
                    capacity: mission.capacity,
                    volunteersJoined: mission.volunteersJoined,
                    createdAt: mission.createdAt
                },
                analytics,
                updates,
                resources: resources.map((r) => ({
                    item: r.item,
                    quantityNeeded: r.quantityNeeded,
                    unit: r.unit,
                    status: r.status,
                    priority: r.priority,
                    pledged: (r.pledges || []).reduce((s, p) => s + (p.quantity || 0), 0)
                }))
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Situation updates timeline for a crisis
// @route   GET /api/crisis/:eventId/updates
exports.getCrisisUpdates = async (req, res) => {
    try {
        const mission = await Event.findById(req.params.eventId);
        if (!mission || mission.missionMode !== 'emergency') {
            return res.status(404).json({ success: false, error: 'Crisis mission not found' });
        }

        const updates = await CrisisUpdate.find({ event: mission._id })
            .sort({ isPinned: -1, createdAt: -1 })
            .populate('author', 'name role')
            .lean();

        res.status(200).json({ success: true, count: updates.length, data: updates });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Post a live situation update
// @route   POST /api/crisis/:eventId/updates
exports.createCrisisUpdate = async (req, res) => {
    try {
        const { message, isPinned, notifyVolunteers } = req.body;
        if (!message?.trim()) {
            return res.status(400).json({ success: false, error: 'message is required' });
        }

        const mission = await Event.findById(req.params.eventId);
        const access = assertMissionAccess(mission, req.user);
        if (!access.ok) {
            return res.status(access.status).json({ success: false, error: access.error });
        }

        const update = await CrisisUpdate.create({
            event: mission._id,
            author: req.user.id,
            message: message.trim().slice(0, 500),
            isPinned: isPinned === true
        });

        if (notifyVolunteers !== false) {
            await notifyCrisisUpdate(mission, req.user, update.message);
        }

        await update.populate('author', 'name role');

        res.status(201).json({ success: true, data: update });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Emergency response analytics for NGO command center
// @route   GET /api/crisis/:eventId/analytics
exports.getCrisisAnalytics = async (req, res) => {
    try {
        const mission = await Event.findById(req.params.eventId);
        const access = assertMissionAccess(mission, req.user);
        if (!access.ok) {
            return res.status(access.status).json({ success: false, error: access.error });
        }

        const analytics = await computeCrisisAnalytics(mission);
        res.status(200).json({ success: true, data: analytics });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Generate crisis impact story draft from response analytics
// @route   GET /api/crisis/:eventId/impact-draft
exports.getCrisisImpactDraft = async (req, res) => {
    try {
        const mission = await Event.findById(req.params.eventId);
        const access = assertMissionAccess(mission, req.user);
        if (!access.ok) {
            return res.status(access.status).json({ success: false, error: access.error });
        }

        const analytics = await computeCrisisAnalytics(mission);
        const draft = buildCrisisImpactDraft(mission, analytics);
        res.status(200).json({ success: true, data: { draft, analytics } });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Invite partner NGO to collaborate on crisis mission
// @route   POST /api/crisis/:eventId/partners
exports.invitePartnerNgo = async (req, res) => {
    try {
        const { ngoId, partnerEmail } = req.body;
        if (!ngoId && !partnerEmail) {
            return res.status(400).json({ success: false, error: 'ngoId or partnerEmail is required' });
        }

        const mission = await Event.findById(req.params.eventId);
        if (!mission || mission.missionMode !== 'emergency') {
            return res.status(404).json({ success: false, error: 'Emergency mission not found' });
        }
        if (req.user.role !== 'admin' && mission.organization.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Only mission owner can invite partners' });
        }

        const partner = ngoId
            ? await User.findOne({ _id: ngoId, role: 'ngo', verificationStatus: 'verified' })
            : await User.findOne({
                  email: String(partnerEmail).trim().toLowerCase(),
                  role: 'ngo',
                  verificationStatus: 'verified'
              });
        if (!partner) {
            return res.status(404).json({ success: false, error: 'Verified NGO not found' });
        }
        if (partner._id.toString() === mission.organization.toString()) {
            return res.status(400).json({ success: false, error: 'Cannot invite mission owner as partner' });
        }

        const partnerId = partner._id.toString();
        mission.crisis.partnerNgos = mission.crisis.partnerNgos || [];
        const exists = mission.crisis.partnerNgos.find((p) => p.ngo.toString() === partnerId);
        if (exists) {
            return res.status(400).json({ success: false, error: 'NGO already invited' });
        }

        mission.crisis.partnerNgos.push({ ngo: partner._id, status: 'pending' });
        await mission.save();

        await Notification.create({
            recipient: partner._id,
            sender: req.user.id,
            event: mission._id,
            type: 'crisis_partner_invite',
            message: `${req.user.name} invited you to collaborate on crisis mission: ${mission.title}`
        });

        res.status(200).json({ success: true, data: mission });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Partner NGO accepts or declines collaboration invite
// @route   PUT /api/crisis/:eventId/partners/respond
exports.respondPartnerInvite = async (req, res) => {
    try {
        const { response } = req.body;
        if (!['accepted', 'declined'].includes(response)) {
            return res.status(400).json({ success: false, error: 'response must be accepted or declined' });
        }

        const mission = await Event.findById(req.params.eventId);
        if (!mission || mission.missionMode !== 'emergency') {
            return res.status(404).json({ success: false, error: 'Emergency mission not found' });
        }

        const entry = (mission.crisis.partnerNgos || []).find(
            (p) => p.ngo.toString() === req.user.id
        );
        if (!entry) {
            return res.status(404).json({ success: false, error: 'No pending invite for your NGO' });
        }

        entry.status = response;
        await mission.save();

        if (response === 'accepted') {
            await Notification.create({
                recipient: mission.organization,
                sender: req.user.id,
                event: mission._id,
                type: 'crisis_partner_accepted',
                message: `${req.user.name} accepted collaboration on ${mission.title}`
            });
        }

        res.status(200).json({ success: true, data: mission });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    List resource requests for a crisis mission
// @route   GET /api/crisis/:eventId/resources
exports.listResourceRequests = async (req, res) => {
    try {
        const mission = await Event.findById(req.params.eventId);
        if (!mission || mission.missionMode !== 'emergency') {
            return res.status(404).json({ success: false, error: 'Emergency mission not found' });
        }

        const resources = await CrisisResourceRequest.find({
            event: mission._id,
            status: { $ne: 'cancelled' }
        })
            .populate('ngo', 'name')
            .populate('pledges.user', 'name')
            .sort({ priority: -1, createdAt: -1 });

        res.status(200).json({ success: true, count: resources.length, data: resources });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create resource request for crisis mission
// @route   POST /api/crisis/:eventId/resources
exports.createResourceRequest = async (req, res) => {
    try {
        const { item, quantityNeeded, unit, priority, notifyVolunteers } = req.body;
        if (!item?.trim() || !quantityNeeded) {
            return res.status(400).json({ success: false, error: 'item and quantityNeeded are required' });
        }

        const mission = await Event.findById(req.params.eventId);
        const access = assertMissionAccess(mission, req.user);
        if (!access.ok) {
            return res.status(access.status).json({ success: false, error: access.error });
        }

        const resource = await CrisisResourceRequest.create({
            event: mission._id,
            ngo: req.user.id,
            item: item.trim(),
            quantityNeeded: parseInt(quantityNeeded, 10),
            unit: unit?.trim() || 'units',
            priority: priority || 'medium'
        });

        if (notifyVolunteers !== false) {
            await notifyResourceNeeded(mission, req.user, resource);
        }

        res.status(201).json({ success: true, data: resource });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Pledge resources toward a request
// @route   POST /api/crisis/resources/:resourceId/pledge
exports.pledgeResource = async (req, res) => {
    try {
        const { quantity, note } = req.body;
        const qty = parseInt(quantity, 10);
        if (!qty || qty < 1) {
            return res.status(400).json({ success: false, error: 'quantity must be at least 1' });
        }

        const resource = await CrisisResourceRequest.findById(req.params.resourceId);
        if (!resource || resource.status === 'cancelled') {
            return res.status(404).json({ success: false, error: 'Resource request not found' });
        }

        resource.pledges.push({
            user: req.user.id,
            quantity: qty,
            note: note?.trim() || ''
        });

        const pledged = resource.pledges.reduce((s, p) => s + p.quantity, 0);
        if (pledged >= resource.quantityNeeded) {
            resource.status = 'fulfilled';
        }

        await resource.save();
        await resource.populate('pledges.user', 'name');

        res.status(200).json({ success: true, data: resource });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Cancel or mark resource request fulfilled
// @route   PUT /api/crisis/resources/:resourceId
exports.updateResourceRequest = async (req, res) => {
    try {
        const resource = await CrisisResourceRequest.findById(req.params.resourceId).populate('event');
        if (!resource) {
            return res.status(404).json({ success: false, error: 'Resource request not found' });
        }

        const mission = resource.event;
        const access = assertMissionAccess(mission, req.user);
        if (!access.ok) {
            return res.status(access.status).json({ success: false, error: access.error });
        }

        if (req.body.status) {
            resource.status = req.body.status;
        }
        await resource.save();

        res.status(200).json({ success: true, data: resource });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
