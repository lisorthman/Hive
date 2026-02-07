import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    MapPin,
    Calendar,
    Filter,
    LayoutGrid,
    Map as MapIcon,
    X,
    Navigation,
    Loader2,
    ChevronLeft
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../../lib/utils';
import { eventService } from '../../lib/events';
import { authService } from '../../lib/auth';

const CATEGORIES = ["All", "Environmental", "Social Work", "Education", "Healthcare", "Disaster Relief"];

export default function EventDiscovery() {
    const navigate = useNavigate();
    const [events, setEvents] = useState<any[]>([]);
    const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const user = authService.getCurrentUser();

                if (user) {
                    const [allEvents, joined] = await Promise.all([
                        eventService.getEvents(),
                        eventService.getJoinedEvents()
                    ]);
                    setEvents(allEvents);
                    setJoinedIds(new Set(joined.map((e: any) => e._id as string)));
                } else {
                    const allEvents = await eventService.getEvents();
                    setEvents(allEvents);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            const matchesSearch =
                event.title.toLowerCase().includes(search.toLowerCase()) ||
                event.ngoName.toLowerCase().includes(search.toLowerCase()) ||
                event.description.toLowerCase().includes(search.toLowerCase());

            const matchesCategory = selectedCategory === "All" || event.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [events, search, selectedCategory]);

    return (
        <div className="min-h-screen bg-hive-background flex flex-col">
            {/* Top Filter Bar */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-6 w-full md:w-auto">
                        {authService.getCurrentUser()?.role === 'volunteer' && (
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2 -ml-2 text-hive-text-secondary hover:text-hive-text-primary transition-colors flex items-center gap-1 group shrink-0"
                            >
                                <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                                <span className="text-sm font-bold">Dashboard</span>
                            </button>
                        )}

                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-hive-text-secondary" />
                            <input
                                type="text"
                                placeholder="Search missions..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hive-primary/20 focus:border-hive-primary transition-all text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto overflow-auto pb-1 md:pb-0">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                                    selectedCategory === cat
                                        ? "bg-hive-primary text-white shadow-sm"
                                        : "bg-slate-50 text-hive-text-secondary hover:bg-slate-100"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                            <Filter className="h-4 w-4" /> <span className="hidden xs:inline">Filters</span>
                        </Button>
                        <div className="hidden lg:flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setViewMode('split')}
                                className={cn("p-1.5 rounded-md transition-all", viewMode === 'split' ? "bg-white shadow-sm text-hive-primary" : "text-hive-text-secondary")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={cn("p-1.5 rounded-md transition-all", viewMode === 'map' ? "bg-white shadow-sm text-hive-primary" : "text-hive-text-secondary")}
                            >
                                <MapIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                {/* Event List (Left) */}
                <div className={cn(
                    "w-full lg:w-[450px] xl:w-[500px] overflow-auto h-full bg-white border-r border-slate-100",
                    viewMode === 'map' ? 'hidden lg:block' : 'block'
                )}>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-hive-text-primary">
                                {filteredEvents.length} Events Found
                            </h2>
                            <div className="lg:hidden flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}>
                                    {viewMode === 'map' ? <LayoutGrid className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                                <Loader2 className="h-8 w-8 text-hive-primary animate-spin mb-4" />
                                <p className="text-sm text-hive-text-secondary">Finding missions...</p>
                            </div>
                        ) : error ? (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm">
                                {error}
                            </div>
                        ) : filteredEvents.length === 0 ? (
                            <EmptyState onReset={() => { setSearch(""); setSelectedCategory("All"); }} />
                        ) : (
                            <div className="space-y-4 pb-20">
                                {filteredEvents.map(event => (
                                    <DiscoveryEventCard
                                        key={event._id}
                                        event={event}
                                        isJoined={joinedIds.has(event._id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Map View (Right) */}
                <div className={cn(
                    "flex-1 relative bg-slate-100 h-[400px] lg:h-auto",
                    viewMode === 'list' ? 'hidden lg:block' : 'block'
                )}>
                    <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {filteredEvents.map(event => {
                            const coords = event.location?.coordinates;
                            if (!coords || coords.length < 2) return null;
                            const isJoined = joinedIds.has(event._id);
                            // GeoJSON is [lng, lat], Leaflet is [lat, lng]
                            const position: [number, number] = [coords[1], coords[0]];

                            return (
                                <Marker key={event._id} position={position}>
                                    <Popup>
                                        <div className="p-1 min-w-[200px]">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="font-bold text-hive-text-primary">{event.title}</div>
                                                {isJoined && (
                                                    <Badge variant="primary" className="bg-hive-primary text-white border-none text-[8px] py-0 px-1 ml-2">Joined</Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-hive-primary font-bold mb-2">{event.ngoName}</div>
                                            <div className="flex items-center gap-1 text-[10px] text-hive-text-secondary">
                                                <MapPin className="h-3.5 w-3.5" />
                                                <span>{event.location?.name}</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="w-full mt-2 h-7 text-[10px]"
                                                onClick={() => {
                                                    const user = authService.getCurrentUser();
                                                    if (!user) {
                                                        alert("Please create a volunteer account to see the full mission details and join the cause!");
                                                        navigate('/register', { state: { role: 'volunteer' } });
                                                        return;
                                                    }
                                                    navigate(`/event/${event._id}`);
                                                }}
                                            >
                                                {isJoined ? "View Mission" : "View Detail"}
                                            </Button>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>

                    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                        <Button size="sm" className="bg-white text-hive-text-primary hover:bg-slate-50 shadow-md border-none px-3">
                            <Navigation className="h-4 w-4 mr-2 text-hive-primary" /> Recenter
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Sticky CTA */}
            <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
                <Button className="w-full shadow-2xl py-6 rounded-2xl gap-2 font-bold text-lg">
                    Suggest Events to Me <Navigation className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

function DiscoveryEventCard({ event, isJoined }: { event: any, isJoined?: boolean }) {
    const navigate = useNavigate();
    const date = new Date(event.date).toLocaleDateString();

    const handleViewDetail = () => {
        const user = authService.getCurrentUser();
        if (!user) {
            alert("Please create a volunteer account to see the full mission details and join the cause!");
            navigate('/register', { state: { role: 'volunteer' } });
            return;
        }
        navigate(`/event/${event._id}`);
    };

    return (
        <Card className={cn("hover:border-hive-primary/30 transition-all cursor-pointer group", isJoined && "border-hive-primary/20 bg-hive-primary/[0.02]")} onClick={handleViewDetail}>
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex gap-2 mb-2">
                            <Badge variant="primary" className="text-[10px] py-0 px-2">{event.category}</Badge>
                            {isJoined && (
                                <Badge variant="primary" className="bg-hive-primary text-white border-none text-[10px] py-0 px-2">Joined</Badge>
                            )}
                        </div>
                        <h3 className="font-bold text-hive-text-primary group-hover:text-hive-primary transition-colors line-clamp-1">{event.title}</h3>
                        <p className="text-xs font-bold text-hive-secondary">{event.ngoName}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-[10px] font-bold text-hive-text-secondary uppercase">Slots left</div>
                        <div className="text-lg font-black text-hive-text-primary">{event.capacity - (event.volunteersJoined?.length || 0)}</div>
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-50 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-hive-text-secondary">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className={cn(isJoined && "text-hive-primary font-bold")}>
                            {isJoined ? "Mission Secured" : date}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-hive-text-secondary">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{event.location?.name}</span>
                    </div>
                </div>

                <div className="pt-1 flex gap-2">
                    <Button
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={(e) => { e.stopPropagation(); handleViewDetail(); }}
                    >
                        {isJoined ? "View Mission" : "View Details"}
                    </Button>
                    <Button variant="outline" size="sm" className="p-2 aspect-square">
                        <MapIcon className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ onReset }: { onReset: () => void }) {
    return (
        <div className="text-center py-20 px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <X className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-hive-text-primary mb-2">No missions found</h3>
            <p className="text-sm text-hive-text-secondary mb-6">Try adjusting your filters or search keywords to find more opportunities.</p>
            <Button variant="outline" onClick={onReset}>Clear all filters</Button>
        </div>
    );
}
