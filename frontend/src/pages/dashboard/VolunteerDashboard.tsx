import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    Clock,
    Award,
    ChevronRight,
    Search,
    Download,
    Settings,
    MoreVertical,
    TrendingUp,
    LogOut,
    Loader2,
    Sparkles
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Logo } from '../../components/ui/Logo';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { authService } from '../../lib/auth';
import { eventService } from '../../lib/events';
import { missionPath } from '../../lib/missions';
import { attendanceService } from '../../lib/attendance';
import { NotificationDropdown } from '../../components/notifications/NotificationDropdown';
import { VolunteerMissionCalendar } from '../../components/calendar/VolunteerMissionCalendar';

export default function VolunteerDashboard() {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();
    const [recommendedEvents, setRecommendedEvents] = useState<any[]>([]);
    const [joinedEvents, setJoinedEvents] = useState<any[]>([]);
    const [waitlistedEvents, setWaitlistedEvents] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
    const [stats, setStats] = useState<any>({
        totalHours: 0,
        checkedInCount: 0,
        joinedCount: 0,
        communityScore: 0,
        level: 1,
        badges: []
    });
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const getGeo = () =>
            new Promise<{ lat: number; lng: number } | null>((resolve) => {
                if (!navigator.geolocation) {
                    resolve(null);
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (pos) =>
                        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    () => resolve(null),
                    { timeout: 4000 }
                );
            });

        const fetchData = async () => {
            try {
                setIsLoading(true);

                const [joined, waitlisted, volunteerStats, me] = await Promise.all([
                    eventService.getJoinedEvents(),
                    eventService.getWaitlistedEvents(),
                    attendanceService.getVolunteerStats(),
                    authService.getMe().catch(() => user)
                ]);

                const ids = new Set<string>(joined.map((e: any) => e._id));
                setJoinedIds(ids);
                setJoinedEvents(joined);
                setWaitlistedEvents(waitlisted);
                setProfile(me);
                setStats(volunteerStats);

                try {
                    const geo = await getGeo();
                    const recommended = await eventService.getRecommendedEvents(
                        geo?.lat,
                        geo?.lng
                    );
                    setRecommendedEvents(recommended.slice(0, 4));
                } catch {
                    const fallback = await eventService.getEvents();
                    setRecommendedEvents(fallback.slice(0, 4));
                }
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-hive-background">
                <Loader2 className="h-10 w-10 text-hive-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-hive-background pb-12 text-hive-text-primary">
            {/* ... header ... */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <Logo size="md" />

                    <div className="flex items-center gap-4">
                        <NotificationDropdown />
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-100 font-bold">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm">{user?.name || 'Volunteer'}</div>
                                <div className="text-[10px] text-hive-primary uppercase tracking-wider">{user?.role || 'Volunteer'}</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden cursor-pointer">
                                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80" alt="Avatar" />
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-hive-text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                {/* Welcome Block */}
                <section className="mb-10">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                        <div>
                            <h2 className="text-3xl font-extrabold tracking-tight">Welcome back, {user?.name.split(' ')[0] || 'Volunteer'}!</h2>
                            <p className="text-hive-text-secondary mt-1">You've joined <span className="text-hive-primary font-bold">{joinedEvents.length}</span> missions so far. Great job!</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/profile')}>
                                <Settings className="h-4 w-4" /> Edit Profile
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open('/resume', '_blank')}>
                                <Download className="h-4 w-4" /> Impact Resume
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2 text-hive-primary border-hive-primary/20 hover:bg-hive-primary/5 font-bold" onClick={() => navigate('/leaderboard')}>
                                <Award className="h-4 w-4" /> Leaderboard
                            </Button>
                            <Button size="sm" className="gap-2 font-bold" onClick={() => navigate('/discovery')}>
                                <Search className="h-4 w-4" /> Find Events
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/impact-feed')}>
                                <Sparkles className="h-4 w-4" /> Impact Feed
                            </Button>
                        </div>
                    </motion.div>
                </section>

                {/* Stats Grid */}
                <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    <StatCard
                        icon={<Clock className="h-5 w-5" />}
                        label="Total Hours"
                        value={stats.totalHours.toString()}
                        trend={`${stats.checkedInCount} missions verified`}
                        color="primary"
                    />
                    <StatCard
                        icon={<Calendar className="h-5 w-5" />}
                        label="Events Joined"
                        value={stats.joinedCount.toString()}
                        trend="Active status"
                        color="secondary"
                    />
                    <StatCard
                        icon={<Award className="h-5 w-5" />}
                        label="Badges Earned"
                        value={(stats.badges || []).length.toString()}
                        trend={`${stats.badges?.length || 0} unlocked`}
                        color="primary"
                    />
                    <StatCard
                        icon={<TrendingUp className="h-5 w-5" />}
                        label="Community Score"
                        value={(stats.communityScore || 0).toString()}
                        trend={`Level ${stats.level || 1}`}
                        color="secondary"
                    />
                </section>

                <section className="mb-10">
                    <VolunteerMissionCalendar
                        joinedEvents={joinedEvents}
                        waitlistedEvents={waitlistedEvents}
                    />
                </section>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* Recommended Section */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold">Recommended for You</h3>
                                <button className="text-sm font-bold text-hive-primary hover:underline" onClick={() => navigate('/discovery')}>See all</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {recommendedEvents.length > 0 ? (
                                    recommendedEvents.map((event: any) => (
                                        <div key={event._id} className="space-y-1">
                                            <DashboardEventCard
                                                id={event._id}
                                                image={event.image || "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80"}
                                                title={event.title}
                                                ngo={event.ngoName}
                                                date={new Date(event.date).toLocaleDateString()}
                                                hours="4h"
                                                onClick={() => navigate(missionPath(event))}
                                                isJoined={joinedIds.has(event._id)}
                                            />
                                            {event.matchReasons?.length > 0 && (
                                                <p className="text-[10px] text-hive-primary font-medium px-1 line-clamp-1">
                                                    {event.matchReasons.join(' · ')}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 py-10 text-center bg-white rounded-xl border border-dashed border-slate-200">
                                        <p className="text-hive-text-secondary italic">No new recommendations right now.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Upcoming Events List */}
                        <section className="space-y-6">
                            <h3 className="text-xl font-bold">Your Upcoming Events</h3>
                            <Card padding="none">
                                <div className="divide-y divide-slate-50">
                                    {joinedEvents.length > 0 ? (
                                        joinedEvents.map(event => (
                                            <UpcomingListItem
                                                key={event._id}
                                                title={event.title}
                                                ngo={event.ngoName}
                                                date={`${new Date(event.date).toLocaleDateString()} • 09:00 AM`}
                                                status="Confirmed"
                                                onClick={() => navigate(missionPath(event))}
                                            />
                                        ))
                                    ) : (
                                        <div className="p-12 text-center space-y-4">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                                <Calendar className="h-8 w-8 text-slate-300" />
                                            </div>
                                            <p className="text-hive-text-secondary">You haven't joined any missions yet.</p>
                                            <Button variant="outline" size="sm" onClick={() => navigate('/discovery')}>Discover Missions</Button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </section>

                        <section className="space-y-6">
                            <h3 className="text-xl font-bold">Your Previous Volunteering</h3>
                            <Card padding="none">
                                <div className="divide-y divide-slate-50">
                                    {stats.recentHistory?.length ? (
                                        stats.recentHistory.map((item: any) => (
                                            <div
                                                key={item.attendanceId}
                                                className="p-4 sm:p-5 flex items-center justify-between gap-4"
                                            >
                                                <div>
                                                    <p className="text-sm font-bold text-hive-text-primary">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-xs text-hive-text-secondary">
                                                        {new Date(item.date).toLocaleDateString()} · {item.category}
                                                        {item.ngoName ? ` · ${item.ngoName}` : ''}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                                                        {item.status}
                                                    </p>
                                                    <p className="text-xs text-hive-text-secondary">
                                                        {item.hoursWorked}h
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-hive-text-secondary text-sm">
                                            No completed volunteering records yet.
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </section>

                        {waitlistedEvents.length > 0 && (
                            <section className="space-y-6">
                                <h3 className="text-xl font-bold">Waitlisted Missions</h3>
                                <Card padding="none">
                                    <div className="divide-y divide-slate-50">
                                        {waitlistedEvents.map((event) => (
                                            <UpcomingListItem
                                                key={event._id}
                                                title={event.title}
                                                ngo={event.ngoName}
                                                date={new Date(event.date).toLocaleDateString()}
                                                status="Waitlist"
                                                onClick={() => navigate(missionPath(event))}
                                            />
                                        ))}
                                    </div>
                                </Card>
                            </section>
                        )}
                    </div>

                    {/* Sidebar Area */}
                    <div className="space-y-8">
                        <Card className="bg-hive-primary border-none text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-20">
                                <Award className="h-24 w-24 -mr-8 -mt-8" />
                            </div>
                            <div className="relative z-10 space-y-4">
                                <Badge variant="primary" className="bg-white/20 text-white border-none">Feature Update</Badge>
                                <h4 className="text-xl font-bold">New: Monthly Impact Reports</h4>
                                <p className="text-sm opacity-90 leading-relaxed">
                                    You can now generate automated impact certificates signed by the community board.
                                </p>
                                <Button size="sm" className="bg-white text-hive-primary hover:bg-slate-50 w-full" onClick={() => window.open('/resume', '_blank')}>Generate Certificate</Button>
                            </div>
                        </Card>

                        {/* Earned Badges Section */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">Your Badges</h3>
                                <span className="text-xs font-bold text-hive-primary bg-hive-primary/10 px-2.5 py-0.5 rounded-full">
                                    {stats.badges?.length || 0} Earned
                                </span>
                            </div>
                            <Card className="p-4">
                                {stats.badges && stats.badges.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {stats.badges.map((badge: any) => (
                                            <div key={badge.id} className="flex flex-col items-center text-center p-3 rounded-xl border border-slate-100/50 hover:bg-slate-50 transition-all group">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center mb-2 shadow-sm transition-transform group-hover:scale-110",
                                                    badge.color === 'green' && "bg-green-50 text-green-600",
                                                    badge.color === 'blue' && "bg-blue-50 text-blue-600",
                                                    badge.color === 'orange' && "bg-orange-50 text-orange-600",
                                                    badge.color === 'slate' && "bg-slate-100 text-slate-600",
                                                    badge.color === 'yellow' && "bg-yellow-50 text-yellow-600",
                                                    badge.color === 'purple' && "bg-purple-50 text-purple-600",
                                                    badge.color === 'teal' && "bg-teal-50 text-teal-600"
                                                )}>
                                                    <Award className="h-5 w-5" />
                                                </div>
                                                <span className="text-xs font-bold text-hive-text-primary leading-tight">{badge.name}</span>
                                                <span className="text-[9px] text-hive-text-secondary mt-1 leading-tight">{badge.description}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-hive-text-secondary space-y-2">
                                        <Award className="h-10 w-10 text-slate-200 mx-auto animate-pulse" />
                                        <p className="text-xs italic">No badges unlocked yet. Join and check-in to missions to earn badges!</p>
                                    </div>
                                )}
                            </Card>
                        </section>

                        {profile?.interests?.length > 0 && (
                            <Card>
                                <CardContent className="p-4 space-y-2">
                                    <h3 className="text-sm font-bold">Your interests</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {profile.interests.map((i: string) => (
                                            <Badge key={i} variant="primary" className="text-[10px]">
                                                {i}
                                            </Badge>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        className="text-xs font-bold text-hive-primary hover:underline"
                                        onClick={() => navigate('/profile')}
                                    >
                                        Update profile
                                    </button>
                                </CardContent>
                            </Card>
                        )}

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold">Quick Settings</h3>
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 text-left"
                                    onClick={() => navigate('/profile')}
                                >
                                    <span className="flex items-center gap-2 text-sm font-bold">
                                        <Settings className="h-4 w-4" /> Edit profile & skills
                                    </span>
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ icon, label, value, trend, color }: { icon: React.ReactNode, label: string, value: string, trend: string, color: 'primary' | 'secondary' }) {
    return (
        <Card className="hover:shadow-soft transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        color === 'primary' ? "bg-hive-primary/10 text-hive-primary" : "bg-hive-secondary/10 text-hive-secondary"
                    )}>
                        {icon}
                    </div>
                    <span className="text-xs font-bold text-hive-text-secondary uppercase tracking-wider">{label}</span>
                </div>
                <div className="text-2xl font-black mb-1">{value}</div>
                <div className="text-[10px] font-bold text-hive-text-secondary">{trend}</div>
            </CardContent>
        </Card>
    );
}

function DashboardEventCard({ image, title, ngo, date, hours, onClick, isJoined }: { id: string, image: string, title: string, ngo: string, date: string, hours: string, onClick?: () => void, isJoined?: boolean }) {
    return (
        <div className="group cursor-pointer bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-soft transition-all overflow-hidden" onClick={onClick}>
            <div className="h-32 overflow-hidden relative">
                <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
                    <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-[10px]">{hours}</Badge>
                    {isJoined && (
                        <Badge variant="primary" className="bg-hive-primary text-white border-none text-[10px] shadow-sm">Already Joined</Badge>
                    )}
                </div>
            </div>
            <div className="p-4 space-y-2">
                <div className="text-[10px] font-bold text-hive-primary uppercase tracking-widest">{ngo}</div>
                <h4 className="font-bold truncate">{title}</h4>
                <div className="flex items-center justify-between">
                    <span className={cn("text-xs", isJoined ? "text-hive-primary font-bold" : "text-hive-text-secondary")}>
                        {isJoined ? "Mission Secured" : date}
                    </span>
                    <ChevronRight className="h-4 w-4 text-hive-text-secondary group-hover:text-hive-primary group-hover:translate-x-1 transition-all" />
                </div>
            </div>
        </div>
    );
}

function UpcomingListItem({ title, ngo, date, status, onClick }: { title: string, ngo: string, date: string, status: string, onClick?: () => void }) {
    return (
        <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer" onClick={onClick}>
            <div className="flex items-center gap-4">
                <div className="hidden sm:flex w-12 h-12 bg-slate-50 rounded-lg items-center justify-center text-hive-text-secondary">
                    <Calendar className="h-6 w-6" />
                </div>
                <div>
                    <h4 className="font-bold text-sm sm:text-base">{title}</h4>
                    <div className="flex items-center gap-2 text-xs text-hive-text-secondary">
                        <span className="font-bold text-hive-secondary">{ngo}</span>
                        <span>•</span>
                        <span>{date}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <Badge variant={status === 'Confirmed' ? 'primary' : 'gray'} className="hidden md:inline-flex">
                    {status}
                </Badge>
                <button
                    className="p-2 text-hive-text-secondary hover:bg-slate-200 rounded-lg transition-colors"
                    onClick={(e) => { e.stopPropagation(); }}
                >
                    <MoreVertical className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

