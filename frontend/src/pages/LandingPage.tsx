import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Navbar } from '../components/layout/Navbar';
import { Logo } from '../components/ui/Logo';
import {
    Search,
    MapPin,
    Calendar,
    Users,
    ChevronRight,
    CheckCircle2,
    Award,
    TrendingUp,
    Globe,
    Zap,
    ArrowRight,
    Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import { eventService } from '../lib/events';
import { missionPath } from '../lib/missions';
import { EmergencyBadge } from '../components/crisis/EmergencyBadge';

type Mission = {
    _id: string;
    title: string;
    ngoName: string;
    category: string;
    date: string;
    image?: string;
    location?: { name?: string };
    missionMode?: string;
    crisis?: { urgencyLevel?: string };
    missionType?: string;
    capacity: number;
    volunteersJoined?: string[];
};

export default function LandingPage() {
    const navigate = useNavigate();
    const [missions, setMissions] = useState<Mission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                setLoadError(null);
                const data = await eventService.getEvents();
                setMissions(Array.isArray(data) ? data : []);
            } catch (err: any) {
                setLoadError(err.message || 'Could not load missions');
                setMissions([]);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const upcoming = useMemo(() => {
        const now = Date.now();
        return missions
            .filter((m) => new Date(m.date).getTime() >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [missions]);

    const featured = upcoming.slice(0, 3);

    const platformStats = useMemo(() => {
        const ngoNames = new Set(
            missions.map((m) => m.ngoName).filter((name): name is string => !!name)
        );
        const openSlots = upcoming.reduce(
            (sum, m) =>
                sum + Math.max(0, m.capacity - (m.volunteersJoined?.length || 0)),
            0
        );
        return {
            upcomingCount: upcoming.length,
            partnerCount: ngoNames.size,
            openSlots
        };
    }, [missions, upcoming]);

    return (
        <div className="min-h-screen bg-hive-background">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-hive-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-hive-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-8"
                    >
                        <Badge variant="primary" className="px-4 py-1">Community Focused Platform</Badge>
                        <h1 className="text-5xl md:text-7xl font-extrabold text-hive-text-primary tracking-tight leading-[1.1]">
                            Serve Your Community.<br />
                            <span className="text-hive-primary">Track Your Impact.</span>
                        </h1>
                        <p className="text-xl text-hive-text-secondary max-w-2xl mx-auto leading-relaxed">
                            Hive connects passionate volunteers with meaningful opportunities. Track your hours, earn recognition, and witness the change you bring to the world.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Button
                                size="lg"
                                className="w-full sm:w-auto px-10 gap-2"
                                onClick={() => navigate('/discovery')}
                            >
                                Browse missions <ArrowRight className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full sm:w-auto px-10"
                                onClick={() => navigate('/register', { state: { role: 'volunteer' } })}
                            >
                                Join as Volunteer
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full sm:w-auto px-10"
                                onClick={() => navigate('/register', { state: { role: 'ngo' } })}
                            >
                                Register as NGO
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* How Hive Works */}
            <section className="py-24 bg-white border-y border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl font-bold">How Hive Works</h2>
                        <p className="text-hive-text-secondary max-w-xl mx-auto">
                            Three simple steps to start making a real difference in your community today.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        <StepCard
                            icon={<Search className="h-8 w-8 text-hive-primary" />}
                            title="Discover local events"
                            description="Browse verified volunteering opportunities on the map or list—no account required to explore."
                            delay={0.1}
                        />
                        <StepCard
                            icon={<Zap className="h-8 w-8 text-hive-secondary" />}
                            title="Volunteer & check in"
                            description="Create a free account to join missions, RSVP for recurring dates, and log hours with organizer check-in."
                            delay={0.2}
                        />
                        <StepCard
                            icon={<Award className="h-8 w-8 text-hive-primary" />}
                            title="Earn recognition"
                            description="Build your volunteer profile with verified hours, reviews, and impact stories from the missions you support."
                            delay={0.3}
                        />
                    </div>
                </div>
            </section>

            {/* Upcoming missions from API */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-end justify-between mb-12 gap-4 flex-wrap">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold">Upcoming missions</h2>
                            <p className="text-hive-text-secondary">
                                Live opportunities from NGOs on Hive—updated from the community feed.
                            </p>
                        </div>
                        <Button variant="ghost" className="gap-1" onClick={() => navigate('/discovery')}>
                            View all events <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-10 w-10 text-hive-primary animate-spin" />
                        </div>
                    ) : loadError ? (
                        <Card className="p-8 text-center space-y-4">
                            <p className="text-hive-text-secondary">{loadError}</p>
                            <Button onClick={() => navigate('/discovery')}>Open event discovery</Button>
                        </Card>
                    ) : featured.length === 0 ? (
                        <Card className="p-8 text-center space-y-4">
                            <p className="text-hive-text-secondary">
                                No upcoming missions are listed right now. Check back soon or explore the full catalog.
                            </p>
                            <Button onClick={() => navigate('/discovery')}>Browse discovery</Button>
                        </Card>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-8">
                            {featured.map((mission) => (
                                <FeaturedMissionCard key={mission._id} mission={mission} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Platform snapshot from live data */}
            <section className="py-24 bg-hive-primary text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h2 className="text-4xl font-bold mb-4">On the platform now</h2>
                    <p className="text-white/80 mb-12 max-w-lg mx-auto text-sm">
                        Counts reflect missions currently published in Hive—not marketing estimates.
                    </p>
                    {isLoading ? (
                        <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-80" />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                            <StatItem value={platformStats.upcomingCount} label="Upcoming missions" />
                            <StatItem value={platformStats.partnerCount} label="NGO partners listed" />
                            <StatItem value={platformStats.openSlots} label="Open volunteer slots" />
                        </div>
                    )}
                </div>
            </section>

            {/* Trust & Credibility Section */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto space-y-8 text-center">
                        <h2 className="text-4xl font-extrabold text-hive-text-primary leading-tight">
                            Built on Trust, Transparency, and Community.
                        </h2>
                        <div className="space-y-6 text-left">
                            <TrustItem
                                title="Verified Partners"
                                description="NGOs complete Hive verification before publishing missions, so volunteers know who they are supporting."
                            />
                            <TrustItem
                                title="Audited Impact"
                                description="Check-ins and attendance are confirmed by organizers, feeding hours and impact reporting you can trust."
                            />
                            <TrustItem
                                title="Data Privacy"
                                description="You control your profile and story visibility; browse missions publicly without signing in."
                            />
                        </div>
                        <Button size="lg" className="gap-2" onClick={() => navigate('/discovery')}>
                            Explore missions <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-2 space-y-6">
                            <Link to="/"><Logo /></Link>
                            <p className="text-hive-text-secondary max-w-sm">
                                The community-first platform for discovering, managing, and tracking volunteering impact across the globe.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold">Platform</h4>
                            <ul className="space-y-2 text-hive-text-secondary">
                                <li>
                                    <Link to="/discovery" className="hover:text-hive-primary">
                                        Find events
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/crisis" className="hover:text-hive-primary">
                                        Crisis Hub
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/register" className="hover:text-hive-primary">
                                        Create account
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/login" className="hover:text-hive-primary">
                                        Log in
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold">Get started</h4>
                            <ul className="space-y-2 text-hive-text-secondary">
                                <li>
                                    <button
                                        type="button"
                                        className="hover:text-hive-primary text-left"
                                        onClick={() => navigate('/register', { state: { role: 'volunteer' } })}
                                    >
                                        Volunteer registration
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        className="hover:text-hive-primary text-left"
                                        onClick={() => navigate('/register', { state: { role: 'ngo' } })}
                                    >
                                        NGO registration
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-hive-text-secondary">
                            © {new Date().getFullYear()} Hive Platform. All rights reserved.
                        </p>
                        <div className="flex gap-6">
                            <Globe className="h-5 w-5 text-hive-text-secondary" />
                            <Users className="h-5 w-5 text-hive-text-secondary" />
                            <TrendingUp className="h-5 w-5 text-hive-text-secondary" />
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function StepCard({
    icon,
    title,
    description,
    delay
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
            className="space-y-4"
        >
            <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">{icon}</div>
            <h3 className="text-xl font-bold text-hive-text-primary">{title}</h3>
            <p className="text-hive-text-secondary leading-relaxed">{description}</p>
        </motion.div>
    );
}

function FeaturedMissionCard({ mission }: { mission: Mission }) {
    const navigate = useNavigate();
    const dateLabel = new Date(mission.date).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
    const spotsLeft = Math.max(
        0,
        mission.capacity - (mission.volunteersJoined?.length || 0)
    );

    return (
        <Card
            padding="none"
            className="group cursor-pointer hover:translate-y-[-4px] transition-all duration-300"
            onClick={() => navigate(missionPath(mission))}
        >
            <div className="h-48 overflow-hidden relative bg-slate-100">
                <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-2 justify-between">
                    <Badge variant="primary" className="bg-white/90 backdrop-blur-sm shadow-sm">
                        {mission.category}
                    </Badge>
                    {mission.missionMode === 'emergency' && (
                        <EmergencyBadge urgency={mission.crisis?.urgencyLevel} />
                    )}
                </div>
                {mission.image && (
                    <img
                        src={mission.image}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                )}
            </div>
            <CardContent className="p-6 space-y-4">
                <div className="text-xs font-bold text-hive-primary uppercase tracking-wider">
                    {mission.ngoName}
                </div>
                <h3 className="text-xl font-bold text-hive-text-primary group-hover:text-hive-primary transition-colors line-clamp-2">
                    {mission.title}
                </h3>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-hive-text-secondary">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>{dateLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-hive-text-secondary">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{mission.location?.name || 'Location TBD'}</span>
                    </div>
                </div>
                <p className="text-xs font-bold text-hive-text-secondary">
                    {spotsLeft} slot{spotsLeft === 1 ? '' : 's'} open
                </p>
                <Button
                    variant="ghost"
                    className="w-full justify-between px-0 hover:bg-transparent group/btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(missionPath(mission));
                    }}
                >
                    <span className="text-sm font-bold">View details</span>
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
            </CardContent>
        </Card>
    );
}

function StatItem({ value, label }: { value: number; label: string }) {
    return (
        <div className="space-y-1">
            <div className="text-4xl md:text-5xl font-black tabular-nums">{value.toLocaleString()}</div>
            <div className="text-sm font-medium uppercase tracking-widest opacity-80">{label}</div>
        </div>
    );
}

function TrustItem({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex gap-4">
            <div className="mt-1 shrink-0">
                <div className="w-6 h-6 rounded-full bg-hive-primary/20 flex items-center justify-center text-hive-primary">
                    <CheckCircle2 className="h-4 w-4" />
                </div>
            </div>
            <div>
                <h4 className="font-bold text-hive-text-primary mb-1">{title}</h4>
                <p className="text-hive-text-secondary text-sm leading-relaxed">{description}</p>
            </div>
        </div>
    );
}
