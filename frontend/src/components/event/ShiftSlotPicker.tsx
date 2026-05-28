import { cn } from '../../lib/utils';
import type { ShiftSlotParticipation } from '../../lib/missions';

type SlotRow = ShiftSlotParticipation & { _id?: string };

type Props = {
    slots: SlotRow[];
    selectedSlotId: string | null;
    onSelect: (slotId: string) => void;
    disabled?: boolean;
};

export function ShiftSlotPicker({ slots, selectedSlotId, onSelect, disabled }: Props) {
    if (!slots.length) return null;

    return (
        <div className="space-y-2">
            <p className="text-xs font-bold text-hive-text-secondary uppercase tracking-wider">
                Choose a shift
            </p>
            <div className="space-y-2">
                {slots.map((slot) => {
                    const slotId = slot.slotId || slot._id || '';
                    const full = slot.spotsLeft <= 0 && slot.membership === 'none';
                    const selected = selectedSlotId === slotId;
                    const joined = slot.membership === 'joined';
                    const waitlisted = slot.membership === 'waitlisted';

                    return (
                        <button
                            key={slotId}
                            type="button"
                            disabled={disabled || joined || waitlisted}
                            onClick={() => onSelect(slotId)}
                            className={cn(
                                'w-full text-left p-3 rounded-xl border-2 transition-all',
                                selected
                                    ? 'border-hive-primary bg-hive-primary/5'
                                    : 'border-slate-100 hover:border-slate-200',
                                (joined || waitlisted) && 'opacity-70 cursor-default'
                            )}
                        >
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <p className="font-bold text-sm text-hive-text-primary">{slot.label}</p>
                                    <p className="text-xs text-hive-text-secondary">
                                        {slot.startTime} – {slot.endTime}
                                    </p>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-hive-text-secondary">
                                    {joined
                                        ? 'Your shift'
                                        : waitlisted
                                          ? `Waitlist #${slot.waitlistPosition}`
                                          : full
                                            ? 'Full — waitlist'
                                            : `${slot.spotsLeft} left`}
                                </span>
                            </div>
                            <p className="text-[10px] text-hive-text-secondary mt-1">
                                {slot.joined} / {slot.capacity} volunteers
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
