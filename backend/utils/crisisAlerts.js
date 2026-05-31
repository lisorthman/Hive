const User = require('../models/User');
const Notification = require('../models/Notification');
const { matchCrisisVolunteers } = require('./matchCrisisVolunteers');
const { matchesAvailabilityWindow, skillMatches } = require('./crisisAlerts');

/**
 * Notify opted-in volunteers about an active emergency mission.
 * Supports targeted broadcast options from Phase E-2.
 */
const sendCrisisAlerts = async (mission, sender, options = {}) => {
    const ranked = await matchCrisisVolunteers(mission, {
        skillsOnly: options.skillsOnly === true,
        maxRadiusKm: options.maxRadiusKm,
        targetSkills: options.targetSkills,
        minScore: options.minScore ?? 15,
        limit: options.limit ?? 200,
        enforceRadius: options.enforceRadius === true
    });

    const recipients = ranked.map((r) => r.volunteer);
    if (!recipients.length) return { sent: 0, notifiedCount: 0, matched: 0 };

    const urgency = (mission.crisis?.urgencyLevel || 'high').toUpperCase();
    const area = mission.crisis?.affectedAreaName || mission.location?.name || 'your area';
    const skillNote =
        options.skillsOnly && options.targetSkills?.length
            ? ` (${options.targetSkills.join(', ')} skills requested)`
            : '';
    const message =
        options.message ||
        `🚨 ${urgency} — ${mission.title} near ${area}. Volunteers needed now.${skillNote}`;

    await Notification.insertMany(
        recipients.map((r) => ({
            recipient: r._id,
            sender: sender._id,
            event: mission._id,
            type: 'crisis_alert',
            message
        }))
    );

    return {
        sent: recipients.length,
        notifiedCount: recipients.length,
        matched: ranked.length
    };
};

const sendCrisisStatusNotice = async (mission, sender, type, customMessage) => {
    const volunteerIds = [
        ...(mission.volunteersJoined || []),
        ...(mission.waitlist || [])
    ].map((id) => id.toString());

    const uniqueIds = [...new Set(volunteerIds)];
    if (!uniqueIds.length) return { sent: 0 };

    const defaultMessages = {
        crisis_stand_down: `Stand down: ${mission.title} — please do not deploy until further notice.`,
        crisis_resolved: `Crisis resolved: ${mission.title}. Thank you for your readiness to help.`
    };

    await Notification.insertMany(
        uniqueIds.map((recipientId) => ({
            recipient: recipientId,
            sender: sender._id,
            event: mission._id,
            type,
            message: customMessage || defaultMessages[type] || `Update: ${mission.title}`
        }))
    );

    return { sent: uniqueIds.length };
};

const notifyResourceNeeded = async (mission, sender, resource) => {
    const volunteers = await User.find({
        role: 'volunteer',
        emailVerified: true,
        accountStatus: 'active',
        'emergencyProfile.availableForEmergencies': true
    }).select('_id');

    const joinedIds = new Set((mission.volunteersJoined || []).map((id) => id.toString()));
    const recipients = volunteers.filter((v) => !joinedIds.has(v._id.toString()));

    if (!recipients.length) return { sent: 0 };

    const message = `Resource needed for ${mission.title}: ${resource.quantityNeeded} ${resource.unit} of ${resource.item}`;

    await Notification.insertMany(
        recipients.slice(0, 100).map((r) => ({
            recipient: r._id,
            sender: sender._id,
            event: mission._id,
            type: 'crisis_resource_needed',
            message
        }))
    );

    return { sent: Math.min(recipients.length, 100) };
};

const notifyCrisisUpdate = async (mission, sender, updateMessage) => {
    const recipientIds = new Set([
        ...(mission.volunteersJoined || []).map((id) => id.toString()),
        ...(mission.waitlist || []).map((id) => id.toString())
    ]);

    if (!recipientIds.size) return { sent: 0 };

    const message = `Update — ${mission.title}: ${updateMessage}`;

    await Notification.insertMany(
        [...recipientIds].map((recipientId) => ({
            recipient: recipientId,
            sender: sender._id,
            event: mission._id,
            type: 'crisis_update',
            message
        }))
    );

    return { sent: recipientIds.size };
};

module.exports = {
    sendCrisisAlerts,
    sendCrisisStatusNotice,
    notifyResourceNeeded,
    notifyCrisisUpdate,
    skillMatches,
    matchesAvailabilityWindow
};
