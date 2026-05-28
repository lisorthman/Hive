const userOnList = (list, userId) =>
    list.some((id) => id.toString() === userId.toString());

const joinMission = async ({ doc, userId, shiftSlotId, useShiftSlots }) => {
    if (useShiftSlots && doc.shiftSlots?.length) {
        if (!shiftSlotId) {
            throw new Error('Please select a shift time slot');
        }

        const slot = doc.shiftSlots.id(shiftSlotId);
        if (!slot) {
            throw new Error('Shift slot not found');
        }

        for (const s of doc.shiftSlots) {
            if (userOnList(s.volunteersJoined, userId) || userOnList(s.waitlist, userId)) {
                throw new Error('You are already registered for a shift on this mission');
            }
        }

        if (userOnList(slot.volunteersJoined, userId)) {
            throw new Error('You have already joined this shift');
        }
        if (userOnList(slot.waitlist, userId)) {
            throw new Error('You are already on the waitlist for this shift');
        }

        if (slot.volunteersJoined.length >= slot.capacity) {
            slot.waitlist.push(userId);
            await doc.save();
            return {
                membership: 'waitlisted',
                waitlistPosition: slot.waitlist.length,
                shiftSlotId: slot._id.toString(),
                message: `This shift is full. You are #${slot.waitlist.length} on the waitlist.`
            };
        }

        slot.volunteersJoined.push(userId);
        await doc.save();
        return { membership: 'joined', shiftSlotId: slot._id.toString() };
    }

    if (userOnList(doc.volunteersJoined, userId)) {
        throw new Error('You have already joined this mission');
    }
    if (userOnList(doc.waitlist, userId)) {
        throw new Error('You are already on the waitlist for this mission');
    }

    if (doc.volunteersJoined.length >= doc.capacity) {
        doc.waitlist.push(userId);
        await doc.save();
        return {
            membership: 'waitlisted',
            waitlistPosition: doc.waitlist.length,
            message: `Mission is full. You are #${doc.waitlist.length} on the waitlist.`
        };
    }

    doc.volunteersJoined.push(userId);
    await doc.save();
    return { membership: 'joined' };
};

const leaveMission = async ({ doc, userId, shiftSlotId, useShiftSlots }) => {
    if (useShiftSlots && doc.shiftSlots?.length) {
        if (!shiftSlotId) {
            throw new Error('Please specify which shift to leave');
        }
        const slot = doc.shiftSlots.id(shiftSlotId);
        if (!slot) {
            throw new Error('Shift slot not found');
        }

        const onWaitlist = userOnList(slot.waitlist, userId);
        const onJoined = userOnList(slot.volunteersJoined, userId);

        if (!onWaitlist && !onJoined) {
            throw new Error('You are not registered for this shift');
        }

        if (onWaitlist) {
            slot.waitlist = slot.waitlist.filter((id) => id.toString() !== userId.toString());
            await doc.save();
            return { membership: 'none', message: 'Removed from shift waitlist' };
        }

        slot.volunteersJoined = slot.volunteersJoined.filter(
            (id) => id.toString() !== userId.toString()
        );
        await doc.save();

        if (slot.waitlist.length > 0 && slot.volunteersJoined.length < slot.capacity) {
            const promoted = slot.waitlist.shift();
            slot.volunteersJoined.push(promoted);
            await doc.save();
        }

        return { membership: 'none', shiftSlotId: slot._id.toString() };
    }

    const onWaitlist = userOnList(doc.waitlist, userId);
    const onJoined = userOnList(doc.volunteersJoined, userId);

    if (!onWaitlist && !onJoined) {
        throw new Error('You are not registered or waitlisted for this mission');
    }

    if (onWaitlist) {
        doc.waitlist = doc.waitlist.filter((id) => id.toString() !== userId.toString());
        await doc.save();
        return { membership: 'none', message: 'Removed from waitlist' };
    }

    doc.volunteersJoined = doc.volunteersJoined.filter((id) => id.toString() !== userId.toString());
    await doc.save();

    return { membership: 'none' };
};

const getParticipation = ({ doc, userId, useShiftSlots }) => {
    if (useShiftSlots && doc.shiftSlots?.length) {
        const slots = doc.shiftSlots.map((slot) => {
            let membership = 'none';
            let waitlistPosition = null;
            if (userOnList(slot.volunteersJoined, userId)) membership = 'joined';
            else if (userOnList(slot.waitlist, userId)) {
                membership = 'waitlisted';
                waitlistPosition =
                    slot.waitlist.findIndex((id) => id.toString() === userId.toString()) + 1;
            }
            return {
                slotId: slot._id.toString(),
                label: slot.label,
                startTime: slot.startTime,
                endTime: slot.endTime,
                capacity: slot.capacity,
                joined: slot.volunteersJoined.length,
                membership,
                waitlistPosition,
                spotsLeft: Math.max(0, slot.capacity - slot.volunteersJoined.length)
            };
        });

        const anyJoined = slots.some((s) => s.membership === 'joined');
        const anyWaitlisted = slots.some((s) => s.membership === 'waitlisted');

        return {
            membership: anyJoined ? 'joined' : anyWaitlisted ? 'waitlisted' : 'none',
            useShiftSlots: true,
            shiftSlots: slots
        };
    }

    let membership = 'none';
    let waitlistPosition = null;
    if (userOnList(doc.volunteersJoined, userId)) membership = 'joined';
    else if (userOnList(doc.waitlist, userId)) {
        membership = 'waitlisted';
        waitlistPosition =
            doc.waitlist.findIndex((id) => id.toString() === userId.toString()) + 1;
    }

    return {
        membership,
        waitlistPosition,
        spotsLeft: Math.max(0, doc.capacity - doc.volunteersJoined.length),
        waitlistCount: doc.waitlist.length,
        isFull: doc.volunteersJoined.length >= doc.capacity,
        useShiftSlots: false
    };
};

module.exports = { joinMission, leaveMission, getParticipation, userOnList };
