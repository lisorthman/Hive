import { useState } from 'react';
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
    ShieldCheck,
    Info,
    Package
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AnimatePresence } from 'framer-motion';

// Single event data for the detail view
const EVENT_DATA = {
    id: 1,
    title: "Urban Garden Reforestation Workshop",
    ngo: "GreenCity Collective",
    ngoVerified: true,
    category: "Environment",
    description: "Join us for a hands-on workshop where we'll be planting native saplings and learning about urban permaculture. This initiative aims to restore the local biodiversity and provide a green sanctuary for the community.",
    prepNotes: [
        "Wear comfortable outdoor clothing and closed-toe shoes.",
        "Bring your own refillable water bottle.",
        "Sunscreen and hats are highly recommended.",
        "Gardening gloves will be provided, but feel free to bring your own."
    ],
    date: "October 22, 2024",
    startTime: "10:00 AM",
    endTime: "02:00 PM",
    location: "Central Park Community Plot",
    address: "123 Green Way, Sector 4, Metro City",
    coords: [51.505, -0.09],
    capacity: 25,
    joined: 18,
    organizer: {
        avatar: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=100&q=80",
        bio: "GreenCity Collective is dedicated to transforming urban spaces into thriving green habitats."
    }
};

export default function EventDetail() {
    const [hasJoined, setHasJoined] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [showAlert, setShowAlert] = useState(false);

    const handleJoin = () => {
        setIsJoining(true);
        // Simulate API call
        setTimeout(() => {
            setIsJoining(false);
            setHasJoined(true);
            setShowAlert(true);
            // Auto-hide alert
            setTimeout(() => setShowAlert(false), 5000);
        }, 1500);
    };

    const filledPercentage = (EVENT_DATA.joined / EVENT_DATA.capacity) * 100;

    return (
        <div className="min-h-screen bg-hive-background pb-24 lg:pb-12">
            {/* Top Navigation */}
            <nav className="bg-white border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button className="p-2 -ml-2 text-hive-text-secondary hover:text-hive-text-primary transition-colors flex items-center gap-1 group">
                        <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-bold">Back to Discovery</span>
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
                                        You've successfully joined the mission! We've sent the details to your email.
                                    </Alert>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Header Section */}
                        <section className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="primary" className="px-3 py-1 font-bold">{EVENT_DATA.category}</Badge>
                                <Badge variant="secondary" className="px-3 py-1 font-bold bg-teal-50 text-teal-700 border-teal-100">Weekend Special</Badge>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black text-hive-text-primary leading-tight">
                                {EVENT_DATA.title}
                            </h1>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-hive-primary/10 flex items-center justify-center text-hive-primary">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <span className="text-lg font-bold text-hive-text-secondary">
                                    {EVENT_DATA.ngo}
                                </span>
                                {EVENT_DATA.ngoVerified && (
                                    <ShieldCheck className="h-5 w-5 text-hive-secondary" />
                                )}
                            </div>
                        </section>

                        {/* Key Information Grid */}
                        <section className="grid sm:grid-cols-3 gap-4">
                            <InfoCard
                                icon={<Calendar className="h-5 w-5 text-hive-primary" />}
                                label="Date"
                                value={EVENT_DATA.date}
                            />
                            <InfoCard
                                icon={<Clock className="h-5 w-5 text-hive-primary" />}
                                label="Time"
                                value={`${EVENT_DATA.startTime} - ${EVENT_DATA.endTime}`}
                            />
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 text-hive-text-secondary">
                                    <Users className="h-5 w-5 text-hive-primary" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Capacity</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-lg font-black">{EVENT_DATA.joined} / {EVENT_DATA.capacity}</span>
                                        <span className="text-[10px] font-bold text-hive-text-secondary uppercase">Slots left: {EVENT_DATA.capacity - EVENT_DATA.joined}</span>
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
                            <div className="space-y-3">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Info className="h-5 w-5 text-hive-primary" /> About this Event
                                </h2>
                                <p className="text-hive-text-secondary leading-relaxed">
                                    {EVENT_DATA.description}
                                </p>
                            </div>

                            <Card className="bg-slate-50 border-none">
                                <CardContent className="p-6 space-y-4">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <Package className="h-5 w-5 text-hive-primary" /> Preparation Notes
                                    </h3>
                                    <ul className="space-y-3">
                                        {EVENT_DATA.prepNotes.map((note, i) => (
                                            <li key={i} className="flex gap-3 text-sm text-hive-text-secondary">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-hive-primary shrink-0" />
                                                {note}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        </section>

                        {/* Location & Map Section */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-hive-primary" /> Location
                            </h2>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-hive-text-primary leading-tight">
                                    {EVENT_DATA.location}
                                </p>
                                <p className="text-sm text-hive-text-secondary">
                                    {EVENT_DATA.address}
                                </p>
                            </div>
                            <div className="h-64 rounded-2xl overflow-hidden border border-slate-100 shadow-sm z-10">
                                <MapContainer center={EVENT_DATA.coords as [number, number]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <Marker position={EVENT_DATA.coords as [number, number]}>
                                        <Popup>
                                            <div className="p-1">
                                                <div className="font-bold">{EVENT_DATA.location}</div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                </MapContainer>
                            </div>
                        </section>
                    </div>

                    {/* Sidebar / CTA (Right) */}
                    <div className="space-y-8">
                        <div className="sticky top-24 space-y-6">
                            <Card className="shadow-xl border-slate-100 hidden lg:block overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-hive-primary" />
                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-hive-text-primary">Join the Community</h3>
                                        <p className="text-xs text-hive-text-secondary leading-relaxed">
                                            Your participation helps us reach our environmental goals for 2024.
                                        </p>
                                    </div>

                                    <Button
                                        className="w-full py-6 font-bold text-lg rounded-xl shadow-hive group"
                                        isLoading={isJoining}
                                        onClick={handleJoin}
                                        disabled={hasJoined}
                                    >
                                        {hasJoined ? (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-5 w-5" /> Already Joined
                                            </div>
                                        ) : "Join Mission"}
                                    </Button>

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
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shadow-sm">
                                            <img src={EVENT_DATA.organizer.avatar} alt="Organizer Avatar" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-hive-text-primary">{EVENT_DATA.ngo}</p>
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-hive-primary uppercase">
                                                <CheckCircle2 className="h-3 w-3" /> Partner since 2022
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-hive-text-secondary leading-relaxed">
                                        {EVENT_DATA.organizer.bio}
                                    </p>
                                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                                        <MessageCircle className="h-4 w-4" /> Message Organizer
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Sticky CTA */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 p-4 z-50 flex gap-4">
                <Button
                    className="flex-1 py-4 font-bold rounded-xl shadow-hive"
                    isLoading={isJoining}
                    onClick={handleJoin}
                    disabled={hasJoined}
                >
                    {hasJoined ? "Mission Joined" : "Join Event"}
                </Button>
                <Button variant="outline" className="p-4 rounded-xl">
                    <MessageCircle className="h-5 w-5" />
                </Button>
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
