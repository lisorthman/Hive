import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    Plus,
    Calendar,
    Users,
    TrendingUp,
    LogOut,
    Bell,
    Edit,
    Trash2,
    Eye,
    Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Logo } from '../../components/ui/Logo';
import { authService } from '../../lib/auth';
import { eventService } from '../../lib/events';
import { cn } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';

export default function NGODashboard() {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const fetchEvents = async () => {
        try {
            setIsLoading(true);
            const data = await eventService.getMyEvents();
            setEvents(data);
        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const handleDeleteClick = (id: string) => {
        setSelectedEventId(id);
        setIsDeleteModalOpen(true);
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

    return (
        <div className="min-h-screen bg-slate-50 pb-12 text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <Logo size="md" />

                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors relative">
                            <Bell className="h-5 w-5" />
                        </button>
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Organization Dashboard</h1>
                        <p className="text-slate-500 mt-1">Manage your events and track impact.</p>
                    </div>
                    <Button
                        size="lg"
                        className="gap-2 shadow-lg shadow-hive-primary/20"
                        onClick={() => navigate('/ngo-create')}
                    >
                        <Plus className="h-5 w-5" />
                        Create New Event
                    </Button>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                    <DashboardStat
                        icon={<Calendar className="h-6 w-6" />}
                        label="Active Events"
                        value={events.length.toString()}
                        color="blue"
                    />
                    <DashboardStat
                        icon={<Users className="h-6 w-6" />}
                        label="Total Volunteers"
                        value={events.reduce((acc, curr) => acc + (curr.volunteersJoined?.length || 0), 0).toString()}
                        color="green"
                    />
                    <DashboardStat
                        icon={<TrendingUp className="h-6 w-6" />}
                        label="Total Slots"
                        value={events.reduce((acc, curr) => acc + (curr.capacity || 0), 0).toString()}
                        color="purple"
                    />
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">Your Hosted Events</h2>
                    </div>

                    {isLoading ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center">
                            <Loader2 className="h-8 w-8 text-hive-primary animate-spin mb-4" />
                            <p className="text-slate-500">Loading your events...</p>
                        </div>
                    ) : events.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <div className="inline-flex w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-4">
                                <Calendar className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">No events created yet</h3>
                            <p className="text-slate-500 max-w-md mx-auto mb-6">
                                You haven't hosted any volunteering opportunities yet. Create your first mission to start making an impact.
                            </p>
                            <Button variant="outline" onClick={() => navigate('/ngo-create')}>
                                Get Started
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Mission Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Volunteers</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Category</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {events.map((event) => (
                                        <tr key={event._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{event.title}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-600">
                                                    {new Date(event.date).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {event.volunteersJoined?.length || 0}
                                                    </span>
                                                    <span className="text-xs text-slate-400">/ {event.capacity}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex px-2 py-1 rounded bg-hive-primary/10 text-hive-primary text-[10px] font-bold uppercase tracking-wider">
                                                    {event.category}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/event/${event._id}`)}
                                                        className="p-2 text-slate-400 hover:text-hive-primary hover:bg-hive-primary/5 rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/ngo-edit/${event._id}`)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Edit Event"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(event._id)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                        title="Delete Event"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Delete Confirmation Modal */}
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
