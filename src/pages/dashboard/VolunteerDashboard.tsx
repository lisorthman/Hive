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
    Users
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Logo } from '../../components/ui/Logo';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export default function VolunteerDashboard() {
    return (
        <div className="min-h-screen bg-hive-background pb-12 text-hive-text-primary">
            {/* Dashboard Top Nav / Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <Logo size="md" />

                    <div className="flex items-center gap-4">
                        <button className="p-2 text-hive-text-secondary hover:bg-slate-50 rounded-lg transition-colors relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-hive-secondary rounded-full border-2 border-white" />
                        </button>
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-bold">Alex Johnson</div>
                                <div className="text-[10px] font-bold text-hive-primary uppercase tracking-wider">Gold Volunteer</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden cursor-pointer">
                                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80" alt="Avatar" />
                            </div>
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
                            <h2 className="text-3xl font-extrabold tracking-tight">Welcome back, Alex!</h2>
                            <p className="text-hive-text-secondary mt-1">You've reached <span className="text-hive-primary font-bold">85%</span> of your monthly volunteering goal. Keep going!</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" size="sm" className="gap-2">
                                <Download className="h-4 w-4" /> Impact Resume
                            </Button>
                            <Button size="sm" className="gap-2">
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
                        value="128.5"
                        trend="+12h this month"
                        color="primary"
                    />
                    <StatCard
                        icon={<Calendar className="h-5 w-5" />}
                        label="Events Completed"
                        value="24"
                        trend="Rank: Top 5%"
                        color="secondary"
                    />
                    <StatCard
                        icon={<Award className="h-5 w-5" />}
                        label="Badges Earned"
                        value="12"
                        trend="3 new this month"
                        color="primary"
                    />
                    <StatCard
                        icon={<TrendingUp className="h-5 w-5" />}
                        label="Community Score"
                        value="2,450"
                        trend="Level 14"
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
                                <button className="text-sm font-bold text-hive-primary hover:underline">See all</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <DashboardEventCard
                                    image="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80"
                                    title="Local Park Reforestation"
                                    ngo="EcoWatch"
                                    date="Oct 20, 2024"
                                    hours="4h"
                                />
                                <DashboardEventCard
                                    image="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80"
                                    title="Community Soup Kitchen"
                                    ngo="FoodShare"
                                    date="Oct 22, 2024"
                                    hours="3h"
                                />
                            </div>
                        </section>

                        {/* Upcoming Events List */}
                        <section className="space-y-6">
                            <h3 className="text-xl font-bold">Your Upcoming Events</h3>
                            <Card padding="none">
                                <div className="divide-y divide-slate-50">
                                    <UpcomingListItem
                                        title="Beach Cleanup Drive"
                                        ngo="GreenEarth"
                                        date="Oct 24, 2024 • 08:30 AM"
                                        status="Confirmed"
                                    />
                                    <UpcomingListItem
                                        title="Digital Literacy Workshop"
                                        ngo="Tech4All"
                                        date="Oct 28, 2024 • 02:00 PM"
                                        status="Pending"
                                    />
                                    <UpcomingListItem
                                        title="Senior Citizen Social"
                                        ngo="CareUnity"
                                        date="Nov 02, 2024 • 10:00 AM"
                                        status="Confirmed"
                                    />
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

function DashboardEventCard({ image, title, ngo, date, hours }: { image: string, title: string, ngo: string, date: string, hours: string }) {
    return (
        <div className="group cursor-pointer bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-soft transition-all overflow-hidden">
            <div className="h-32 overflow-hidden relative">
                <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-[10px]">{hours}</Badge>
                </div>
            </div>
            <div className="p-4 space-y-2">
                <div className="text-[10px] font-bold text-hive-primary uppercase tracking-widest">{ngo}</div>
                <h4 className="font-bold truncate">{title}</h4>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-hive-text-secondary">{date}</span>
                    <ChevronRight className="h-4 w-4 text-hive-text-secondary group-hover:text-hive-primary group-hover:translate-x-1 transition-all" />
                </div>
            </div>
        </div>
    );
}

function UpcomingListItem({ title, ngo, date, status }: { title: string, ngo: string, date: string, status: string }) {
    return (
        <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
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
                <button className="p-2 text-hive-text-secondary hover:bg-slate-200 rounded-lg transition-colors">
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
