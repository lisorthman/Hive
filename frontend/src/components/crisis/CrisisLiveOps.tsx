import { useEffect, useState } from 'react';
import { Loader2, Megaphone, Pin } from 'lucide-react';
import { Button } from '../ui/Button';
import { crisisService } from '../../lib/crisis';

type Props = {
    eventId: string;
    canPost?: boolean;
    compact?: boolean;
};

export function CrisisUpdatesTimeline({ eventId, canPost, compact }: Props) {
    const [updates, setUpdates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            setUpdates(await crisisService.getUpdates(eventId));
        } catch {
            setUpdates([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [eventId]);

    const postUpdate = async () => {
        if (!message.trim()) return;
        setBusy(true);
        try {
            await crisisService.createUpdate(eventId, message.trim());
            setMessage('');
            await load();
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-rose-500" />
            </div>
        );
    }

    return (
        <section className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-rose-900">
                <Megaphone className="h-5 w-5" /> Live situation updates
            </h2>

            {canPost && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        maxLength={500}
                        placeholder="Shelter at capacity, water delivered..."
                        className="flex-1 border border-rose-200 rounded-lg px-3 py-2 text-sm"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && postUpdate()}
                    />
                    <Button size="sm" onClick={postUpdate} isLoading={busy}>
                        Post
                    </Button>
                </div>
            )}

            {updates.length === 0 ? (
                <p className="text-sm text-slate-500">No live updates yet.</p>
            ) : (
                <ol className={`space-y-3 ${compact ? 'max-h-48 overflow-y-auto' : ''}`}>
                    {updates.map((u) => (
                        <li
                            key={u._id}
                            className={`border rounded-xl p-3 text-sm ${
                                u.isPinned
                                    ? 'border-amber-300 bg-amber-50'
                                    : 'border-slate-200 bg-white'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-slate-800 leading-relaxed">{u.message}</p>
                                {u.isPinned && (
                                    <Pin className="h-4 w-4 text-amber-600 shrink-0" />
                                )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wide">
                                {u.author?.name || 'NGO'} ·{' '}
                                {new Date(u.createdAt).toLocaleString()}
                            </p>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}

export function CrisisAnalyticsPanel({ eventId }: { eventId: string }) {
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        crisisService
            .getAnalytics(eventId)
            .then(setAnalytics)
            .catch(() => setAnalytics(null))
            .finally(() => setLoading(false));
    }, [eventId]);

    if (loading) {
        return (
            <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-rose-500" />
            </div>
        );
    }

    if (!analytics) return null;

    const stats = [
        { label: 'Volunteers joined', value: analytics.volunteersJoined },
        { label: 'Deployed (checked-in)', value: analytics.volunteersDeployed },
        { label: 'Total hours', value: analytics.totalHours },
        { label: 'Capacity fill', value: `${analytics.capacityFillRate}%` },
        { label: 'Deployment rate', value: `${analytics.deploymentRate}%` },
        {
            label: 'First join',
            value:
                analytics.responseTime?.timeToFirstJoinMinutes != null
                    ? `${analytics.responseTime.timeToFirstJoinMinutes} min`
                    : '—'
        },
        {
            label: 'First check-in',
            value:
                analytics.responseTime?.timeToFirstCheckInMinutes != null
                    ? `${analytics.responseTime.timeToFirstCheckInMinutes} min`
                    : '—'
        },
        {
            label: 'Resources pledged',
            value: `${analytics.resources?.itemsPledged || 0} / ${analytics.resources?.itemsNeeded || 0}`
        },
        { label: 'Situation updates', value: analytics.situationUpdates }
    ];

    return (
        <section className="space-y-4">
            <h2 className="text-lg font-bold text-rose-900">Emergency analytics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stats.map((s) => (
                    <div
                        key={s.label}
                        className="rounded-xl border border-rose-100 bg-white p-3 text-center"
                    >
                        <p className="text-[10px] font-bold uppercase text-slate-500">{s.label}</p>
                        <p className="text-xl font-black text-rose-900 mt-1">{s.value}</p>
                    </div>
                ))}
            </div>
            {Object.keys(analytics.deploymentRoles || {}).length > 0 && (
                <div className="text-sm">
                    <p className="font-bold text-slate-600 mb-1">Deployment roles</p>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(analytics.deploymentRoles).map(([role, count]) => (
                            <span
                                key={role}
                                className="text-xs px-2 py-1 rounded-full bg-rose-50 border border-rose-100"
                            >
                                {role}: {count as number}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
