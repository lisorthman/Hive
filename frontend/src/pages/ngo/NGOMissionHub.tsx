import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Calendar,
    Users,
    Star,
    MessageCircle,
    QrCode,
    Pencil,
    Eye,
    Loader2,
    ClipboardList,
    MapPin,
    Shield,
    Sparkles,
    CheckCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { authService } from '../../lib/auth';
import { eventService } from '../../lib/events';
import { attendanceService } from '../../lib/attendance';
import { reviewService } from '../../lib/reviews';
import { commentService } from '../../lib/comments';
import { EventDiscussionSection } from '../../components/event/EventDiscussionSection';

function countThreadedComments(threads: any[]): number {
    if (!threads?.length) return 0;
    return threads.reduce((n, t) => n + 1 + countThreadedComments(t.replies || []), 0);
}

export default function NGOMissionHub() {
    const { id: eventId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const user = authService.getCurrentUser();

    const [event, setEvent] = useState<any>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [commentThreads, setCommentThreads] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);

    useEffect(() => {
        if (!eventId) return;

        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const ev = await eventService.getEvent(eventId);
                const orgId = (ev.organization?._id || ev.organization)?.toString();
                const allowed = user?.role === 'admin' || (user?.id && orgId === user.id);
                if (!allowed) {
                    setError('You do not manage this mission.');
                    setEvent(null);
                    return;
                }
                setEvent(ev);

                const [att, rev, comments] = await Promise.all([
                    attendanceService.getEventAttendance(eventId).catch(() => []),
                    reviewService.getEventReviews(eventId).catch(() => []),
                    commentService.getEventComments(eventId).catch(() => [])
                ]);
                setAttendance(Array.isArray(att) ? att : []);
                setReviews(Array.isArray(rev) ? rev : []);
                setCommentThreads(Array.isArray(comments) ? comments : []);
            } catch (err: any) {
                setError(err.message || 'Failed to load mission');
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [eventId, user?.id, user?.role]);

    const checkedInCount = useMemo(
        () => attendance.filter((a) => a.status === 'checked-in').length,
        [attendance]
    );
    const totalHours = useMemo(
        () => attendance.reduce((s, a) => s + (a.hoursWorked || 0), 0),
        [attendance]
    );
    const commentCount = useMemo(() => countThreadedComments(commentThreads), [commentThreads]);

    const markMissionCompleted = async () => {
        if (!eventId || !window.confirm('Mark this mission as completed? You can then publish an impact story.')) {
            return;
        }
        setIsCompleting(true);
        try {
            const updated = await eventService.updateEventStatus(eventId, 'completed');
            setEvent(updated);
        } catch (err: any) {
            alert(err.message || 'Failed to update mission status');
        } finally {
            setIsCompleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 text-hive-primary animate-spin" />
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
                <p className="text-slate-600 mb-4">{error || 'Mission not found'}</p>
                <Button onClick={() => navigate('/ngo-dashboard')}>Back to Dashboard</Button>
            </div>
        );
    }

    const dateStr = new Date(event.date).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="min-h-screen bg-slate-50 pb-16 text-slate-900">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/ngo-dashboard')}
                        className="flex items-center gap-1 text-slate-600 hover:text-slate-900"
                    >
                        <ChevronLeft className="h-5 w-5" />
                        <span className="text-sm font-bold">Dashboard</span>
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="primary">{event.category}</Badge>
                        <Badge variant="gray" className="capitalize border-slate-200">
                            {event.status}
                        </Badge>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight">{event.title}</h1>
                    <p className="text-sm text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                            <Calendar className="h-4 w-4" /> {dateStr}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <MapPin className="h-4 w-4" /> {event.location?.name}
                        </span>
                    </p>
                    {event.status !== 'completed' && event.status !== 'cancelled' && (
                        <Button
                            className="mt-2 gap-2"
                            onClick={markMissionCompleted}
                            isLoading={isCompleting}
                        >
                            <CheckCircle className="h-4 w-4" />
                            Mark mission as completed
                        </Button>
                    )}
                    {event.status === 'completed' && (
                        <p className="text-sm text-emerald-700 font-medium mt-2 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Mission completed — ready for impact story
                        </p>
                    )}
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={<Users className="h-5 w-5" />}
                        label="Joined"
                        value={`${event.volunteersJoined?.length || 0} / ${event.capacity}`}
                    />
                    <StatCard
                        icon={<Shield className="h-5 w-5" />}
                        label="Verified check-ins"
                        value={String(checkedInCount)}
                    />
                    <StatCard
                        icon={<ClipboardList className="h-5 w-5" />}
                        label="Hours logged"
                        value={String(totalHours)}
                    />
                    <StatCard
                        icon={<Star className="h-5 w-5 text-amber-500 fill-amber-500" />}
                        label="Reviews"
                        value={
                            event.reviewCount > 0
                                ? `${event.averageRating?.toFixed(1)} ★ (${event.reviewCount})`
                                : '—'
                        }
                    />
                </div>

                <section>
                    <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-hive-primary" />
                        Mission actions
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <ActionCard
                            title="Manage attendance & check-in"
                            description="Roster, manual status, hours, and QR / verification codes."
                            icon={<QrCode className="h-5 w-5" />}
                            onClick={() => navigate(`/ngo-attendance/${eventId}`)}
                        />
                        <ActionCard
                            title="Edit mission"
                            description="Update description, date, capacity, and preparation notes."
                            icon={<Pencil className="h-5 w-5" />}
                            onClick={() => navigate(`/ngo-edit/${eventId}`)}
                        />
                        <ActionCard
                            title="View public mission page"
                            description="See what volunteers see — map, discussion, and reviews."
                            icon={<Eye className="h-5 w-5" />}
                            onClick={() => navigate(`/event/${eventId}`)}
                        />
                        <ActionCard
                            title="Open discussion (anchor)"
                            description={`${commentCount} message${commentCount === 1 ? '' : 's'} in the thread.`}
                            icon={<MessageCircle className="h-5 w-5" />}
                            onClick={() => navigate(`/event/${eventId}#mission-discussion`)}
                        />
                        <ActionCard
                            title="Publish impact story"
                            description="Generate a story draft and publish mission outcomes to the community feed."
                            icon={<Sparkles className="h-5 w-5" />}
                            onClick={() => navigate(`/impact-feed?eventId=${eventId}`)}
                        />
                    </div>
                </section>

                {reviews.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                Recent volunteer ratings
                            </h2>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/event/${eventId}#mission-reviews`)}>
                                View all
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {reviews.slice(0, 5).map((r) => (
                                <Card key={r._id} className="border-slate-100">
                                    <CardContent className="p-4 flex justify-between gap-4">
                                        <div>
                                            <p className="font-bold text-sm">{r.volunteer?.name}</p>
                                            {r.comment && (
                                                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{r.comment}</p>
                                            )}
                                        </div>
                                        <span className="text-amber-600 font-bold shrink-0">{r.rating} ★</span>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>
                )}

                <EventDiscussionSection
                    eventId={eventId!}
                    canComment
                    subtitle="Reply to volunteers here as the host NGO. The same thread appears on the public mission page."
                />
            </main>
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Card className="border-slate-100 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
                <div className="text-hive-primary">{icon}</div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-lg font-black">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function ActionCard({
    title,
    description,
    icon,
    onClick
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-hive-primary/40 hover:shadow-md transition-all flex gap-3 w-full"
        >
            <div className="text-hive-primary shrink-0 mt-0.5">{icon}</div>
            <div>
                <p className="font-bold text-slate-900">{title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
            </div>
        </button>
    );
}
