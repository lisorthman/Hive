import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { URGENCY_COLORS } from '../../lib/crisis';

export function EmergencyBadge({
    urgency = 'high',
    className
}: {
    urgency?: string;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border',
                URGENCY_COLORS[urgency] || URGENCY_COLORS.high,
                className
            )}
        >
            <AlertTriangle className="h-3 w-3" />
            Emergency
        </span>
    );
}
