import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Calendar,
    Clock,
    MapPin,
    Users,
    CheckCircle2,
    ChevronLeft,
    Share2,
    Flag,
    MessageCircle,
    Star,
    ShieldCheck,
    Package,
    Loader2,
    Edit,
    Trash2,
    LogOut,
    ClipboardList
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { eventService } from '../../lib/events';
import { authService } from '../../lib/auth';
import { attendanceService } from '../../lib/attendance';
import { cn } from '../../lib/utils';
import { EventReviewsSection } from '../../components/event/EventReviewsSection';
import { EventDiscussionSection } from '../../components/event/EventDiscussionSection';


export default function EventDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [membership, setMembership] = useState<'none' | 'joined' | 'waitlisted'>('none');
    const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
    const [isFull, setIsFull] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [canReview, setCanReview] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            if (!id) return;
            try {
                setIsLoading(true);
                const data = await eventService.getEvent(id);
                setEvent(data);

                const currentUser = authService.getCurrentUser();
                setIsFull(
                    (data.volunteersJoined?.length || 0) >= data.capacity
                );

                if (currentUser?.id && id) {
                    try {
                        const participation = await eventService.getEventParticipation(id);
                        setMembership(participation.membership);
                        setWaitlistPosition(participation.waitlistPosition);
                        setIsFull(participation.isFull);
                    } catch {
                        setMembership('none');
                    }
                    try {
                        const status = await attendanceService.getMyAttendanceStatus(id);
                        setCanReview(!!status.canReview);
                    } catch {
                        setCanReview(false);
                    }
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvent();
    }, [id]);

    useEffect(() => {
        if (isLoading || !event) return;
        const raw = window.location.hash.replace(/^#/, '');
        if (raw === 'mission-discussion' || raw === 'mission-reviews') {
            const el = document.getElementById(raw);
            if (el) {
                requestAnimationFrame(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            }
        }
    }, [isLoading, event]);

    const handleJoin = async () => {
        if (!event || !id) return;
        setIsJoining(true);
        try {
            const result = await eventService.joinEvent(id);
            if (result.membership === 'waitlisted') {
                setMembership('waitlisted');
                setWaitlistPosition(result.waitlistPosition ?? null);
                setAlertMessage(
                    result.message ||
                        `Mission is full. You are #${result.waitlistPosition} on the waitlist.`
                );
            } else {
                setMembership('joined');
                setAlertMessage("You've successfully joined the mission!");
            }
            setShowAlert(true);
            const updatedEvent = await eventService.getEvent(id);
            setEvent(updatedEvent);
            setIsFull((updatedEvent.volunteersJoined?.length || 0) >= updatedEvent.capacity);
            setTimeout(() => setShowAlert(false), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeave = async () => {
        if (!event || !id) return;
        const confirmMsg =
            membership === 'waitlisted'
                ? 'Leave the waitlist for this mission?'
                : 'Are you sure you want to leave this mission?';
        if (!window.confirm(confirmMsg)) return;

        setIsJoining(true);
        try {
            const result = await eventService.leaveEvent(id);
            setMembership('none');
            setWaitlistPosition(null);
            setAlertMessage(
                result.message ||
                    (membership === 'waitlisted'
                        ? 'You have left the waitlist.'
                        : 'You have left the mission.')
            );
            setShowAlert(true);
            const updatedEvent = await eventService.getEvent(id);
            setEvent(updatedEvent);
            setIsFull((updatedEvent.volunteersJoined?.length || 0) >= updatedEvent.capacity);
            setTimeout(() => setShowAlert(false), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsJoining(false);
        }
    };

    const hasJoined = membership === 'joined';
    const onWaitlist = membership === 'waitlisted';

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-hive-background">
                <Loader2 className="h-10 w-10 text-hive-primary animate-spin" />
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-hive-background p-4 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                    <Flag className="h-8 w-8 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-hive-text-primary mb-2">Event not found</h2>
                <p className="text-hive-text-secondary mb-6">{error || "We couldn't find the mission you're looking for."}</p>
                <Button onClick={() => {
                    const currentUser = authService.getCurrentUser();
                    navigate(currentUser?.role === 'ngo' ? '/ngo-dashboard' : '/discovery');
                }}>
                    Back to {authService.getCurrentUser()?.role === 'ngo' ? 'Dashboard' : 'Discovery'}
                </Button>
            </div>
        );
    }

    const filledPercentage = (event.volunteersJoined?.length || 0) / event.capacity * 100;
    const date = new Date(event.date).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const coordinates: [number, number] = [event.location.coordinates[1], event.location.coordinates[0]];

    const orgId = (event.organization?._id || event.organization)?.toString();
    const isOwner = authService.getCurrentUser()?.id === orgId;

    return (
        <div className="min-h-screen bg-hive-background pb-24 lg:pb-12">
            {/* Top Navigation */}
            <nav className="bg-white border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => {
                            const currentUser = authService.getCurrentUser();
                            navigate(currentUser?.role === 'ngo' ? '/ngo-dashboard' : '/discovery');
                        }}
                        className="p-2 -ml-2 text-hive-text-secondary hover:text-hive-text-primary transition-colors flex items-center gap-1 group"
                    >
                        <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-bold">Back to {authService.getCurrentUser()?.role === 'ngo' ? 'Dashboard' : 'Discovery'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button className="p-2 text-hive-text-secondary hover:bg-slate-50 rounded-lg transition-colors">
                            <Share2 className="h-5 w-5" />
                        </button>
                        <button className="p-2 text-hive-text-secondary hover:bg-slate-50 rounded-lg transition-colors">
                            <Flag className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 mt-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content (Left) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Success Alert */}
                        <AnimatePresence>
                            {showAlert && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <Alert variant="success" className="mb-6">
                                        {alertMessage}
                                    </Alert>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Header Section */}
                        <section className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="primary" className="px-3 py-1 font-bold">{event.category}</Badge>
                                <Badge variant="secondary" className="px-3 py-1 font-bold bg-teal-50 text-teal-700 border-teal-100">Featured Mission</Badge>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black text-hive-text-primary leading-tight">
                                {event.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const orgId = event.organization?._id || event.organization;
                                        if (orgId) navigate(`/ngo/${orgId}`);
                                    }}
                                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                                >
                                    <div className="w-6 h-6 rounded-full bg-hive-primary/10 flex items-center justify-center text-hive-primary">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <span className="text-lg font-bold text-hive-text-secondary">
                                        {event.ngoName}
                                    </span>
                                    <ShieldCheck className="h-5 w-5 text-hive-secondary" />
                                </button>
                                {event.reviewCount > 0 && (
                                    <span className="flex items-center gap-1 text-sm font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                        {event.averageRating?.toFixed(1)} ({event.reviewCount})
                                    </span>
                                )}
                            </div>
                        </section>

                        {/* Key Information Grid */}
                        <section className="grid sm:grid-cols-3 gap-4">
                            <InfoCard
                                icon={<Calendar className="h-5 w-5 text-hive-primary" />}
                                label="Date"
                                value={date}
                            />
                            <InfoCard
                                icon={<Clock className="h-5 w-5 text-hive-primary" />}
                                label="Status"
                                value={event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                            />
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 text-hive-text-secondary">
                                    <Users className="h-5 w-5 text-hive-primary" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Capacity</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-lg font-black">{event.volunteersJoined?.length || 0} / {event.capacity}</span>
                                        <span className="text-[10px] font-bold text-hive-text-secondary uppercase">Slots left: {event.capacity - (event.volunteersJoined?.length || 0)}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-hive-primary transition-all duration-1000 ease-out"
                                            style={{ width: `${filledPercentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Description Section */}
                        <section className="space-y-6">
                            <CardContent className="p-6 space-y-4">
                                <p className="text-hive-text-secondary leading-relaxed">
                                    {event.description}
                                </p>
                                {event.prepNotes && (
                                    <div className="pt-4 border-t border-slate-100">
                                        <h3 className="font-bold flex items-center gap-2 mb-3">
                                            <Package className="h-5 w-5 text-hive-primary" /> Preparation Notes
                                        </h3>
                                        <p className="text-sm text-hive-text-secondary">{event.prepNotes}</p>
                                    </div>
                                )}
                            </CardContent>
                        </section>

                        {/* Location & Map Section */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-hive-primary" /> Location
                            </h2>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-hive-text-primary leading-tight">
                                    {event.location.name}
                                </p>
                            </div>
                            <div className="h-64 rounded-2xl overflow-hidden border border-slate-100 shadow-sm z-10">
                                <MapContainer center={coordinates} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <Marker position={coordinates}>
                                        <Popup>
                                            <div className="p-1">
                                                <div className="font-bold">{event.location.name}</div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                </MapContainer>
                            </div>
                        </section>

                        <div id="mission-discussion">
                            <EventDiscussionSection
                                eventId={id!}
                                canComment={hasJoined || !!isOwner}
                            />
                        </div>

                        <div id="mission-reviews">
                            <EventReviewsSection
                                eventId={id!}
                                averageRating={event.averageRating || 0}
                                reviewCount={event.reviewCount || 0}
                                canReview={canReview}
                                onRatingUpdate={(avg, count) =>
                                    setEvent((prev: any) => ({ ...prev, averageRating: avg, reviewCount: count }))
                                }
                            />
                        </div>
                    </div>

                    {/* Sidebar / CTA (Right) */}
                    <div className="space-y-8">
                        <div className="sticky top-24 space-y-6">
                            {isOwner ? (
                                <Card className="shadow-xl border-slate-100 hidden lg:block overflow-hidden relative">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
                                    <CardContent className="p-6 space-y-6">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-hive-text-primary">Mission Management</h3>
                                            <p className="text-xs text-hive-text-secondary leading-relaxed">
                                                You are the organizer of this event. You can modify its details or cancel it if needed.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <Button
                                                variant="outline"
                                                className="w-full py-4 font-bold rounded-xl border-hive-primary/30 text-hive-primary"
                                                onClick={() => navigate(`/ngo-mission/${id}`)}
                                            >
                                                <ClipboardList className="h-5 w-5 mr-2" /> Mission hub
                                            </Button>
                                            <Button
                                                className="w-full py-6 font-bold text-lg rounded-xl group"
                                                onClick={() => navigate(`/ngo-edit/${id}`)}
                                            >
                                                <Edit className="h-5 w-5 mr-2" /> Edit Mission
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="w-full py-6 font-bold text-lg rounded-xl text-rose-600 border-rose-100 hover:bg-rose-50"
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this event?')) {
                                                        eventService.deleteEvent(id!).then(() => navigate('/ngo-dashboard'));
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-5 w-5 mr-2" /> Delete Mission
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <>
                                    <Card className="shadow-xl border-slate-100 hidden lg:block overflow-hidden relative">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-hive-primary" />
                                        <CardContent className="p-6 space-y-6">
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-bold text-hive-text-primary">Join the Community</h3>
                                                <p className="text-xs text-hive-text-secondary leading-relaxed">
                                                    Your participation helps us reach our goals for this mission.
                                                </p>
                                            </div>

                                            <div className="space-y-3">
                                                {onWaitlist && (
                                                    <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-center">
                                                        You are #{waitlistPosition} on the waitlist
                                                    </p>
                                                )}
                                                <Button
                                                    className="w-full py-6 font-bold text-lg rounded-xl shadow-hive group"
                                                    isLoading={isJoining}
                                                    onClick={handleJoin}
                                                    disabled={hasJoined || onWaitlist}
                                                >
                                                    {hasJoined ? (
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 className="h-5 w-5" /> Already Joined
                                                        </div>
                                                    ) : onWaitlist ? (
                                                        `On waitlist (#${waitlistPosition})`
                                                    ) : isFull ? (
                                                        'Join Waitlist'
                                                    ) : (
                                                        'Join Mission'
                                                    )}
                                                </Button>

                                                {(hasJoined || onWaitlist) && (
                                                    <Button
                                                        variant="outline"
                                                        className="w-full py-4 text-rose-600 border-rose-100 hover:bg-rose-50 text-xs font-bold uppercase tracking-wider"
                                                        onClick={handleLeave}
                                                        disabled={isJoining}
                                                    >
                                                        <LogOut className="h-4 w-4 mr-2" />
                                                        {onWaitlist ? 'Leave Waitlist' : 'Leave Mission'}
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 justify-center text-[10px] text-hive-text-secondary font-bold uppercase tracking-widest bg-slate-50 py-2 rounded-lg">
                                                <ShieldCheck className="h-3 w-3 text-hive-secondary" /> Insured by Hive Community
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Organizer Card */}
                                    <Card className="border-slate-100">
                                        <CardContent className="p-6 space-y-4">
                                            <h4 className="text-sm font-bold text-hive-text-secondary uppercase tracking-wider">Organizer</h4>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-hive-primary/10 flex items-center justify-center text-hive-primary">
                                                    <Users className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-hive-text-primary">{event.ngoName}</p>
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-hive-primary uppercase">
                                                        <CheckCircle2 className="h-3 w-3" /> NGO Part of Hive
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-xs text-hive-text-secondary leading-relaxed">
                                                Organized by {event.ngoName}. This NGO is committed to social and environmental impact.
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full gap-2 text-xs"
                                                onClick={() => {
                                                    const orgId = event.organization?._id || event.organization;
                                                    if (orgId) navigate(`/ngo/${orgId}`);
                                                }}
                                            >
                                                <MessageCircle className="h-4 w-4" /> View NGO Profile
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Sticky CTA */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 p-4 z-50 flex gap-4">
                {isOwner ? (
                    <>
                        <Button
                            variant="outline"
                            className="p-4 rounded-xl shrink-0"
                            onClick={() => navigate(`/ngo-mission/${id}`)}
                            title="Mission hub"
                        >
                            <ClipboardList className="h-5 w-5" />
                        </Button>
                        <Button
                            className="flex-1 py-4 font-bold rounded-xl shadow-hive"
                            onClick={() => navigate(`/ngo-edit/${id}`)}
                        >
                            <Edit className="h-5 w-5 mr-2" /> Edit Mission
                        </Button>
                        <Button
                            variant="outline"
                            className="p-4 rounded-xl text-rose-600 border-rose-100"
                            onClick={() => {
                                if (window.confirm('Are you sure you want to delete this event?')) {
                                    eventService.deleteEvent(id!).then(() => navigate('/ngo-dashboard'));
                                }
                            }}
                        >
                            <Trash2 className="h-5 w-5" />
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            className={cn(
                                "flex-1 py-4 font-bold rounded-xl shadow-hive",
                                (hasJoined || onWaitlist) && "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100"
                            )}
                            isLoading={isJoining}
                            onClick={hasJoined || onWaitlist ? handleLeave : handleJoin}
                        >
                            {hasJoined ? (
                                <div className="flex items-center gap-2">
                                    <LogOut className="h-5 w-5" /> Leave Mission
                                </div>
                            ) : onWaitlist ? (
                                <div className="flex items-center gap-2">
                                    <LogOut className="h-5 w-5" /> Leave Waitlist
                                </div>
                            ) : isFull ? (
                                'Join Waitlist'
                            ) : (
                                'Join Event'
                            )}
                        </Button>
                        <Button variant="outline" className="p-4 rounded-xl">
                            <MessageCircle className="h-5 w-5" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-hive-text-secondary">
                {icon}
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-sm font-black text-hive-text-primary leading-tight">{value}</p>
        </div>
    );
}

// Rely on framer-motion for animations
