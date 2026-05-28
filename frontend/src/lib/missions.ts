export type MissionType = 'event' | 'instance';

export type ShiftSlotParticipation = {
    slotId: string;
    label: string;
    startTime: string;
    endTime: string;
    capacity: number;
    joined: number;
    membership: 'none' | 'joined' | 'waitlisted';
    waitlistPosition: number | null;
    spotsLeft: number;
};

export type ParticipationState = {
    membership: 'none' | 'joined' | 'waitlisted';
    waitlistPosition?: number | null;
    spotsLeft?: number;
    waitlistCount?: number;
    isFull?: boolean;
    useShiftSlots?: boolean;
    shiftSlots?: ShiftSlotParticipation[];
};

export function missionPath(item: { _id: string; missionType?: MissionType }) {
    return item.missionType === 'instance' ? `/instance/${item._id}` : `/event/${item._id}`;
}

export function isRecurringInstance(item: { missionType?: MissionType; series?: unknown }) {
    return item.missionType === 'instance' || !!item.series;
}
