const User = require('../models/User');
const Notification = require('../models/Notification');

const isWeekend = () => {
    const d = new Date().getDay();
    return d === 0 || d === 6;
};

const matchesAvailabilityWindow = (window) => {
    if (!window || window === 'anytime') return true;
    if (window === 'weekends') return isWeekend();
    if (window === 'weekdays') return !isWeekend();
    return true;
};

const skillMatches = (volunteerSkills, requiredSkills) => {
    if (!requiredSkills?.length) return true;
    const normalized = (volunteerSkills || []).map((s) => s.toLowerCase());
    return requiredSkills.some((req) =>
        normalized.some((s) => s.includes(req.toLowerCase()) || req.toLowerCase().includes(s))
    );
};

/**
 * Notify opted-in volunteers about an active emergency mission.
 */
const sendCrisisAlerts = async (mission, sender) => {
    const volunteers = await User.find({
        role: 'volunteer',
        emailVerified: true,
        accountStatus: 'active',
        'emergencyProfile.availableForEmergencies': true
    }).select('_id skills emergencyProfile');

    const requiredSkills = mission.crisis?.requiredSkills || [];
    const recipients = volunteers.filter((v) => {
        if (!matchesAvailabilityWindow(v.emergencyProfile?.availabilityWindow)) return false;
        return skillMatches(v.skills, requiredSkills);
    });

    if (!recipients.length) return { sent: 0 };

    const urgency = (mission.crisis?.urgencyLevel || 'high').toUpperCase();
    const area = mission.crisis?.affectedAreaName || mission.location?.name || 'your area';
    const message = `🚨 ${urgency} — ${mission.title} near ${area}. Volunteers needed now.`;

    await Notification.insertMany(
        recipients.map((r) => ({
            recipient: r._id,
            sender: sender._id,
            event: mission._id,
            type: 'crisis_alert',
            message
        }))
    );

    return { sent: recipients.length };
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

module.exports = { sendCrisisAlerts, sendCrisisStatusNotice, skillMatches, matchesAvailabilityWindow };
