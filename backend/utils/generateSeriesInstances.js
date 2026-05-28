const EventInstance = require('../models/EventInstance');

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(9, 0, 0, 0);
    return d;
};

/** Generate weekly instances from series template between seriesStart and seriesEnd */
const generateSeriesInstances = async (series) => {
    const instances = [];
    const start = new Date(series.seriesStart);
    const end = new Date(series.seriesEnd);
    const targetDow = series.recurrence.dayOfWeek;

    let cursor = new Date(start);
    while (cursor.getDay() !== targetDow) {
        cursor = addDays(cursor, 1);
        if (cursor > end) break;
    }

    while (cursor <= end) {
        const shiftSlots = series.useShiftSlots
            ? (series.shiftSlotTemplate || []).map((s) => ({
                  label: s.label,
                  startTime: s.startTime,
                  endTime: s.endTime,
                  capacity: s.capacity,
                  volunteersJoined: [],
                  waitlist: []
              }))
            : [];

        instances.push({
            series: series._id,
            organization: series.organization,
            ngoName: series.ngoName,
            title: series.title,
            description: series.description,
            location: series.location,
            category: series.category,
            image: series.image,
            prepNotes: series.prepNotes,
            date: startOfDay(cursor),
            capacity: series.defaultCapacity,
            useShiftSlots: series.useShiftSlots,
            shiftSlots,
            volunteersJoined: [],
            waitlist: [],
            status: 'upcoming'
        });

        cursor = addDays(cursor, 7);
    }

    if (!instances.length) {
        throw new Error('No instances fall within the selected date range for this weekday');
    }

    return EventInstance.insertMany(instances, { ordered: true });
};

module.exports = generateSeriesInstances;
