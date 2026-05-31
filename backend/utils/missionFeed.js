const Event = require('../models/Event');
const EventInstance = require('../models/EventInstance');

const instanceParticipationQuery = (userId) => ({
    $or: [
        { volunteersJoined: userId },
        { waitlist: userId },
        { 'shiftSlots.volunteersJoined': userId },
        { 'shiftSlots.waitlist': userId }
    ]
});

const toFeedItem = (doc, missionType) => {
    const obj = doc.toObject ? doc.toObject() : doc;
    return { ...obj, missionType };
};

const fetchDiscoveryFeed = async () => {
    const [events, instances] = await Promise.all([
        Event.find().populate({ path: 'organization', select: 'name email' }),
        EventInstance.find({ status: { $ne: 'cancelled' } })
            .populate({ path: 'organization', select: 'name email' })
            .populate({ path: 'series', select: 'title recurrence' })
    ]);

    const feed = [
        ...events.map((e) => toFeedItem(e, 'event')),
        ...instances.map((i) => toFeedItem(i, 'instance'))
    ];

    feed.sort((a, b) => {
        const aEmergency =
            a.missionMode === 'emergency' && a.crisis?.crisisStatus === 'active' ? 1 : 0;
        const bEmergency =
            b.missionMode === 'emergency' && b.crisis?.crisisStatus === 'active' ? 1 : 0;
        if (bEmergency !== aEmergency) return bEmergency - aEmergency;
        return new Date(a.date) - new Date(b.date);
    });
    return feed;
};

const eventParticipationQuery = (userId) => ({
    $or: [
        { volunteersJoined: userId },
        { waitlist: userId },
        { 'shiftSlots.volunteersJoined': userId },
        { 'shiftSlots.waitlist': userId }
    ]
});

const fetchJoinedMissions = async (userId) => {
    const [events, instances] = await Promise.all([
        Event.find(eventParticipationQuery(userId)).populate({
            path: 'organization',
            select: 'name email'
        }),
        EventInstance.find(instanceParticipationQuery(userId))
            .populate({ path: 'organization', select: 'name email' })
            .populate({ path: 'series', select: 'title recurrence' })
    ]);

    return [
        ...events.map((e) => toFeedItem(e, 'event')),
        ...instances.map((i) => toFeedItem(i, 'instance'))
    ];
};

const fetchWaitlistedMissions = async (userId) => {
    const [events, instances] = await Promise.all([
        Event.find({ waitlist: userId }).populate({
            path: 'organization',
            select: 'name email'
        }),
        EventInstance.find({
            $or: [{ waitlist: userId }, { 'shiftSlots.waitlist': userId }]
        })
            .populate({ path: 'organization', select: 'name email' })
            .populate({ path: 'series', select: 'title recurrence' })
    ]);

    return [
        ...events.map((e) => toFeedItem(e, 'event')),
        ...instances.map((i) => toFeedItem(i, 'instance'))
    ];
};

module.exports = {
    instanceParticipationQuery,
    eventParticipationQuery,
    toFeedItem,
    fetchDiscoveryFeed,
    fetchJoinedMissions,
    fetchWaitlistedMissions
};
