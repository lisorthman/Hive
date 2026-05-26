const Attendance = require('../models/Attendance');
const Event = require('../models/Event');

const toRad = (deg) => (deg * Math.PI) / 180;

const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const interestMatchesCategory = (interest, category) => {
    const a = interest.toLowerCase();
    const b = category.toLowerCase();
    return a.includes(b) || b.includes(a);
};

const scoreEvent = (event, ctx) => {
    const id = event._id.toString();
    if (ctx.joinedIds.has(id) || ctx.waitlistIds.has(id)) {
        return null;
    }
    if (event.status === 'cancelled') return null;
    if (new Date(event.date) < new Date()) return null;

    let score = 0;
    const matchReasons = [];

    if (ctx.pastCategories.has(event.category)) {
        score += 30;
        matchReasons.push('Similar to missions you attended');
    }

    const interests = ctx.interests || [];
    let interestHit = false;
    for (const interest of interests) {
        if (interestMatchesCategory(interest, event.category)) {
            score += 25;
            matchReasons.push('Matches your interests');
            interestHit = true;
            break;
        }
    }
    if (!interestHit) {
        const blob = `${event.title} ${event.description || ''}`.toLowerCase();
        for (const interest of interests) {
            if (interest.length > 2 && blob.includes(interest.toLowerCase())) {
                score += 15;
                matchReasons.push('Related to your interests');
                break;
            }
        }
    }

    const coords = event.location?.coordinates;
    if (ctx.lat != null && ctx.lng != null && coords?.length >= 2) {
        const [lng, lat] = coords;
        if (!(lng === 0 && lat === 0)) {
            const km = haversineKm(ctx.lat, ctx.lng, lat, lng);
            if (km < 5) {
                score += 25;
                matchReasons.push('Very close to you');
            } else if (km < 20) {
                score += 15;
                matchReasons.push('Near your area');
            } else if (km < 75) {
                score += 8;
                matchReasons.push('Within reasonable distance');
            }
        }
    }

    const spotsLeft = event.capacity - (event.volunteersJoined?.length || 0);
    if (spotsLeft > 0) score += 5;
    if (event.reviewCount > 0 && event.averageRating >= 4) {
        score += 5;
        matchReasons.push('Highly rated');
    }

    if (score <= 0) return null;

    return {
        ...event,
        recommendationScore: score,
        matchReasons: [...new Set(matchReasons)].slice(0, 3)
    };
};

const recommendEventsForUser = async (user, { lat, lng, limit = 12 } = {}) => {
    const userId = user._id || user.id;

    const attended = await Attendance.find({
        volunteer: userId,
        status: 'checked-in'
    })
        .populate({ path: 'event', select: 'category' })
        .lean();

    const pastCategories = new Set(
        attended.map((a) => a.event?.category).filter(Boolean)
    );

    const [joinedEvents, waitlistedEvents, events] = await Promise.all([
        Event.find({ volunteersJoined: userId }).select('_id').lean(),
        Event.find({ waitlist: userId }).select('_id').lean(),
        Event.find({ status: { $in: ['upcoming', 'ongoing'] } })
            .select('-checkInCode')
            .lean()
    ]);

    const joinedIds = new Set(joinedEvents.map((e) => e._id.toString()));
    const waitlistIds = new Set(waitlistedEvents.map((e) => e._id.toString()));

    const ctx = {
        interests: user.interests || [],
        pastCategories,
        joinedIds,
        waitlistIds,
        lat: lat != null ? parseFloat(lat) : null,
        lng: lng != null ? parseFloat(lng) : null
    };

    const scored = events
        .map((e) => scoreEvent(e, ctx))
        .filter(Boolean)
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);

    return scored;
};

module.exports = { recommendEventsForUser, haversineKm };
