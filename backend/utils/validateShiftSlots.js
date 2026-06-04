/**
 * When shift slots are enabled, each slot has its own capacity but the
 * mission-level capacity is the ceiling (volunteers needed / per date).
 */
const sumShiftSlotCapacity = (slots = []) =>
    slots.reduce((sum, s) => sum + Math.max(0, Number(s.capacity) || 0), 0);

const validateShiftSlotsAgainstCapacity = ({
    capacity,
    useShiftSlots,
    shiftSlots,
    shiftSlotTemplate
}) => {
    const slots = shiftSlots ?? shiftSlotTemplate;
    const ceiling = Number(capacity);

    if (!useShiftSlots) {
        return null;
    }

    if (!slots?.length) {
        return 'Add at least one shift slot when using shift slots';
    }

    if (!Number.isFinite(ceiling) || ceiling < 1) {
        return 'Please set volunteers needed to at least 1';
    }

    const total = sumShiftSlotCapacity(slots);
    if (total > ceiling) {
        return `Total shift capacity (${total}) cannot exceed volunteers needed (${ceiling})`;
    }

    return null;
};

module.exports = {
    sumShiftSlotCapacity,
    validateShiftSlotsAgainstCapacity
};
