const ImpactPost = require('../models/ImpactPost');
const ImpactComment = require('../models/ImpactComment');
const ImpactReport = require('../models/ImpactReport');
const Event = require('../models/Event');
const EventInstance = require('../models/EventInstance');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { recordAudit } = require('../utils/auditLog');

const normalizeHashtags = (tags = []) =>
    tags
        .map((t) => String(t || '').trim().replace(/^#/, ''))
        .filter(Boolean)
        .slice(0, 10);

const isVerifiedVolunteer = async (userId) => {
    const user = await User.findById(userId).select('role emailVerified');
    if (!user || user.role !== 'volunteer' || !user.emailVerified) return false;
    const checkedIn = await Attendance.exists({ volunteer: userId, status: 'checked-in' });
    return !!checkedIn;
};

const getMissionForDraft = async (eventId) => {
    const event = await Event.findById(eventId).lean();
    if (event) return { mission: event, missionType: 'event' };
    const instance = await EventInstance.findById(eventId).lean();
    if (instance) return { mission: instance, missionType: 'instance' };
    return null;
};

const getCheckedInVolunteerIds = async ({ eventId, eventInstanceId }) => {
    const query = { status: 'checked-in' };
    if (eventId) query.event = eventId;
    if (eventInstanceId) query.eventInstance = eventInstanceId;
    const records = await Attendance.find(query).select('volunteer').lean();
    return new Set(records.map((r) => r.volunteer.toString()));
};

// @desc    Generate rule-based impact story draft from mission completion stats
// @route   POST /api/impact-posts/draft-from-event/:eventId
// @access  Private (NGO/Admin)
exports.generateDraftFromEvent = async (req, res) => {
    try {
        const match = await getMissionForDraft(req.params.eventId);
        if (!match) return res.status(404).json({ success: false, error: 'Mission not found' });

        const { mission, missionType } = match;
        if (
            req.user.role !== 'admin' &&
            mission.organization?.toString() !== req.user.id &&
            mission.ngo?.toString() !== req.user.id
        ) {
            return res.status(403).json({ success: false, error: 'Not authorized for this mission' });
        }

        const attendanceQuery =
            missionType === 'event'
                ? { event: mission._id, status: 'checked-in' }
                : { eventInstance: mission._id, status: 'checked-in' };
        const checked = await Attendance.find(attendanceQuery).lean();
        const volunteerCount = checked.length;
        const totalHours = checked.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

        const draft = {
            title: `${mission.title} Impact Story`,
            description: `Today, ${volunteerCount} volunteers contributed ${totalHours} total hours for ${mission.category || 'community'} impact at ${mission.location?.name || 'our mission site'}. Thank you to everyone who showed up and served with purpose.`,
            hashtags: normalizeHashtags([mission.category, 'HiveImpact', 'Community']),
            taggedVolunteers: []
        };

        res.status(200).json({ success: true, data: draft });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Create impact post
// @route   POST /api/impact-posts
// @access  Private (Verified NGO/Admin)
exports.createImpactPost = async (req, res) => {
    try {
        const {
            title,
            description,
            event,
            eventInstance,
            photos = [],
            taggedVolunteers = [],
            hashtags = [],
            visibility = 'public'
        } = req.body;

        if (!title?.trim() || !description?.trim()) {
            return res.status(400).json({ success: false, error: 'Title and description are required' });
        }
        if (!event && !eventInstance) {
            return res.status(400).json({ success: false, error: 'Attach an event or instance' });
        }

        let mission = null;
        let checkedInSet = new Set();
        if (event) {
            mission = await Event.findById(event).select('organization title');
            if (!mission) return res.status(404).json({ success: false, error: 'Event not found' });
            checkedInSet = await getCheckedInVolunteerIds({ eventId: event });
        } else if (eventInstance) {
            mission = await EventInstance.findById(eventInstance).select('organization title');
            if (!mission)
                return res.status(404).json({ success: false, error: 'Event instance not found' });
            checkedInSet = await getCheckedInVolunteerIds({ eventInstanceId: eventInstance });
        }

        if (req.user.role !== 'admin' && mission.organization.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Not authorized for this mission' });
        }

        const sanitizedTagged = [];
        for (const volunteerId of taggedVolunteers) {
            const vid = volunteerId.toString();
            if (!checkedInSet.has(vid)) continue;
            const volunteer = await User.findById(vid).select('allowStoryTagging role');
            if (!volunteer || volunteer.role !== 'volunteer' || !volunteer.allowStoryTagging) continue;
            sanitizedTagged.push(volunteerId);
        }

        const post = await ImpactPost.create({
            ngo: req.user.id,
            event: event || null,
            eventInstance: eventInstance || null,
            title: title.trim(),
            description: description.trim(),
            photos: photos.slice(0, 10),
            taggedVolunteers: sanitizedTagged,
            hashtags: normalizeHashtags(hashtags),
            visibility
        });

        if (sanitizedTagged.length) {
            await Notification.insertMany(
                sanitizedTagged.map((recipientId) => ({
                    recipient: recipientId,
                    sender: req.user.id,
                    impactPost: post._id,
                    type: 'impact_story_tagged',
                    message: `${req.user.name} recognized you in an impact story: "${post.title}"`
                }))
            );
        }

        const populated = await ImpactPost.findById(post._id)
            .populate('ngo', 'name')
            .populate('taggedVolunteers', 'name');

        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Volunteers who can be tagged on an impact story for a mission
// @route   GET /api/impact-posts/taggable-volunteers
// @access  Private (Verified NGO/Admin)
exports.getTaggableVolunteers = async (req, res) => {
    try {
        const { eventId, eventInstanceId } = req.query;
        if (!eventId && !eventInstanceId) {
            return res.status(400).json({
                success: false,
                error: 'Provide eventId or eventInstanceId'
            });
        }

        let mission = null;
        if (eventId) {
            mission = await Event.findById(eventId).select('organization title').lean();
        } else {
            mission = await EventInstance.findById(eventInstanceId).select('organization title').lean();
        }
        if (!mission) {
            return res.status(404).json({ success: false, error: 'Mission not found' });
        }

        if (req.user.role !== 'admin' && mission.organization.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Not authorized for this mission' });
        }

        const checkedInSet = await getCheckedInVolunteerIds({
            eventId: eventId || undefined,
            eventInstanceId: eventInstanceId || undefined
        });
        const volunteerIds = [...checkedInSet];
        if (!volunteerIds.length) {
            return res.status(200).json({ success: true, data: [] });
        }

        const volunteers = await User.find({
            _id: { $in: volunteerIds },
            role: 'volunteer',
            allowStoryTagging: true
        })
            .select('name email')
            .sort({ name: 1 })
            .lean();

        res.status(200).json({ success: true, data: volunteers });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Upload impact post photos
// @route   POST /api/impact-posts/upload-photos
// @access  Private (Verified NGO/Admin)
exports.uploadImpactPhotos = async (req, res) => {
    try {
        const files = req.files || [];
        const urls = files.map((f) => `/uploads/impact/${f.filename}`);
        res.status(200).json({ success: true, data: urls });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get impact feed posts
// @route   GET /api/impact-posts
// @access  Private
exports.getImpactPosts = async (req, res) => {
    try {
        const {
            category,
            hashtag,
            ngo,
            q,
            cursor,
            limit = 15,
            volunteerId,
            featured,
            eventId,
            eventInstanceId
        } = req.query;
        const parsedLimit = Math.min(parseInt(limit, 10) || 15, 50);

        const query = { isDeleted: false };
        if (ngo) query.ngo = ngo;
        if (hashtag) query.hashtags = hashtag.replace(/^#/, '');
        if (cursor) query.createdAt = { $lt: new Date(cursor) };
        if (q?.trim()) {
            query.$or = [
                { title: { $regex: q.trim(), $options: 'i' } },
                { description: { $regex: q.trim(), $options: 'i' } }
            ];
        }
        if (category?.trim()) query.hashtags = category;
        if (featured === 'true') query.likesCount = { $gte: 10 };
        if (eventId) query.event = eventId;
        if (eventInstanceId) query.eventInstance = eventInstanceId;

        if (volunteerId) {
            query.taggedVolunteers = volunteerId;
        }

        const posts = await ImpactPost.find(query)
            .sort({ createdAt: -1 })
            .limit(parsedLimit)
            .populate('ngo', 'name')
            .populate('taggedVolunteers', 'name')
            .lean();

        res.status(200).json({
            success: true,
            count: posts.length,
            nextCursor: posts.length ? posts[posts.length - 1].createdAt : null,
            data: posts
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single impact post
// @route   GET /api/impact-posts/:id
// @access  Private
exports.getImpactPost = async (req, res) => {
    try {
        const post = await ImpactPost.findById(req.params.id)
            .populate('ngo', 'name')
            .populate('taggedVolunteers', 'name');
        if (!post || post.isDeleted) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }
        res.status(200).json({ success: true, data: post });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Like impact post
// @route   POST /api/impact-posts/:id/like
// @access  Private (Verified volunteer/admin)
exports.likeImpactPost = async (req, res) => {
    try {
        if (req.user.role === 'volunteer') {
            const ok = await isVerifiedVolunteer(req.user.id);
            if (!ok) {
                return res.status(403).json({
                    success: false,
                    error: 'Only verified volunteers can like impact stories'
                });
            }
        }
        const post = await ImpactPost.findById(req.params.id);
        if (!post || post.isDeleted) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        const already = post.likes.some((id) => id.toString() === req.user.id);
        if (!already) {
            post.likes.push(req.user.id);
            post.likesCount = post.likes.length;
            await post.save();
        }

        if (post.ngo.toString() !== req.user.id) {
            await Notification.create({
                recipient: post.ngo,
                sender: req.user.id,
                impactPost: post._id,
                type: 'impact_story_liked',
                message: `${req.user.name} liked your impact story "${post.title}"`
            });
        }

        res.status(200).json({ success: true, data: { likesCount: post.likesCount } });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Unlike impact post
// @route   DELETE /api/impact-posts/:id/like
// @access  Private
exports.unlikeImpactPost = async (req, res) => {
    try {
        const post = await ImpactPost.findById(req.params.id);
        if (!post || post.isDeleted) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }
        post.likes = post.likes.filter((id) => id.toString() !== req.user.id);
        post.likesCount = post.likes.length;
        await post.save();

        res.status(200).json({ success: true, data: { likesCount: post.likesCount } });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Save post to own profile
// @route   POST /api/impact-posts/:id/save
// @access  Private
exports.saveImpactPost = async (req, res) => {
    try {
        const post = await ImpactPost.findById(req.params.id);
        if (!post || post.isDeleted) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }
        post.savesCount += 1;
        await post.save();
        res.status(200).json({ success: true, data: { savesCount: post.savesCount } });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Share post
// @route   POST /api/impact-posts/:id/share
// @access  Private
exports.shareImpactPost = async (req, res) => {
    try {
        const post = await ImpactPost.findById(req.params.id);
        if (!post || post.isDeleted) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }
        post.sharesCount += 1;
        await post.save();
        res.status(200).json({ success: true, data: { sharesCount: post.sharesCount } });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Report impact post
// @route   POST /api/impact-posts/:id/report
// @access  Private
exports.reportImpactPost = async (req, res) => {
    try {
        const post = await ImpactPost.findById(req.params.id);
        if (!post || post.isDeleted) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }
        const report = await ImpactReport.findOneAndUpdate(
            { reporter: req.user.id, targetType: 'impact_post', targetId: post._id },
            { $set: { reason: req.body.reason || '', status: 'open' } },
            { upsert: true, new: true }
        );
        post.reportsCount += 1;
        await post.save();

        await recordAudit({
            actor: req.user,
            action: 'impact_content_flagged',
            targetType: 'impact_post',
            targetId: post._id,
            payload: {
                reportId: report._id.toString(),
                postId: post._id.toString(),
                reason: req.body.reason || ''
            }
        });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Delete impact post (owner/admin soft delete)
// @route   DELETE /api/impact-posts/:id
// @access  Private
exports.deleteImpactPost = async (req, res) => {
    try {
        const post = await ImpactPost.findById(req.params.id);
        if (!post || post.isDeleted) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }
        const isOwner = post.ngo.toString() === req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, error: 'Not authorized to delete this post' });
        }

        post.isDeleted = true;
        post.deletedAt = new Date();
        post.deletedBy = req.user.id;
        await post.save();
        await ImpactComment.updateMany(
            { post: post._id },
            { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: req.user.id } }
        );

        await recordAudit({
            actor: req.user,
            action: 'impact_post_deleted',
            targetType: 'impact_post',
            targetId: post._id,
            payload: {
                postId: post._id.toString(),
                deletedByRole: req.user.role
            }
        });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Volunteer activity timeline
// @route   GET /api/impact-posts/activity/:volunteerId
// @access  Private
exports.getVolunteerActivity = async (req, res) => {
    try {
        const volunteerId = req.params.volunteerId;
        const [taggedPosts, attendance, comments] = await Promise.all([
            ImpactPost.find({ taggedVolunteers: volunteerId, isDeleted: false })
                .sort({ createdAt: -1 })
                .limit(20)
                .populate('ngo', 'name')
                .lean(),
            Attendance.find({ volunteer: volunteerId, status: 'checked-in' })
                .sort({ createdAt: -1 })
                .limit(20)
                .populate('event', 'title date')
                .populate('eventInstance', 'title date')
                .lean()
            ,
            ImpactComment.find({ author: volunteerId, isDeleted: false })
                .sort({ createdAt: -1 })
                .limit(20)
                .populate('post', 'title')
                .lean()
        ]);

        res.status(200).json({
            success: true,
            data: {
                taggedPosts,
                completedMissions: attendance.map((a) => ({
                    missionType: a.eventInstance ? 'instance' : 'event',
                    title: a.event?.title || a.eventInstance?.title || 'Mission',
                    date: a.event?.date || a.eventInstance?.date || a.createdAt,
                    hoursWorked: a.hoursWorked || 0
                })),
                recentComments: comments.map((c) => ({
                    commentId: c._id,
                    postId: c.post?._id || null,
                    postTitle: c.post?.title || 'Impact post',
                    text: c.text,
                    createdAt: c.createdAt
                }))
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Trending impact posts
// @route   GET /api/impact-posts/trending
// @access  Private
exports.getTrendingImpactPosts = async (req, res) => {
    try {
        const posts = await ImpactPost.find({ isDeleted: false })
            .sort({ likesCount: -1, commentsCount: -1, createdAt: -1 })
            .limit(12)
            .populate('ngo', 'name')
            .lean();
        res.status(200).json({ success: true, data: posts });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Admin moderation queue
// @route   GET /api/impact-posts/reports/open
// @access  Private (Admin)
exports.getOpenReports = async (req, res) => {
    try {
        const reports = await ImpactReport.find({ status: 'open' })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('reporter', 'name role')
            .lean();
        res.status(200).json({ success: true, data: reports });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Resolve moderation report
// @route   PUT /api/impact-posts/reports/:id
// @access  Private (Admin)
exports.resolveReport = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }
        const report = await ImpactReport.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
        res.status(200).json({ success: true, data: report });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
