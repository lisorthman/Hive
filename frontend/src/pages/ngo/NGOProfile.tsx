import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Users,
    Calendar,
    Clock,
    Star,
    Loader2,
    ShieldCheck,
    MapPin
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ngoService } from '../../lib/ngos';

export default function NGOProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            try {
                setIsLoading(true);
                const data = await ngoService.getNGOProfile(id);
                setProfile(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [id]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-hive-background">
                <Loader2 className="h-10 w-10 text-hive-primary animate-spin" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-hive-background p-4 text-center">
                <h2 className="text-xl font-bold mb-2">Profile unavailable</h2>
                <p className="text-hive-text-secondary mb-6">{error}</p>
                <Button onClick={() => navigate('/discovery')}>Back to Discovery</Button>
            </div>
        );
    }

    const { ngo, stats, activeEvents, pastEvents } = profile;

    return (
        <div className="min-h-screen bg-hive-background pb-12">
            <nav className="bg-white border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-hive-text-secondary hover:text-hive-text-primary flex items-center gap-1"
                    >
                        <ChevronLeft className="h-5 w-5" />
                        <span className="text-sm font-bold">Back</span>
                    </button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 mt-8 space-y-10">
                <section className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="w-20 h-20 rounded-2xl bg-hive-primary/10 flex items-center justify-center text-hive-primary shrink-0">
                            <Users className="h-10 w-10" />
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-3xl font-black text-hive-text-primary">{ngo.name}</h1>
                                <ShieldCheck className="h-6 w-6 text-hive-secondary" />
                            </div>
                            <p className="text-sm text-hive-text-secondary">
                                Verified NGO · Member since {new Date(ngo.memberSince).toLocaleDateString()}
                            </p>
                            {ngo.bio && (
                                <p className="text-hive-text-secondary leading-relaxed">{ngo.bio}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-100">
                        <StatBox icon={<Users />} label="Volunteers Checked In" value={stats.totalVolunteersCheckedIn} />
                        <StatBox icon={<Clock />} label="Hours Served" value={stats.totalVolunteerHours} />
                        <StatBox icon={<Calendar />} label="Total Missions" value={stats.totalEvents} />
                        <StatBox
                            icon={<Star className="text-amber-500 fill-amber-500" />}
                            label="Avg. Rating"
                            value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                        />
                    </div>
                </section>

                <EventList title="Active Missions" events={activeEvents} navigate={navigate} empty="No active missions right now." />
                <EventList title="Past Missions" events={pastEvents} navigate={navigate} empty="No completed missions yet." />
            </main>
        </div>
    );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
    return (
        <div className="bg-slate-50 rounded-xl p-4 text-center space-y-1">
            <div className="flex justify-center text-hive-primary">{icon}</div>
            <div className="text-2xl font-black text-hive-text-primary">{value}</div>
            <div className="text-[10px] font-bold text-hive-text-secondary uppercase tracking-wider">{label}</div>
        </div>
    );
}

function EventList({
    title,
    events,
    navigate,
    empty
}: {
    title: string;
    events: any[];
    navigate: (path: string) => void;
    empty: string;
}) {
    return (
        <section className="space-y-4">
            <h2 className="text-xl font-bold text-hive-text-primary">{title}</h2>
            {events.length === 0 ? (
                <p className="text-sm text-hive-text-secondary bg-white p-6 rounded-xl border border-slate-100">{empty}</p>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {events.map((event) => (
                        <Card
                            key={event._id}
                            className="border-slate-100 hover:border-hive-primary/30 cursor-pointer transition-all"
                            onClick={() => navigate(`/event/${event._id}`)}
                        >
                            <CardContent className="p-5 space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                    <Badge variant="primary" className="text-[10px]">{event.category}</Badge>
                                    {event.reviewCount > 0 && (
                                        <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                            {event.averageRating?.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-bold text-hive-text-primary line-clamp-2">{event.title}</h3>
                                <div className="flex items-center gap-2 text-xs text-hive-text-secondary">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {new Date(event.date).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-hive-text-secondary">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="truncate">{event.location?.name || 'TBD'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
}
