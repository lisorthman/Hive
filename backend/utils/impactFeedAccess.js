const Attendance = require('../models/Attendance');
const Event = require('../models/Event');

/** Event/instance IDs this volunteer is tied to (checked-in, joined, or tagged). */
const getVolunteerMissionIds = async (volunteerId) => {
    const vid = volunteerId.toString();
    const [attendance, joinedEvents] = await Promise.all([
        Attendance.find({ volunteer: volunteerId }).select('event eventInstance').lean(),
        Event.find({
            $or: [{ volunteersJoined: volunteerId }, { waitlist: volunteerId }]
        })
            .select('_id')
            .lean()
    ]);

    const eventIds = new Set(joinedEvents.map((e) => e._id.toString()));
    const instanceIds = new Set();

    for (const row of attendance) {
        if (row.event) eventIds.add(row.event.toString());
        if (row.eventInstance) instanceIds.add(row.eventInstance.toString());
    }

    return {
        eventIds: [...eventIds],
        instanceIds: [...instanceIds],
        volunteerId: vid
    };
};

const buildVolunteerVisibilityFilter = async (volunteerId) => {
    const { eventIds, instanceIds } = await getVolunteerMissionIds(volunteerId);
    const or = [{ visibility: 'public' }, { taggedVolunteers: volunteerId }];

    if (eventIds.length) {
        or.push({ visibility: 'community', event: { $in: eventIds } });
    }
    if (instanceIds.length) {
        or.push({ visibility: 'community', eventInstance: { $in: instanceIds } });
    }

    return { $or: or };
};

const buildNgoVisibilityFilter = (ngoId) => ({
    $or: [{ visibility: 'public' }, { ngo: ngoId }]
});

const canPublishImpactStory = async ({ mission, missionType, checkedInCount, userRole }) => {
    if (userRole === 'admin') return { ok: true };
    const status = mission.status || 'upcoming';
    if (status !== 'completed' && checkedInCount < 1) {
        return {
            ok: false,
            error:
                'Publish impact stories after the mission is completed or at least one volunteer is checked in.'
        };
    }
    if (status !== 'completed') {
        return {
            ok: false,
            error: 'Mark the mission as completed before publishing an impact story.'
        };
    }
    return { ok: true, missionType };
};

module.exports = {
    getVolunteerMissionIds,
    buildVolunteerVisibilityFilter,
    buildNgoVisibilityFilter,
    canPublishImpactStory
};
