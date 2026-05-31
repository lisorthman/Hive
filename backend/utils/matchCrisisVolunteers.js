const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { haversineKm } = require('./recommendEvents');
const { skillMatches, matchesAvailabilityWindow } = require('./crisisAlerts');

const scoreVolunteer = (volunteer, mission, options = {}) => {
    const crisis = mission.crisis || {};
    const requiredSkills = options.targetSkills?.length
        ? options.targetSkills
        : crisis.requiredSkills || [];
    const missionCoords = mission.location?.coordinates;
    const maxRadius = options.maxRadiusKm ?? crisis.radiusKm ?? 25;

    if (!volunteer.emergencyProfile?.availableForEmergencies) {
        return null;
    }
    if (!matchesAvailabilityWindow(volunteer.emergencyProfile?.availabilityWindow)) {
        return null;
    }

    let score = 0;
    const reasons = [];

    const skills = volunteer.skills || [];
    if (requiredSkills.length) {
        if (!skillMatches(skills, requiredSkills)) {
            if (options.skillsOnly) return null;
        } else {
            score += 40;
            reasons.push('Matching skills');
        }
    } else {
        score += 10;
    }

    const volRadius = volunteer.emergencyProfile?.maxRadiusKm ?? 25;
    if (missionCoords?.length >= 2 && volunteer.location?.coordinates?.length >= 2) {
        const [mLng, mLat] = missionCoords;
        const [vLng, vLat] = volunteer.location.coordinates;
        const km = haversineKm(vLat, vLng, mLat, mLng);
        if (km > Math.min(maxRadius, volRadius)) {
            if (options.enforceRadius) return null;
        } else if (km < 5) {
            score += 30;
            reasons.push('Very close');
        } else if (km < 15) {
            score += 22;
            reasons.push('Nearby');
        } else if (km < maxRadius) {
            score += 12;
            reasons.push('Within radius');
        }
    } else {
        score += 8;
    }

    if (volunteer.emergencyProfile?.remoteSupportOk && crisis.deploymentMode === 'standard') {
        score += 5;
        reasons.push('Remote support available');
    }

    return {
        volunteer,
        score,
        reasons
    };
};

/**
 * Rank opted-in volunteers for a crisis mission.
 */
const matchCrisisVolunteers = async (mission, options = {}) => {
    const volunteers = await User.find({
        role: 'volunteer',
        emailVerified: true,
        accountStatus: 'active',
        'emergencyProfile.availableForEmergencies': true
    }).select('_id name email skills emergencyProfile location');

    const scored = volunteers
        .map((v) => scoreVolunteer(v, mission, options))
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);

    const limit = options.limit ?? scored.length;
    const minScore = options.minScore ?? 0;

    return scored.filter((s) => s.score >= minScore).slice(0, limit);
};

/**
 * Sort waitlist by skill match for emergency missions (highest first).
 */
const sortEmergencyWaitlist = async (event) => {
    if (event.missionMode !== 'emergency' || !event.waitlist?.length) {
        return event.waitlist || [];
    }

    const users = await User.find({ _id: { $in: event.waitlist } }).select(
        '_id skills emergencyProfile location'
    );
    const byId = new Map(users.map((u) => [u._id.toString(), u]));

    const ranked = event.waitlist
        .map((id) => {
            const user = byId.get(id.toString());
            if (!user) return { id, score: 0 };
            const result = scoreVolunteer(user, event, { skillsOnly: false });
            return { id, score: result?.score ?? 0 };
        })
        .sort((a, b) => b.score - a.score);

    return ranked.map((r) => r.id);
};

module.exports = { matchCrisisVolunteers, scoreVolunteer, sortEmergencyWaitlist };
