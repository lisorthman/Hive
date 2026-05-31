import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, Users, Clock, Package } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { crisisService, DISASTER_LABELS } from '../../lib/crisis';
import { EmergencyBadge } from '../../components/crisis/EmergencyBadge';
import { CrisisUpdatesTimeline } from '../../components/crisis/CrisisLiveOps';

export default function CrisisSummaryPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!eventId) return;
        crisisService
            .getSummary(eventId)
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [eventId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
            </div>
        );
    }

    if (!data?.mission) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <p className="text-slate-600 mb-4">Crisis summary not found.</p>
                <Button onClick={() => navigate('/crisis')}>Back to Crisis Hub</Button>
            </div>
        );
    }

    const { mission, analytics, resources } = data;
    const isResolved = mission.crisis?.crisisStatus === 'resolved';

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/crisis')}
                        className="flex items-center gap-1 text-sm font-bold text-slate-600"
                    >
                        <ChevronLeft className="h-5 w-5" /> Crisis Hub
                    </button>
                    <h1 className="text-lg font-black text-rose-700">Crisis Summary</h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
                <Card>
                    <CardContent className="p-6 space-y-3">
                        <div className="flex flex-wrap gap-2 items-center">
                            <EmergencyBadge urgency={mission.crisis?.urgencyLevel} />
                            {isResolved && (
                                <span className="text-xs font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                                    Resolved
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-black">{mission.title}</h2>
                        <p className="text-sm text-slate-600">{mission.ngoName}</p>
                        <p className="text-slate-700 leading-relaxed">{mission.description}</p>
                        <p className="text-xs text-slate-500 capitalize">
                            {DISASTER_LABELS[mission.crisis?.disasterType]} ·{' '}
                            {mission.crisis?.affectedAreaName || mission.location?.name}
                        </p>
                    </CardContent>
                </Card>

                {analytics && (
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Users className="h-5 w-5 text-rose-600" /> Response metrics
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Volunteers deployed</p>
                                    <p className="text-2xl font-black">{analytics.volunteersDeployed}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Hours contributed</p>
                                    <p className="text-2xl font-black">{analytics.totalHours}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" /> First response
                                    </p>
                                    <p className="font-bold">
                                        {analytics.responseTime?.timeToFirstCheckInMinutes != null
                                            ? `${analytics.responseTime.timeToFirstCheckInMinutes} min`
                                            : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500 flex items-center gap-1">
                                        <Package className="h-3.5 w-3.5" /> Resources pledged
                                    </p>
                                    <p className="font-bold">
                                        {analytics.resources?.itemsPledged || 0} units
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {resources?.length > 0 && (
                    <Card>
                        <CardContent className="p-6 space-y-3">
                            <h3 className="font-bold">Resource support</h3>
                            {resources.map((r: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                                    <span>{r.item}</span>
                                    <span className="font-bold">
                                        {r.pledged} / {r.quantityNeeded} {r.unit}
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardContent className="p-6">
                        <CrisisUpdatesTimeline eventId={eventId!} compact />
                    </CardContent>
                </Card>

                <Button className="w-full" onClick={() => navigate(`/event/${eventId}`)}>
                    View full mission page
                </Button>
            </main>
        </div>
    );
}
