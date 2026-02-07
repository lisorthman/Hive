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
    Heart,
    Zap,
    ArrowRight
} from 'lucide-react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { authService } from '../lib/auth';

export default function LandingPage() {
    const navigate = useNavigate();
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
                            <Button size="lg" className="w-full sm:w-auto px-10 gap-2" onClick={() => navigate('/register', { state: { role: 'volunteer' } })}>
                                Join as Volunteer <ArrowRight className="h-5 w-5" />
                            </Button>
                            <Button variant="outline" size="lg" className="w-full sm:w-auto px-10" onClick={() => navigate('/register', { state: { role: 'ngo' } })}>
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
                        <p className="text-hive-text-secondary max-w-xl mx-auto">Three simple steps to start making a real difference in your community today.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        <StepCard
                            icon={<Search className="h-8 w-8 text-hive-primary" />}
                            title="Discover local events"
                            description="Browse thousands of verified volunteering opportunities in your area that match your skills and interests."
                            delay={0.1}
                        />
                        <StepCard
                            icon={<Zap className="h-8 w-8 text-hive-secondary" />}
                            title="Volunteer & check in"
                            description="Apply with one click. Use our QR-based check-in system to securely log your volunteering hours."
                            delay={0.2}
                        />
                        <StepCard
                            icon={<Award className="h-8 w-8 text-hive-primary" />}
                            title="Earn recognition"
                            description="Get certified impact reports and gamified achievements to showcase your community contributions."
                            delay={0.3}
                        />
                    </div>
                </div>
            </section>

            {/* Featured Community Events */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-end justify-between mb-12">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold">Featured Community Events</h2>
                            <p className="text-hive-text-secondary">Join these upcoming missions and make an impact.</p>
                        </div>
                        <Button variant="ghost" className="gap-1 hidden sm:flex" onClick={() => navigate('/discovery')}>
                            View all events <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <EventCard
                            image="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80"
                            ngo="GreenEarth Foundation"
                            title="Beach Cleanup & Waste Sorting"
                            date="Sat, Oct 12 • 09:00 AM"
                            location="Silver Bay Coastline"
                            category="Environmental"
                        />
                        <EventCard
                            image="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80"
                            ngo="Food For All"
                            title="Community Kitchen Assistance"
                            date="Sun, Oct 13 • 11:30 AM"
                            location="Downtown Community Center"
                            category="Social Work"
                        />
                        <EventCard
                            image="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80"
                            ngo="BrightFuture Org"
                            title="Youth Mentoring Workshop"
                            date="Wed, Oct 16 • 04:00 PM"
                            location="Public Library Hall B"
                            category="Education"
                        />
                    </div>
                </div>
            </section>

            {/* Community Impact Section */}
            <section className="py-24 bg-hive-primary text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h2 className="text-4xl font-bold mb-16">Our Cumulative Impact</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <StatItem value="12,450+" label="Volunteers" />
                        <StatItem value="85,200" label="Hours Served" />
                        <StatItem value="450+" label="NGO Partners" />
                        <StatItem value="1,200+" label="Events Completed" />
                    </div>
                </div>
            </section>

            {/* Trust & Credibility Section */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <h2 className="text-4xl font-extrabold text-hive-text-primary leading-tight">
                                Built on Trust, Transparency, and Community.
                            </h2>
                            <div className="space-y-6">
                                <TrustItem
                                    title="Verified Partners"
                                    description="Every NGO on Hive undergoes a rigorous verification process to ensure your time goes to legitimate causes."
                                />
                                <TrustItem
                                    title="Audited Impact"
                                    description="Our hours tracking system is verified by event organizers, providing you with legitimate volunteering certificates."
                                />
                                <TrustItem
                                    title="Data Privacy"
                                    description="We prioritize the security of your personal data and your community's privacy above all else."
                                />
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute -inset-4 bg-hive-primary/5 rounded-2xl -z-10 rotate-3" />
                            <div className="absolute -inset-4 bg-hive-secondary/5 rounded-2xl -z-10 -rotate-3" />
                            <Card className="p-8 space-y-6 relative border-slate-200">
                                <div className="flex gap-1 text-amber-400">
                                    {[...Array(5)].map((_, i) => <Heart key={i} className="h-5 w-5 fill-current" />)}
                                </div>
                                <p className="text-lg text-hive-text-primary italic leading-relaxed">
                                    "Hive has completely transformed how our NGO manages volunteers. The check-in system and real-time impact reports allow us to focus more on our mission and less on paperwork."
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
                                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="Avatar" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-hive-text-primary">Sarah Jenkins</div>
                                        <div className="text-sm text-hive-text-secondary">Director, Outreach Partners</div>
                                    </div>
                                </div>
                            </Card>
                        </div>
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
                                <li><a href="#" className="hover:text-hive-primary">About Us</a></li>
                                <li><a href="#" className="hover:text-hive-primary">Success Stories</a></li>
                                <li><a href="#" className="hover:text-hive-primary">Trust & Safety</a></li>
                                <li><a href="#" className="hover:text-hive-primary">NGO Directory</a></li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold">Legal</h4>
                            <ul className="space-y-2 text-hive-text-secondary">
                                <li><a href="#" className="hover:text-hive-primary">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-hive-primary">Terms of Service</a></li>
                                <li><a href="#" className="hover:text-hive-primary">Cookie Policy</a></li>
                                <li><a href="#" className="hover:text-hive-primary">Contact</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-hive-text-secondary">© 2024 Hive Platform Inc. All rights reserved.</p>
                        <div className="flex gap-6">
                            <Globe className="h-5 w-5 text-hive-text-secondary cursor-pointer hover:text-hive-primary" />
                            <Users className="h-5 w-5 text-hive-text-secondary cursor-pointer hover:text-hive-primary" />
                            <TrendingUp className="h-5 w-5 text-hive-text-secondary cursor-pointer hover:text-hive-primary" />
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}


function StepCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
            className="space-y-4"
        >
            <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-hive-text-primary">{title}</h3>
            <p className="text-hive-text-secondary leading-relaxed">{description}</p>
        </motion.div>
    );
}

function EventCard({ image, ngo, title, date, location, category }: { image: string, ngo: string, title: string, date: string, location: string, category: string }) {
    const navigate = useNavigate();

    const handleViewDetail = () => {
        const user = authService.getCurrentUser();
        if (!user) {
            alert("Please create a volunteer account to see the full mission details and join the cause!");
            navigate('/register', { state: { role: 'volunteer' } });
            return;
        }
        navigate('/discovery'); // Landing page cards usually go to discovery or a specific ID if available
    };

    return (
        <Card padding="none" className="group cursor-pointer hover:translate-y-[-4px] transition-all duration-300" onClick={handleViewDetail}>
            <div className="h-48 overflow-hidden relative">
                <div className="absolute top-4 right-4 z-10">
                    <Badge variant="primary" className="bg-white/90 backdrop-blur-sm shadow-sm">{category}</Badge>
                </div>
                <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <CardContent className="p-6 space-y-4">
                <div className="text-xs font-bold text-hive-primary uppercase tracking-wider">{ngo}</div>
                <h3 className="text-xl font-bold text-hive-text-primary group-hover:text-hive-primary transition-colors">{title}</h3>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-hive-text-secondary">
                        <Calendar className="h-4 w-4" /> <span>{date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-hive-text-secondary">
                        <MapPin className="h-4 w-4" /> <span>{location}</span>
                    </div>
                </div>
                <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent group" onClick={(e) => { e.stopPropagation(); handleViewDetail(); }}>
                    <span className="text-sm font-bold">Details</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </CardContent>
        </Card>
    );
}

function Counter({ value, duration = 2 }: { value: string, duration?: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    // Parse number from string (e.g., "12,450+" -> 12450)
    const numericValue = parseInt(value.replace(/[,+]/g, ''));
    const suffix = value.match(/[+]/g) ? '+' : '';
    const hasComma = value.includes(',');

    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, {
        duration: duration * 1000,
        bounce: 0,
    });

    useEffect(() => {
        if (isInView) {
            motionValue.set(numericValue);
        }
    }, [isInView, motionValue, numericValue]);

    useEffect(() => {
        springValue.on("change", (latest) => {
            if (ref.current) {
                const rounded = Math.floor(latest);
                let formatted = rounded.toString();
                if (hasComma) {
                    formatted = rounded.toLocaleString();
                }
                ref.current.textContent = formatted + suffix;
            }
        });
    }, [springValue, suffix, hasComma]);

    return <span ref={ref}>0{suffix}</span>;
}

function StatItem({ value, label }: { value: string, label: string }) {
    return (
        <div className="space-y-1">
            <div className="text-4xl md:text-5xl font-black">
                <Counter value={value} />
            </div>
            <div className="text-sm font-medium uppercase tracking-widest opacity-80">{label}</div>
        </div>
    );
}

function TrustItem({ title, description }: { title: string, description: string }) {
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
