const ImpactComment = require('../models/ImpactComment');
const ImpactPost = require('../models/ImpactPost');
const ImpactReport = require('../models/ImpactReport');
const Notification = require('../models/Notification');
const { recordAudit } = require('../utils/auditLog');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

const ensureVerifiedVolunteer = async (userId) => {
    const user = await User.findById(userId).select('role emailVerified');
    if (!user || user.role !== 'volunteer' || !user.emailVerified) return false;
    const checkedIn = await Attendance.exists({ volunteer: userId, status: 'checked-in' });
    return !!checkedIn;
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

// @desc    Get comments for impact post
// @route   GET /api/impact-comments/post/:postId
// @access  Private
exports.getImpactComments = async (req, res) => {
    try {
        const flat = await ImpactComment.find({
            post: req.params.postId,
            isDeleted: false
        })
            .populate('author', 'name role')
            .sort({ createdAt: 1 })
            .lean();
        res.status(200).json({ success: true, data: nestComments(flat) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create impact comment
// @route   POST /api/impact-comments
// @access  Private
exports.createImpactComment = async (req, res) => {
    try {
        const { postId, text, parentComment } = req.body;
        if (!postId) return res.status(400).json({ success: false, error: 'postId is required' });
        if (!text?.trim())
            return res.status(400).json({ success: false, error: 'Comment text is required' });

        const post = await ImpactPost.findById(postId);
        if (!post || post.isDeleted) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        if (req.user.role === 'volunteer') {
            const ok = await ensureVerifiedVolunteer(req.user.id);
            if (!ok) {
                return res.status(403).json({
                    success: false,
                    error: 'Only verified volunteers can comment on impact stories'
                });
            }
        }

        const comment = await ImpactComment.create({
            post: postId,
            author: req.user.id,
            text: text.trim(),
            parentComment: parentComment || null
        });
        post.commentsCount += 1;
        await post.save();

        if (post.ngo.toString() !== req.user.id) {
            await Notification.create({
                recipient: post.ngo,
                sender: req.user.id,
                impactPost: post._id,
                type: 'impact_story_commented',
                message: `${req.user.name} commented on your impact story "${post.title}"`
            });
        }

        const populated = await ImpactComment.findById(comment._id).populate('author', 'name role');
        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Delete impact comment
// @route   DELETE /api/impact-comments/:id
// @access  Private
exports.deleteImpactComment = async (req, res) => {
    try {
        const comment = await ImpactComment.findById(req.params.id);
        if (!comment || comment.isDeleted) {
            return res.status(404).json({ success: false, error: 'Comment not found' });
        }
        const isAdmin = req.user.role === 'admin';
        const isAuthor = comment.author.toString() === req.user.id;
        if (!isAdmin && !isAuthor) {
            return res.status(403).json({ success: false, error: 'Not authorized to delete comment' });
        }

        comment.isDeleted = true;
        comment.deletedAt = new Date();
        comment.deletedBy = req.user.id;
        await comment.save();

        const post = await ImpactPost.findById(comment.post);
        if (post && post.commentsCount > 0) {
            post.commentsCount -= 1;
            await post.save();
        }

        await recordAudit({
            actor: req.user,
            action: 'impact_comment_deleted',
            targetType: 'impact_comment',
            targetId: comment._id,
            payload: {
                commentId: comment._id.toString(),
                postId: comment.post.toString()
            }
        });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Report impact comment
// @route   POST /api/impact-comments/:id/report
// @access  Private
exports.reportImpactComment = async (req, res) => {
    try {
        const comment = await ImpactComment.findById(req.params.id);
        if (!comment || comment.isDeleted) {
            return res.status(404).json({ success: false, error: 'Comment not found' });
        }
        await ImpactReport.findOneAndUpdate(
            { reporter: req.user.id, targetType: 'impact_comment', targetId: comment._id },
            { $set: { reason: req.body.reason || '', status: 'open' } },
            { upsert: true, new: true }
        );
        comment.reportsCount += 1;
        await comment.save();

        await recordAudit({
            actor: req.user,
            action: 'impact_content_flagged',
            targetType: 'impact_comment',
            targetId: comment._id,
            payload: {
                commentId: comment._id.toString(),
                reason: req.body.reason || ''
            }
        });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
