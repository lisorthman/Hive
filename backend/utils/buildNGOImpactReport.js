const User = require('../models/User');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const EventReview = require('../models/EventReview');

const buildNGOImpactReport = async (ngoId) => {
    const ngo = await User.findById(ngoId).select('name email role createdAt');
    if (!ngo || ngo.role !== 'ngo') {
        throw new Error('NGO not found');
    }

    const events = await Event.find({ organization: ngoId }).sort('-date').lean();
    const eventIds = events.map((e) => e._id);

    const attendanceRecords = await Attendance.find({
        event: { $in: eventIds },
        status: 'checked-in'
    }).lean();

    const attendanceByEvent = {};
    for (const record of attendanceRecords) {
        const key = record.event.toString();
        if (!attendanceByEvent[key]) {
            attendanceByEvent[key] = { checkedIn: 0, hours: 0 };
        }
        attendanceByEvent[key].checkedIn += 1;
        attendanceByEvent[key].hours += record.hoursWorked || 0;
    }

    const reviews = await EventReview.find({ event: { $in: eventIds } })
        .populate({ path: 'volunteer', select: 'name' })
        .populate({ path: 'event', select: 'title' })
        .sort('-createdAt')
        .lean();

    const eventRows = events.map((e) => {
        const att = attendanceByEvent[e._id.toString()] || { checkedIn: 0, hours: 0 };
        return {
            title: e.title,
            date: e.date,
            status: e.status,
            category: e.category,
            capacity: e.capacity,
            volunteersJoined: (e.volunteersJoined || []).length,
            checkedIn: att.checkedIn,
            volunteerHours: att.hours,
            averageRating: e.averageRating || 0,
            reviewCount: e.reviewCount || 0
        };
    });

    const totalCheckedIn = attendanceRecords.length;
    const totalVolunteerHours = attendanceRecords.reduce(
        (sum, r) => sum + (r.hoursWorked || 0),
        0
    );
    const ratedEvents = events.filter((e) => (e.reviewCount || 0) > 0);
    const overallAverageRating =
        ratedEvents.length > 0
            ? Math.round(
                (ratedEvents.reduce((sum, e) => sum + (e.averageRating || 0), 0) /
                    ratedEvents.length) *
                    10
            ) / 10
            : 0;

    return {
        generatedAt: new Date(),
        organization: {
            name: ngo.name,
            email: ngo.email,
            memberSince: ngo.createdAt
        },
        summary: {
            totalEvents: events.length,
            activeEvents: events.filter((e) => ['upcoming', 'ongoing'].includes(e.status)).length,
            completedEvents: events.filter((e) => e.status === 'completed').length,
            totalCheckedIn,
            totalVolunteerHours,
            overallAverageRating,
            totalReviews: reviews.length
        },
        events: eventRows,
        recentReviews: reviews.slice(0, 20).map((r) => ({
            eventTitle: r.event?.title || '',
            volunteerName: r.volunteer?.name || 'Volunteer',
            rating: r.rating,
            comment: r.comment || '',
            createdAt: r.createdAt
        }))
    };
};

module.exports = buildNGOImpactReport;
