const Event = require('../models/Event');
const EventComment = require('../models/EventComment');
const Attendance = require('../models/Attendance');
const { recordAudit } = require('../utils/auditLog');

const canParticipateInDiscussion = async (event, user) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (event.organization.toString() === user.id) return true;

    const joined = event.volunteersJoined.some(
        (id) => id.toString() === user.id
    );
    if (joined) return true;

    const attendance = await Attendance.findOne({
        event: event._id,
        volunteer: user.id
    });
    return !!attendance;
};

const collectDescendantIds = async (rootId) => {
    const descendants = [];
    let frontier = [rootId];
    while (frontier.length) {
        const children = await EventComment.find({ parentComment: { $in: frontier } })
            .select('_id')
            .lean();
        if (!children.length) break;
        frontier = children.map((c) => c._id);
        for (const c of children) {
            descendants.push(c._id);
        }
    }
    return [rootId, ...descendants];
};

const nestComments = (flatDocs) => {
    const plain = flatDocs.map((c) => ({ ...c }));
    const byParent = {};
    for (const c of plain) {
        const key = c.parentComment ? c.parentComment.toString() : 'root';
        if (!byParent[key]) byParent[key] = [];
        byParent[key].push(c);
    }
    const attachReplies = (c) => ({
        ...c,
        replies: (byParent[c._id.toString()] || []).map(attachReplies)
    });
    return (byParent.root || []).map(attachReplies);
};

// @desc    Get threaded comments for an event
// @route   GET /api/comments/event/:eventId
// @access  Public
exports.getEventComments = async (req, res) => {
    try {
        const flat = await EventComment.find({ event: req.params.eventId })
            .populate({ path: 'author', select: 'name role' })
            .sort({ createdAt: 1 })
            .lean();

        const threads = nestComments(flat);

        res.status(200).json({
            success: true,
            count: flat.length,
            data: threads
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Post a comment or reply on an event discussion board
// @route   POST /api/comments/event/:eventId
// @access  Private (joined volunteer, host NGO, admin)
exports.createEventComment = async (req, res) => {
    try {
        const { body, parentComment } = req.body;
        if (!body || !body.trim()) {
            return res.status(400).json({ success: false, error: 'Comment body is required' });
        }

        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const allowed = await canParticipateInDiscussion(event, req.user);
        if (!allowed) {
            return res.status(403).json({
                success: false,
                error: 'You must join this mission to participate in the discussion'
            });
        }

        if (parentComment) {
            const parent = await EventComment.findById(parentComment);
            if (!parent || parent.event.toString() !== req.params.eventId) {
                return res.status(400).json({ success: false, error: 'Invalid parent comment' });
            }
        }

        const comment = await EventComment.create({
            event: req.params.eventId,
            author: req.user.id,
            body: body.trim(),
            parentComment: parentComment || null
        });

        const populated = await EventComment.findById(comment._id).populate({
            path: 'author',
            select: 'name role'
        });

        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Delete a comment and all nested replies
// @route   DELETE /api/comments/:id
// @access  Private (admin)
exports.deleteEventComment = async (req, res) => {
    try {
        const comment = await EventComment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ success: false, error: 'Comment not found' });
        }

        const isAdmin = req.user.role === 'admin';

        if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Only administrators can delete comments' });
        }

        const ids = await collectDescendantIds(comment._id);
        await EventComment.deleteMany({ _id: { $in: ids } });

        await recordAudit({
            actor: req.user,
            action: 'comment_deleted',
            targetType: 'comment',
            targetId: comment._id,
            payload: {
                commentId: comment._id.toString(),
                eventId: comment.event.toString(),
                deletedCount: ids.length
            }
        });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
