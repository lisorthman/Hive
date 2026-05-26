const Notification = require('../models/Notification');

/**
 * Notify all joined volunteers for an event (excludes sender if provided).
 */
const notifyEventVolunteers = async ({
    event,
    senderId,
    type,
    message,
    volunteerIds
}) => {
    const recipients = volunteerIds || event.volunteersJoined || [];
    const tasks = recipients
        .filter((id) => id.toString() !== (senderId || '').toString())
        .map((recipientId) =>
            Notification.create({
                recipient: recipientId,
                sender: senderId || event.organization,
                event: event._id,
                type,
                message
            })
        );

    await Promise.allSettled(tasks);
};

module.exports = notifyEventVolunteers;
