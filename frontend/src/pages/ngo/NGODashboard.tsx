import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Calendar,
    Users,
    TrendingUp,
    Star,
    LogOut,
    Bell,
    Edit,
    Trash2,
    Eye,
    Loader2,
    CheckCircle2,
    Clock,
    UserCheck,
    Download,
    UserX,
    Sparkles,
    AlertTriangle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Logo } from '../../components/ui/Logo';
import { authService } from '../../lib/auth';
import { eventService } from '../../lib/events';
import { notificationService } from '../../lib/notifications';
import { reviewService } from '../../lib/reviews';
import { reportService } from '../../lib/reports';
import { cn } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { impactFeedService } from '../../lib/impactFeed';
import { crisisService } from '../../lib/crisis';

export default function NGODashboard() {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Notifications State
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [reviewSummary, setReviewSummary] = useState<any>(null);
    const [isDownloadingReport, setIsDownloadingReport] = useState(false);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [isVolunteersModalOpen, setIsVolunteersModalOpen] = useState(false);
    const [volunteerEvent, setVolunteerEvent] = useState<any>(null);
    const [joinedVolunteers, setJoinedVolunteers] = useState<any[]>([]);
    const [waitlistedVolunteers, setWaitlistedVolunteers] = useState<any[]>([]);
    const [isLoadingVolunteers, setIsLoadingVolunteers] = useState(false);
    const [isRemovingVolunteerId, setIsRemovingVolunteerId] = useState<string | null>(null);
    const [removeMessage, setRemoveMessage] = useState('');
    const [myImpactPosts, setMyImpactPosts] = useState<any[]>([]);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [partnerInviteBusy, setPartnerInviteBusy] = useState<string | null>(null);
    const [dashboardStats, setDashboardStats] = useState<{
        activeEvents: number;
        conductedEvents: number;
        avgHoursPerMission: number;
        avgRating: number;
    } | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const now = new Date();
    const activeHostedEvents = events.filter((e) => {
        if (e.status === 'completed' || e.status === 'cancelled') return false;
        if (
            e.missionMode === 'emergency' &&
            e.crisis?.crisisStatus &&
            e.crisis.crisisStatus !== 'resolved'
        ) {
            return true;
        }
        return new Date(e.date) >= now;
    });
    const completedHostedEvents = events.filter((e) => e.status === 'completed');
    const isEventLocked = (event: any) =>
        event.status === 'completed' || event.status === 'cancelled';

    const fetchEvents = async () => {
        try {
            setIsLoading(true);
            const [data, stats] = await Promise.all([
                eventService.getMyEvents(),
                eventService.getNGODashboardStats().catch(() => null)
            ]);
            setEvents(data);
            setDashboardStats(stats);
        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReviewSummary = async () => {
        try {
            const data = await reviewService.getNGOSummary();
            setReviewSummary(data);
        } catch (error) {
            console.error('Failed to fetch review summary:', error);
        }
    };

    const fetchMyImpactPosts = async () => {
        try {
            const data = await impactFeedService.getFeed({ ngo: user?.id, limit: 5 });
            setMyImpactPosts(data.data || []);
        } catch (error) {
            console.error('Failed to fetch impact posts:', error);
            setMyImpactPosts([]);
        }
    };

    const fetchNotifications = async () => {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.isRead).length);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    useEffect(() => {
        fetchEvents();
        fetchNotifications();
        fetchReviewSummary();
        fetchMyImpactPosts();

        // Poll for notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);

        // Handle clicks outside notification dropdown
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            clearInterval(interval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const partnerInvites = notifications.filter(
        (n) => n.type === 'crisis_partner_invite' && (n.event?._id || n.event)
    );

    const handlePartnerInvite = async (eventId: string, response: 'accepted' | 'declined') => {
        setPartnerInviteBusy(eventId);
        try {
            await crisisService.respondPartnerInvite(eventId, response);
            await fetchNotifications();
        } catch (err: any) {
            alert(err.message || 'Failed to respond to invite');
        } finally {
            setPartnerInviteBusy(null);
        }
    };

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const handleDeleteClick = (id: string) => {
        setSelectedEventId(id);
        setIsDeleteModalOpen(true);
    };

    const handleDownloadReport = async (format: 'csv' | 'pdf') => {
        setIsDownloadingReport(true);
        try {
            await reportService.downloadImpactReport(format);
            setIsDownloadModalOpen(false);
        } catch (error) {
            console.error('Failed to download impact report:', error);
        } finally {
            setIsDownloadingReport(false);
        }
    };

    const confirmDelete = async () => {
        if (!selectedEventId) return;
        setIsDeleting(true);
        try {
            await eventService.deleteEvent(selectedEventId);
            setEvents(events.filter(e => e._id !== selectedEventId));
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error('Failed to delete event:', error);
        } finally {
            setIsDeleting(false);
            setSelectedEventId(null);
        }
    };

    const openVolunteersModal = async (event: any) => {
        setVolunteerEvent(event);
        setIsVolunteersModalOpen(true);
        setRemoveMessage('');
        setIsLoadingVolunteers(true);
        try {
            const data = await eventService.getEventVolunteers(event._id);
            setJoinedVolunteers(data.joined || []);
            setWaitlistedVolunteers(data.waitlisted || []);
        } catch (error) {
            console.error('Failed to fetch event volunteers:', error);
            setJoinedVolunteers([]);
            setWaitlistedVolunteers([]);
        } finally {
            setIsLoadingVolunteers(false);
        }
    };

    const handleRemoveVolunteer = async (volunteerId: string) => {
        if (!volunteerEvent) return;
        if (isEventLocked(volunteerEvent)) {
            alert('Cannot remove volunteers from a completed or cancelled mission.');
            return;
        }
        if (!window.confirm('Remove this volunteer from the mission?')) return;

        setIsRemovingVolunteerId(volunteerId);
        try {
            const data = await eventService.removeVolunteerFromEvent(
                volunteerEvent._id,
                volunteerId,
                removeMessage
            );
            setJoinedVolunteers(data.joined || []);
            setWaitlistedVolunteers(data.waitlisted || []);
            setEvents((prev) =>
                prev.map((e) =>
                    e._id === volunteerEvent._id
                        ? {
                              ...e,
                              volunteersJoined: data.joined || [],
                              waitlist: data.waitlisted || []
                          }
                        : e
                )
            );
        } catch (error) {
            console.error('Failed to remove volunteer:', error);
        } finally {
            setIsRemovingVolunteerId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-12 text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <Logo size="md" />

                    <div className="flex items-center gap-4">
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={cn(
                                    "p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors relative",
                                    showNotifications && "bg-slate-100 text-hive-primary"
                                )}
                            >
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                                    <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                        <h3 className="font-bold text-sm">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllRead}
                                                className="text-[10px] font-bold text-hive-primary hover:underline uppercase tracking-wider"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-[400px] overflow-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                                <p className="text-xs text-slate-400">No notifications yet</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-50">
                                                {notifications.map((n) => {
                                                    const eventId = n.event?._id || n.event;
                                                    const isPartnerInvite = n.type === 'crisis_partner_invite' && eventId;
                                                    return (
                                                    <div
                                                        key={n._id}
                                                        className={cn(
                                                            "p-4 hover:bg-slate-50 transition-colors relative",
                                                            !n.isRead && "bg-blue-50/30",
                                                            !isPartnerInvite && "cursor-pointer"
                                                        )}
                                                        onClick={() => !isPartnerInvite && markAsRead(n._id)}
                                                    >
                                                        {!n.isRead && (
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-hive-primary" />
                                                        )}
                                                        <div className="flex gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-hive-primary/10 flex items-center justify-center shrink-0">
                                                                <CheckCircle2 className="h-4 w-4 text-hive-primary" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-slate-900 leading-relaxed">
                                                                    {n.message}
                                                                </p>
                                                                {n.event?.title && (
                                                                    <p className="text-[10px] font-bold text-hive-primary">
                                                                        {n.event.title}
                                                                    </p>
                                                                )}
                                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                                    <Clock className="h-3 w-3" />
                                                                    {new Date(n.createdAt).toLocaleDateString()}
                                                                </div>
                                                                {isPartnerInvite && (
                                                                    <div className="flex gap-2 pt-2">
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-7 text-xs"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handlePartnerInvite(eventId, 'accepted');
                                                                            }}
                                                                            isLoading={partnerInviteBusy === eventId}
                                                                        >
                                                                            Accept
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 text-xs"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handlePartnerInvite(eventId, 'declined');
                                                                            }}
                                                                            disabled={partnerInviteBusy === eventId}
                                                                        >
                                                                            Decline
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-bold">{user?.name}</div>
                                <div className="text-[10px] text-hive-primary uppercase tracking-wider">{user?.role}</div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                {partnerInvites.length > 0 && (
                    <Card className="border-rose-200 bg-rose-50/50 mb-8">
                        <CardContent className="p-5 space-y-3">
                            <h2 className="font-bold text-rose-900 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                Crisis collaboration invites
                            </h2>
                            {partnerInvites.map((n) => {
                                const eventId = n.event?._id || n.event;
                                return (
                                    <div
                                        key={n._id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-rose-100 rounded-xl p-4"
                                    >
                                        <div>
                                            <p className="text-sm text-slate-800">{n.message}</p>
                                            {n.event?.title && (
                                                <p className="text-xs font-bold text-rose-700 mt-1">
                                                    {n.event.title}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                onClick={() => handlePartnerInvite(eventId, 'accepted')}
                                                isLoading={partnerInviteBusy === eventId}
                                            >
                                                Accept
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handlePartnerInvite(eventId, 'declined')}
                                                disabled={partnerInviteBusy === eventId}
                                            >
                                                Decline
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}

                <header className="mb-10 pb-8 border-b border-slate-100 space-y-5">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                            Organization Dashboard
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm sm:text-base">
                            Manage your events and track impact.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                            <Button
                                className="h-10 gap-2 shadow-lg shadow-hive-primary/20 w-full sm:w-auto justify-center"
                                onClick={() => navigate('/ngo-create')}
                            >
                                <Plus className="h-4 w-4 shrink-0" />
                                Create New Event
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 gap-2 border-rose-300 text-rose-700 hover:bg-rose-50 w-full sm:w-auto justify-center"
                                onClick={() => navigate('/ngo-crisis/create')}
                            >
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                Launch Crisis Mission
                            </Button>
                        </div>

                        <div
                            className="hidden sm:block w-px h-8 bg-slate-200 shrink-0"
                            aria-hidden
                        />

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto lg:ml-auto">
                            <Button
                                variant="outline"
                                className="h-10 gap-2 w-full sm:w-auto justify-center"
                                disabled={isDownloadingReport}
                                onClick={() => setIsDownloadModalOpen(true)}
                            >
                                {isDownloadingReport ? (
                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                ) : (
                                    <Download className="h-4 w-4 shrink-0" />
                                )}
                                Download report
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 gap-2 w-full sm:w-auto justify-center"
                                onClick={() => setIsPublishModalOpen(true)}
                            >
                                <Sparkles className="h-4 w-4 shrink-0" />
                                Publish Impact Story
                            </Button>
                        </div>
                    </div>
                </header>

                <Card className="border-slate-200 mb-8">
                    <CardContent className="p-6 space-y-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1 min-w-0">
                                <h2 className="text-lg font-bold text-slate-900">
                                    Impact Story Management
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Stories published by your organization
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:shrink-0">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 gap-2 justify-center"
                                    onClick={() => setIsPublishModalOpen(true)}
                                >
                                    <Sparkles className="h-4 w-4 shrink-0" />
                                    Publish to a mission
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 justify-center"
                                    onClick={() => navigate('/impact-feed')}
                                >
                                    Open Feed
                                </Button>
                            </div>
                        </div>

                        {myImpactPosts.length === 0 ? (
                            <p className="text-sm text-slate-500 py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                No impact stories published yet. Share your mission outcomes to recognize
                                volunteers and build trust.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {myImpactPosts.map((post) => (
                                    <div
                                        key={post._id}
                                        className="flex items-center gap-4 border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <p className="text-sm font-bold text-slate-900 truncate">
                                                {post.title}
                                            </p>
                                            <p className="text-xs text-slate-500 tabular-nums">
                                                {post.likesCount || 0} likes · {post.commentsCount || 0}{' '}
                                                comments
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-9 shrink-0 px-4"
                                            onClick={() => navigate(`/impact-feed?focus=${post._id}`)}
                                        >
                                            View
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Stats Overview */}
                {reviewSummary && reviewSummary.recentReviews?.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                Volunteer Feedback
                            </h2>
                            <span className="text-sm font-bold text-amber-600">
                                Org avg: {reviewSummary.overallAverage > 0 ? reviewSummary.overallAverage.toFixed(1) : '—'} ★
                            </span>
                        </div>
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                            {reviewSummary.recentReviews.slice(0, 5).map((r: any) => (
                                <div key={r._id} className="flex items-start justify-between gap-4 text-sm border-b border-slate-50 pb-2 last:border-0">
                                    <div>
                                        <span className="font-bold">{r.volunteer?.name}</span>
                                        <span className="text-slate-400 mx-2">·</span>
                                        <span className="text-slate-600">{r.event?.title}</span>
                                        {r.comment && <p className="text-slate-500 text-xs mt-1 line-clamp-2">{r.comment}</p>}
                                    </div>
                                    <span className="font-bold text-amber-600 shrink-0">{r.rating} ★</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <DashboardStat
                        icon={<Calendar className="h-6 w-6" />}
                        label="Active Events"
                        value={String(dashboardStats?.activeEvents ?? activeHostedEvents.length)}
                        color="blue"
                    />
                    <DashboardStat
                        icon={<CheckCircle2 className="h-6 w-6" />}
                        label="Conducted Events"
                        value={String(dashboardStats?.conductedEvents ?? completedHostedEvents.length)}
                        color="green"
                    />
                    <DashboardStat
                        icon={<Clock className="h-6 w-6" />}
                        label="Avg Hours / Mission"
                        value={
                            dashboardStats && dashboardStats.avgHoursPerMission > 0
                                ? `${dashboardStats.avgHoursPerMission}h`
                                : '—'
                        }
                        color="purple"
                    />
                    <DashboardStat
                        icon={<Star className="h-6 w-6" />}
                        label="Avg Rating"
                        value={
                            dashboardStats && dashboardStats.avgRating > 0
                                ? `${dashboardStats.avgRating.toFixed(1)} ★`
                                : '—'
                        }
                        color="blue"
                    />
                </div>

                <div className="space-y-10">
                    <HostedEventsSection
                        title="Your Hosted Events"
                        subtitle="Upcoming and in-progress missions you can still manage."
                        events={activeHostedEvents}
                        isLoading={isLoading}
                        emptyTitle="No active events"
                        emptyMessage="Create a new mission or check completed events below."
                        navigate={navigate}
                        onDeleteClick={handleDeleteClick}
                        onOpenVolunteers={openVolunteersModal}
                        isEventLocked={isEventLocked}
                        showManageActions
                    />

                    <HostedEventsSection
                        title="Completed Events"
                        subtitle="Finished missions — roster is locked; view attendance and impact from the mission hub."
                        events={completedHostedEvents}
                        isLoading={isLoading}
                        emptyTitle="No completed events yet"
                        emptyMessage="Mark a mission as completed from its mission hub when volunteers have checked in."
                        navigate={navigate}
                        onDeleteClick={handleDeleteClick}
                        onOpenVolunteers={openVolunteersModal}
                        isEventLocked={isEventLocked}
                        showManageActions={false}
                    />
                </div>
            </main>

            <Modal
                isOpen={isDownloadModalOpen}
                onClose={() => !isDownloadingReport && setIsDownloadModalOpen(false)}
                title="Download impact report"
            >
                <p className="text-sm text-slate-600 mb-6">
                    Choose a format for your organization&apos;s impact report.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        disabled={isDownloadingReport}
                        onClick={() => handleDownloadReport('csv')}
                    >
                        {isDownloadingReport ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        CSV spreadsheet
                    </Button>
                    <Button
                        className="flex-1 gap-2"
                        disabled={isDownloadingReport}
                        onClick={() => handleDownloadReport('pdf')}
                    >
                        {isDownloadingReport ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        PDF document
                    </Button>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isPublishModalOpen}
                onClose={() => setIsPublishModalOpen(false)}
                title="Publish impact story"
            >
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-slate-600">
                        Choose a mission to link your story. Mark it completed and check in volunteers
                        before publishing.
                    </p>
                    {events.length === 0 ? (
                        <p className="text-sm text-slate-500">Create a mission first.</p>
                    ) : (
                        <div className="space-y-2">
                            {events.map((ev) => (
                                <div
                                    key={ev._id}
                                    className="border border-slate-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                                >
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{ev.title}</p>
                                        <p className="text-xs text-slate-500 capitalize">
                                            {ev.status} · {new Date(ev.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {ev.status !== 'completed' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setIsPublishModalOpen(false);
                                                    navigate(`/ngo-mission/${ev._id}`);
                                                }}
                                            >
                                                Complete first
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setIsPublishModalOpen(false);
                                                navigate(`/impact-feed?eventId=${ev._id}`);
                                            }}
                                        >
                                            Publish story
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Event"
            >
                <div className="space-y-4">
                    <p className="text-slate-600">Are you sure you want to delete this event? This action cannot be undone and will notify all joined volunteers.</p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-rose-600 hover:bg-rose-700 hover:border-rose-700"
                            onClick={confirmDelete}
                            isLoading={isDeleting}
                        >
                            Delete Event
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isVolunteersModalOpen}
                onClose={() => setIsVolunteersModalOpen(false)}
                title={volunteerEvent ? `Volunteers · ${volunteerEvent.title}` : 'Volunteers'}
            >
                <div className="space-y-4">
                    {volunteerEvent && isEventLocked(volunteerEvent) && (
                        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            This mission is completed. The volunteer roster is locked and cannot be changed.
                        </p>
                    )}
                    {volunteerEvent && !isEventLocked(volunteerEvent) && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Message shown when removing volunteer
                            </label>
                            <textarea
                                className="w-full mt-1 p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-hive-primary/20 outline-none resize-none"
                                rows={2}
                                value={removeMessage}
                                onChange={(e) => setRemoveMessage(e.target.value)}
                                placeholder="You were removed because..."
                            />
                        </div>
                    )}

                    {isLoadingVolunteers ? (
                        <div className="py-10 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-hive-primary" />
                        </div>
                    ) : (
                        <div className="space-y-5 max-h-[420px] overflow-auto pr-1">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 mb-2">
                                    Joined Volunteers ({joinedVolunteers.length})
                                </h4>
                                <div className="space-y-2">
                                    {joinedVolunteers.length === 0 && (
                                        <p className="text-xs text-slate-400">No joined volunteers yet.</p>
                                    )}
                                    {joinedVolunteers.map((v) => (
                                        <div
                                            key={v._id}
                                            className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3"
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{v.name}</p>
                                                <p className="text-xs text-slate-500">{v.email}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => navigate(`/ngo-volunteer/${v._id}`)}
                                                >
                                                    View dashboard
                                                </Button>
                                                {!isEventLocked(volunteerEvent) && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                                        onClick={() => handleRemoveVolunteer(v._id)}
                                                        isLoading={isRemovingVolunteerId === v._id}
                                                    >
                                                        <UserX className="h-4 w-4 mr-1" />
                                                        Remove
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-slate-900 mb-2">
                                    Waitlisted Volunteers ({waitlistedVolunteers.length})
                                </h4>
                                <div className="space-y-2">
                                    {waitlistedVolunteers.length === 0 && (
                                        <p className="text-xs text-slate-400">No waitlisted volunteers.</p>
                                    )}
                                    {waitlistedVolunteers.map((v) => (
                                        <div
                                            key={v._id}
                                            className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3"
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{v.name}</p>
                                                <p className="text-xs text-slate-500">{v.email}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => navigate(`/ngo-volunteer/${v._id}`)}
                                                >
                                                    View dashboard
                                                </Button>
                                                {!isEventLocked(volunteerEvent) && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                                        onClick={() => handleRemoveVolunteer(v._id)}
                                                        isLoading={isRemovingVolunteerId === v._id}
                                                    >
                                                        <UserX className="h-4 w-4 mr-1" />
                                                        Remove
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}

function HostedEventsSection({
    title,
    subtitle,
    events,
    isLoading,
    emptyTitle,
    emptyMessage,
    navigate,
    onDeleteClick,
    onOpenVolunteers,
    isEventLocked,
    showManageActions
}: {
    title: string;
    subtitle: string;
    events: any[];
    isLoading: boolean;
    emptyTitle: string;
    emptyMessage: string;
    navigate: (path: string) => void;
    onDeleteClick: (id: string) => void;
    onOpenVolunteers: (event: any) => void;
    isEventLocked: (event: any) => boolean;
    showManageActions: boolean;
}) {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
            </div>

            {isLoading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 text-hive-primary animate-spin mb-4" />
                    <p className="text-slate-500">Loading...</p>
                </div>
            ) : events.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{emptyTitle}</h3>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">{emptyMessage}</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
                    <table className="w-full text-left min-w-[720px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Mission</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Volunteers</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Rating</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {events.map((event) => (
                                <tr key={event._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 items-start">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/ngo-mission/${event._id}`)}
                                                className="font-bold text-slate-900 text-left hover:text-hive-primary hover:underline"
                                            >
                                                {event.title}
                                            </button>
                                            {event.missionMode === 'emergency' && (
                                                <span className="inline-flex px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-black uppercase">
                                                    Emergency
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {new Date(event.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase capitalize">
                                            {event.status || 'upcoming'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="font-bold">{event.volunteersJoined?.length || 0}</span>
                                        <span className="text-slate-400"> / {event.capacity}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {event.reviewCount > 0 ? (
                                            <span className="flex items-center gap-1 text-sm font-bold text-amber-600">
                                                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                                {event.averageRating?.toFixed(1)} ({event.reviewCount})
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/ngo-attendance/${event._id}`)}
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                                title="Attendance"
                                            >
                                                <UserCheck className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => onOpenVolunteers(event)}
                                                className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg"
                                                title={showManageActions ? 'Manage volunteers' : 'View roster'}
                                            >
                                                <Users className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/event/${event._id}`)}
                                                className="p-2 text-slate-400 hover:text-hive-primary hover:bg-hive-primary/5 rounded-lg"
                                                title="Public page"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            {showManageActions && !isEventLocked(event) && (
                                                <>
                                                    <button
                                                        onClick={() => navigate(`/ngo-edit/${event._id}`)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteClick(event._id)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function DashboardStat({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: 'blue' | 'green' | 'purple' }) {
    const colorStyles = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        purple: "bg-purple-50 text-purple-600"
    };

    return (
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colorStyles[color])}>
                    {icon}
                </div>
                <div>
                    <div className="text-sm font-medium text-slate-500">{label}</div>
                    <div className="text-2xl font-black text-slate-900">{value}</div>
                </div>
            </CardContent>
        </Card>
    );
}
