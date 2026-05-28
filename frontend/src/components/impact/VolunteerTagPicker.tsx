import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, UserPlus, Users, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { impactFeedService } from '../../lib/impactFeed';

export type TaggableVolunteer = { _id: string; name: string; email?: string };

export function VolunteerTagPicker({
    eventId,
    eventInstanceId,
    selectedIds,
    onChange
}: {
    eventId?: string;
    eventInstanceId?: string;
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}) {
    const [pool, setPool] = useState<TaggableVolunteer[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const missionLinked = !!(eventId || eventInstanceId);

    useEffect(() => {
        if (!missionLinked) {
            setPool([]);
            return;
        }

        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const list = await impactFeedService.getTaggableVolunteers({
                    eventId,
                    eventInstanceId
                });
                if (!cancelled) setPool(list);
            } catch {
                if (!cancelled) setPool([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [eventId, eventInstanceId, missionLinked]);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    const selectedVolunteers = useMemo(
        () => pool.filter((v) => selectedSet.has(v._id)),
        [pool, selectedSet]
    );

    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        return pool
            .filter((v) => !selectedSet.has(v._id))
            .filter((v) => {
                if (!q) return true;
                return (
                    v.name.toLowerCase().includes(q) ||
                    (v.email || '').toLowerCase().includes(q)
                );
            })
            .slice(0, 8);
    }, [pool, query, selectedSet]);

    const addVolunteer = (id: string) => {
        if (selectedSet.has(id)) return;
        onChange([...selectedIds, id]);
        setQuery('');
        setOpen(false);
    };

    const removeVolunteer = (id: string) => {
        onChange(selectedIds.filter((x) => x !== id));
    };

    const tagAll = () => {
        onChange(pool.map((v) => v._id));
        setQuery('');
        setOpen(false);
    };

    if (!missionLinked) {
        return (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                Open this page from a mission (Publish impact story) to tag checked-in volunteers.
            </p>
        );
    }

    return (
        <div className="space-y-2" ref={containerRef}>
            <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-semibold text-hive-text-primary flex items-center gap-1">
                    <UserPlus className="h-4 w-4" /> Tag volunteers
                </label>
                {pool.length > 0 && (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1"
                        onClick={tagAll}
                        disabled={selectedIds.length === pool.length}
                    >
                        <Users className="h-3.5 w-3.5" />
                        Tag all ({pool.length})
                    </Button>
                )}
            </div>

            {selectedVolunteers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selectedVolunteers.map((v) => (
                        <span
                            key={v._id}
                            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-hive-primary/10 text-hive-primary text-xs font-semibold"
                        >
                            {v.name}
                            <button
                                type="button"
                                className="p-0.5 rounded-full hover:bg-hive-primary/20"
                                aria-label={`Remove ${v.name}`}
                                onClick={() => removeVolunteer(v._id)}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="relative">
                <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder={
                        loading
                            ? 'Loading volunteers…'
                            : pool.length
                              ? 'Type a name to search…'
                              : 'No checked-in volunteers available to tag'
                    }
                    value={query}
                    disabled={loading || pool.length === 0}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                />
                {loading && (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400 absolute right-3 top-2.5" />
                )}

                {open && !loading && suggestions.length > 0 && (
                    <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {suggestions.map((v) => (
                            <li key={v._id}>
                                <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    onClick={() => addVolunteer(v._id)}
                                >
                                    <span className="font-semibold text-hive-text-primary">{v.name}</span>
                                    {v.email && (
                                        <span className="block text-xs text-slate-500">{v.email}</span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {open && !loading && query.trim() && suggestions.length === 0 && pool.length > 0 && (
                    <p className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs text-slate-500">
                        No volunteers match &ldquo;{query.trim()}&rdquo;
                    </p>
                )}
            </div>

            <p className="text-xs text-slate-500">
                Only volunteers who were checked in on this mission and allow tagging appear here.
            </p>
        </div>
    );
}
