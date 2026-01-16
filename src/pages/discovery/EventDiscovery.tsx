import { useState } from 'react';
import {
    Search,
    MapPin,
    Calendar,
    Filter,
    LayoutGrid,
    Map as MapIcon,
    X,
    Navigation
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../../lib/utils';

// Dummy static events for prototype
const EVENTS = [
    {
        id: 1,
        title: "Urban Garden Workshop",
        ngo: "GreenCity",
        category: "Environment",
        date: "Oct 22, 2024",
        time: "10:00 AM",
        location: "Central Park Community Plot",
        slots: 15,
        coords: [51.505, -0.09]
    },
    {
        id: 2,
        title: "Senior Tech Literacy",
        ngo: "SilverBridge",
        category: "Education",
        date: "Oct 24, 2024",
        time: "02:00 PM",
        location: "Main Street Library",
        slots: 5,
        coords: [51.51, -0.1]
    },
    {
        id: 3,
        title: "Community Soup Kitchen",
        ngo: "FoodShare",
        category: "Social Work",
        date: "Oct 25, 2024",
        time: "06:00 PM",
        location: "St. Jude Hall",
        slots: 10,
        coords: [51.49, -0.08]
    }
];

const CATEGORIES = ["All", "Environment", "Education", "Social Work", "Healthcare", "Disaster Relief"];

export default function EventDiscovery() {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const filteredEvents = EVENTS.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
            event.ngo.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === "All" || event.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-hive-background flex flex-col">
            {/* Top Filter Bar */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-hive-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search by event, NGO, or cause..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hive-primary/20 focus:border-hive-primary transition-all text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
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
                            <Filter className="h-4 w-4" /> Filters
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

                        {filteredEvents.length === 0 ? (
                            <EmptyState onReset={() => { setSearch(""); setSelectedCategory("All"); }} />
                        ) : (
                            <div className="space-y-4 pb-20">
                                {filteredEvents.map(event => (
                                    <DiscoveryEventCard key={event.id} event={event} />
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
                        {filteredEvents.map(event => (
                            <Marker key={event.id} position={event.coords as [number, number]}>
                                <Popup>
                                    <div className="p-1">
                                        <div className="font-bold text-hive-text-primary">{event.title}</div>
                                        <div className="text-xs text-hive-primary font-bold">{event.ngo}</div>
                                        <div className="mt-2 text-[10px] text-hive-text-secondary">{event.location}</div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
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

function DiscoveryEventCard({ event }: { event: typeof EVENTS[0] }) {
    return (
        <Card className="hover:border-hive-primary/30 transition-all cursor-pointer group">
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant="primary" className="mb-2 text-[10px] py-0 px-2">{event.category}</Badge>
                        <h3 className="font-bold text-hive-text-primary group-hover:text-hive-primary transition-colors">{event.title}</h3>
                        <p className="text-xs font-bold text-hive-secondary">{event.ngo}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-hive-text-secondary uppercase">Slots left</div>
                        <div className="text-lg font-black text-hive-text-primary">{event.slots}</div>
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-50 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-hive-text-secondary">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{event.date} • {event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-hive-text-secondary">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{event.location}</span>
                    </div>
                </div>

                <div className="pt-1 flex gap-2">
                    <Button size="sm" className="flex-1 text-xs">View Details</Button>
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
