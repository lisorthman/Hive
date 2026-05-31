const Attendance = require('../models/Attendance');
const CrisisResourceRequest = require('../models/CrisisResourceRequest');
const CrisisUpdate = require('../models/CrisisUpdate');

/**
 * Compute emergency response analytics for a crisis mission.
 */
const computeCrisisAnalytics = async (mission) => {
    const eventId = mission._id;

    const [attendance, resources, updates, firstJoin, firstCheckIn] = await Promise.all([
        Attendance.find({ event: eventId }).lean(),
        CrisisResourceRequest.find({ event: eventId, status: { $ne: 'cancelled' } }).lean(),
        CrisisUpdate.countDocuments({ event: eventId }),
        Attendance.findOne({ event: eventId }).sort({ createdAt: 1 }).select('createdAt').lean(),
        Attendance.findOne({ event: eventId, status: 'checked-in', checkedInAt: { $ne: null } })
            .sort({ checkedInAt: 1 })
            .select('checkedInAt')
            .lean()
    ]);

    const joined = attendance.length;
    const checkedIn = attendance.filter((a) => a.status === 'checked-in').length;
    const totalHours = attendance.reduce((s, a) => s + (a.hoursWorked || 0), 0);

    const resourcesNeeded = resources.reduce((s, r) => s + (r.quantityNeeded || 0), 0);
    const resourcesPledged = resources.reduce(
        (s, r) => s + (r.pledges || []).reduce((ps, p) => ps + (p.quantity || 0), 0),
        0
    );
    const resourcesFulfilled = resources.filter((r) => r.status === 'fulfilled').length;

    const missionStart = mission.createdAt ? new Date(mission.createdAt).getTime() : null;
    const timeToFirstJoinMs =
        missionStart && firstJoin?.createdAt
            ? new Date(firstJoin.createdAt).getTime() - missionStart
            : null;
    const timeToFirstCheckInMs =
        missionStart && firstCheckIn?.checkedInAt
            ? new Date(firstCheckIn.checkedInAt).getTime() - missionStart
            : null;

    const deploymentRoles = {};
    attendance.forEach((a) => {
        if (a.deploymentRole) {
            deploymentRoles[a.deploymentRole] = (deploymentRoles[a.deploymentRole] || 0) + 1;
        }
    });

    return {
        volunteersJoined: mission.volunteersJoined?.length || joined,
        volunteersDeployed: checkedIn,
        volunteersRegistered: joined,
        totalHours,
        capacityFillRate:
            mission.capacity > 0
                ? Math.round(((mission.volunteersJoined?.length || 0) / mission.capacity) * 100)
                : 0,
        deploymentRate: joined > 0 ? Math.round((checkedIn / joined) * 100) : 0,
        resources: {
            requestCount: resources.length,
            itemsNeeded: resourcesNeeded,
            itemsPledged: resourcesPledged,
            fulfilledCount: resourcesFulfilled,
            pledgeRate:
                resourcesNeeded > 0 ? Math.round((resourcesPledged / resourcesNeeded) * 100) : 0
        },
        situationUpdates: updates,
        responseTime: {
            timeToFirstJoinMinutes:
                timeToFirstJoinMs != null ? Math.round(timeToFirstJoinMs / 60000) : null,
            timeToFirstCheckInMinutes:
                timeToFirstCheckInMs != null ? Math.round(timeToFirstCheckInMs / 60000) : null
        },
        deploymentRoles,
        crisisStatus: mission.crisis?.crisisStatus || 'active',
        resolvedAt: mission.crisis?.crisisStatus === 'resolved' ? mission.updatedAt : null
    };
};

const buildCrisisImpactDraft = (mission, analytics) => {
    const area = mission.crisis?.affectedAreaName || mission.location?.name || 'the affected area';
    const disaster = mission.crisis?.disasterType || 'crisis';
    const hours = analytics.totalHours || 0;
    const deployed = analytics.volunteersDeployed || 0;
    const pledged = analytics.resources.itemsPledged || 0;

    return {
        title: `${mission.title} — Crisis Response Summary`,
        description: `During this ${disaster} response in ${area}, ${deployed} volunteers deployed and contributed ${hours} hours of emergency support. Community members pledged ${pledged} resource units toward urgent needs. Thank you to every volunteer and partner who responded when the community needed help most.`,
        hashtags: ['CrisisResponse', 'HiveCrisisHub', mission.category, 'Community'],
        taggedVolunteers: []
    };
};

module.exports = { computeCrisisAnalytics, buildCrisisImpactDraft };
