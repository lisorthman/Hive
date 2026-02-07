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
    Bell,
    MoreVertical,
    TrendingUp,
    Users,
    LogOut,
    Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Logo } from '../../components/ui/Logo';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { authService } from '../../lib/auth';
import { eventService } from '../../lib/events';

export default function VolunteerDashboard() {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();
    const [recommendedEvents, setRecommendedEvents] = useState<any[]>([]);
    const [joinedEvents, setJoinedEvents] = useState<any[]>([]);
    const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [allEvents, joined] = await Promise.all([
                    eventService.getEvents(),
                    eventService.getJoinedEvents()
                ]);

                const ids = new Set<string>(joined.map((e: any) => e._id));
                setJoinedIds(ids);

                // Show top 4 events as recommendations
                setRecommendedEvents(allEvents.slice(0, 4));
                setJoinedEvents(joined);
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
                        <button className="p-2 text-hive-text-secondary hover:bg-slate-50 rounded-lg transition-colors relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-hive-secondary rounded-full border-2 border-white" />
                        </button>
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
                        <div className="flex gap-3">
                            <Button variant="outline" size="sm" className="gap-2">
                                <Download className="h-4 w-4" /> Impact Resume
                            </Button>
                            <Button size="sm" className="gap-2" onClick={() => navigate('/discovery')}>
                                <Search className="h-4 w-4" /> Find Events
                            </Button>
                        </div>
                    </motion.div>
                </section>

                {/* Stats Grid */}
                <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    <StatCard
                        icon={<Clock className="h-5 w-5" />}
                        label="Total Hours"
                        value={(joinedEvents.length * 4).toString()} // Simulated hours calculation
                        trend="+12h this month"
                        color="primary"
                    />
                    <StatCard
                        icon={<Calendar className="h-5 w-5" />}
                        label="Events Joined"
                        value={joinedEvents.length.toString()}
                        trend="Rank: Top 5%"
                        color="secondary"
                    />
                    <StatCard
                        icon={<Award className="h-5 w-5" />}
                        label="Badges Earned"
                        value="3"
                        trend="New badge unlocked"
                        color="primary"
                    />
                    <StatCard
                        icon={<TrendingUp className="h-5 w-5" />}
                        label="Community Score"
                        value={(joinedEvents.length * 100 + 450).toString()}
                        trend="Level 2"
                        color="secondary"
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
                                    recommendedEvents.map(event => (
                                        <DashboardEventCard
                                            key={event._id}
                                            id={event._id}
                                            image={event.image || "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80"}
                                            title={event.title}
                                            ngo={event.ngoName}
                                            date={new Date(event.date).toLocaleDateString()}
                                            hours="4h"
                                            onClick={() => navigate(`/event/${event._id}`)}
                                            isJoined={joinedIds.has(event._id)}
                                        />
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
                                                onClick={() => navigate(`/event/${event._id}`)}
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
                                <Button size="sm" className="bg-white text-hive-primary hover:bg-slate-50 w-full">Learn More</Button>
                            </div>
                        </Card>

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold">Quick Settings</h3>
                            <div className="space-y-2">
                                <QuickActionItem icon={<Users className="h-4 w-4" />} label="Network Activity" count={5} />
                                <QuickActionItem icon={<Bell className="h-4 w-4" />} label="Notification Preferences" />
                                <QuickActionItem icon={<Settings className="h-4 w-4" />} label="Account Security" />
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

function QuickActionItem({ icon, label, count }: { icon: React.ReactNode, label: string, count?: number }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
                <div className="text-hive-text-secondary group-hover:text-hive-primary transition-colors">
                    {icon}
                </div>
                <span className="text-sm font-medium text-hive-text-secondary group-hover:text-hive-text-primary transition-colors">{label}</span>
            </div>
            {count && (
                <span className="text-[10px] font-black bg-hive-secondary text-white px-1.5 py-0.5 rounded-full">{count}</span>
            )}
        </div>
    );
}
