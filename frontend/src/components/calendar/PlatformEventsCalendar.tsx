import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays, List } from 'lucide-react';
import { cn } from '../../lib/utils';
import { missionPath } from '../../lib/missions';

export type PlatformCalendarEvent = {
    _id: string;
    title: string;
    ngoName?: string;
    date: string;
    status?: string;
    category?: string;
};

interface Props {
    events: PlatformCalendarEvent[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const statusColor = (status?: string) => {
    const map: Record<string, string> = {
        upcoming: 'bg-hive-primary',
        ongoing: 'bg-teal-500',
        completed: 'bg-slate-400',
        cancelled: 'bg-rose-400'
    };
    return map[status || ''] || 'bg-violet-500';
};

export function PlatformEventsCalendar({ events }: Props) {
    const navigate = useNavigate();
    const [view, setView] = useState<'month' | 'week'>('month');
    const [cursor, setCursor] = useState(() => new Date());
    const [selected, setSelected] = useState(() => new Date());

    const eventsByDay = useMemo(() => {
        const map: Record<string, PlatformCalendarEvent[]> = {};
        for (const e of events) {
            const key = new Date(e.date).toDateString();
            if (!map[key]) map[key] = [];
            map[key].push(e);
        }
        return map;
    }, [events]);

    const monthGrid = useMemo(() => {
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        const first = new Date(year, month, 1);
        const startPad = first.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: (Date | null)[] = [];
        for (let i = 0; i < startPad; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push(new Date(year, month, d));
        }
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [cursor]);

    const weekDays = useMemo(() => {
        const start = new Date(selected);
        start.setDate(selected.getDate() - selected.getDay());
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    }, [selected]);

    const selectedEvents = eventsByDay[selected.toDateString()] || [];

    const shiftMonth = (delta: number) => {
        setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    };

    const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
    const isSelected = (d: Date) => d.toDateString() === selected.toDateString();

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-hive-primary" />
                    <h3 className="font-bold text-slate-900">Platform events calendar</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        {(['upcoming', 'ongoing', 'completed', 'cancelled'] as const).map((s) => (
                            <span key={s} className="flex items-center gap-1 capitalize">
                                <span className={cn('w-2 h-2 rounded-full', statusColor(s))} />
                                {s}
                            </span>
                        ))}
                    </div>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setView('month')}
                            className={cn(
                                'px-3 py-1 text-xs font-bold rounded-md transition-all',
                                view === 'month' ? 'bg-white shadow text-hive-primary' : 'text-slate-500'
                            )}
                        >
                            Month
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('week')}
                            className={cn(
                                'px-3 py-1 text-xs font-bold rounded-md transition-all',
                                view === 'week' ? 'bg-white shadow text-hive-primary' : 'text-slate-500'
                            )}
                        >
                            Week
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => shiftMonth(-1)}
                        className="p-1.5 rounded-lg hover:bg-slate-100"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold min-w-[120px] text-center">
                        {cursor.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                        type="button"
                        onClick={() => shiftMonth(1)}
                        className="p-1.5 rounded-lg hover:bg-slate-100"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_280px]">
                <div className="p-3 border-b lg:border-b-0 lg:border-r border-slate-100">
                    {view === 'month' ? (
                        <>
                            <div className="grid grid-cols-7 mb-1">
                                {WEEKDAYS.map((d) => (
                                    <div
                                        key={d}
                                        className="text-[10px] font-bold text-slate-400 text-center py-1"
                                    >
                                        {d}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-lg overflow-hidden">
                                {monthGrid.map((day, idx) => {
                                    if (!day) {
                                        return (
                                            <div
                                                key={`empty-${idx}`}
                                                className="min-h-[96px] bg-slate-50/80"
                                            />
                                        );
                                    }
                                    const key = day.toDateString();
                                    const dayEvents = eventsByDay[key] || [];
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setSelected(day)}
                                            className={cn(
                                                'min-h-[96px] bg-white p-1.5 text-left hover:bg-slate-50 transition-colors flex flex-col',
                                                isSelected(day) && 'ring-2 ring-inset ring-hive-primary',
                                                isToday(day) && !isSelected(day) && 'bg-hive-primary/5'
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full',
                                                    isToday(day) && 'bg-hive-primary text-white'
                                                )}
                                            >
                                                {day.getDate()}
                                            </span>
                                            <div className="mt-1 space-y-0.5 flex-1 overflow-hidden">
                                                {dayEvents.slice(0, 3).map((ev) => (
                                                    <div
                                                        key={ev._id}
                                                        className={cn(
                                                            'text-[9px] font-bold text-white px-1 py-0.5 rounded truncate',
                                                            statusColor(ev.status)
                                                        )}
                                                        title={`${ev.title} (${ev.ngoName})`}
                                                    >
                                                        {ev.title}
                                                    </div>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <div className="text-[9px] text-slate-500 font-bold">
                                                        +{dayEvents.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-7 gap-2 min-h-[220px]">
                            {weekDays.map((day) => {
                                const key = day.toDateString();
                                const dayEvents = eventsByDay[key] || [];
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setSelected(day)}
                                        className={cn(
                                            'rounded-xl border p-2 text-left min-h-[200px] flex flex-col',
                                            isSelected(day)
                                                ? 'border-hive-primary bg-hive-primary/5'
                                                : 'border-slate-100 hover:border-slate-200'
                                        )}
                                    >
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                                            {WEEKDAYS[day.getDay()]}
                                        </div>
                                        <div
                                            className={cn(
                                                'text-lg font-black',
                                                isToday(day) && 'text-hive-primary'
                                            )}
                                        >
                                            {day.getDate()}
                                        </div>
                                        <div className="mt-2 space-y-1 flex-1 overflow-auto">
                                            {dayEvents.map((ev) => (
                                                <div
                                                    key={ev._id}
                                                    className={cn(
                                                        'text-[10px] font-bold text-white px-1.5 py-1 rounded line-clamp-2',
                                                        statusColor(ev.status)
                                                    )}
                                                >
                                                    {ev.title}
                                                </div>
                                            ))}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50/50 max-h-[420px] overflow-auto">
                    <div className="flex items-center gap-2 mb-3 sticky top-0 bg-slate-50/95 py-1">
                        <List className="h-4 w-4 text-hive-primary" />
                        <h4 className="text-sm font-bold">
                            {selected.toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                            })}
                        </h4>
                    </div>
                    {selectedEvents.length === 0 ? (
                        <p className="text-xs text-slate-400">No events scheduled this day.</p>
                    ) : (
                        <ul className="space-y-2">
                            {selectedEvents.map((ev) => (
                                <li key={ev._id}>
                                    <button
                                        type="button"
                                        onClick={() => navigate(missionPath(ev))}
                                        className="w-full text-left p-3 rounded-lg bg-white border border-slate-100 hover:border-hive-primary/30 transition-colors"
                                    >
                                        <p className="text-xs font-bold text-slate-900">{ev.title}</p>
                                        <p className="text-[10px] text-hive-primary font-bold mt-0.5">
                                            {ev.ngoName}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1 capitalize">
                                            {ev.status} · {ev.category}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {new Date(ev.date).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
