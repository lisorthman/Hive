const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');

/**
 * Promote the first volunteer on the waitlist into volunteersJoined.
 * Returns the promoted user id or null.
 */
const promoteFromWaitlist = async (event) => {
    if (!event.waitlist?.length) return null;
    if (event.volunteersJoined.length >= event.capacity) return null;

    const promotedId = event.waitlist.shift();
    event.volunteersJoined.push(promotedId);
    await event.save();

    try {
        await Attendance.create({
            event: event._id,
            volunteer: promotedId,
            status: 'joined'
        });
    } catch (err) {
        if (err.code !== 11000) {
            console.error('Waitlist promotion attendance error:', err.message);
        }
    }

    try {
        await Notification.create({
            recipient: promotedId,
            sender: event.organization,
            event: event._id,
            type: 'promoted_from_waitlist',
            message: `A spot opened up! You are now registered for "${event.title}".`
        });
    } catch (err) {
        console.error('Waitlist promotion notification error:', err.message);
    }

    return promotedId;
};

module.exports = { promoteFromWaitlist };
