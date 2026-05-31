import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Loader2, MapPin, Users, Clock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import '../../lib/leafletIcon';
import 'leaflet/dist/leaflet.css';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { crisisService, DISASTER_LABELS } from '../../lib/crisis';
import { EmergencyBadge } from '../../components/crisis/EmergencyBadge';
import { getDashboardLabel, getDashboardPath } from '../../lib/dashboardPaths';
import { authService } from '../../lib/auth';
import { missionPath } from '../../lib/missions';

export default function CrisisHub() {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();
    const [missions, setMissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            setLoading(true);
            setMissions(await crisisService.getMap());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const defaultCenter: [number, number] =
        missions[0]?.location?.coordinates?.length === 2
            ? [missions[0].location.coordinates[1], missions[0].location.coordinates[0]]
            : [6.9271, 79.8612];

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-10">
            <header className="border-b border-rose-900/50 bg-slate-900/90 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        type="button"
                        className="flex items-center gap-1 text-sm font-bold text-slate-300"
                        onClick={() => navigate(user ? getDashboardPath(user.role) : '/discovery')}
                    >
                        <ChevronLeft className="h-5 w-5" />
                        {user ? getDashboardLabel(user.role) : 'Discovery'}
                    </button>
                    <h1 className="text-lg font-black flex items-center gap-2 text-rose-400">
                        <AlertTriangle className="h-5 w-5" />
                        Crisis Hub
                    </h1>
                    <Button size="sm" variant="outline" className="border-slate-600 text-slate-200" onClick={load}>
                        Refresh
                    </Button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6">
                <Card className="border-rose-900/40 bg-rose-950/30">
                    <CardContent className="p-4 text-sm text-rose-100">
                        Active emergency missions requiring immediate volunteer response. Opt in under{' '}
                        <strong>Profile → Emergency availability</strong> to receive alerts.
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-rose-400" />
                    </div>
                ) : missions.length === 0 ? (
                    <Card className="border-slate-700 bg-slate-900">
                        <CardContent className="p-10 text-center text-slate-400">
                            No active crisis missions right now.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid lg:grid-cols-2 gap-6">
                        <div className="h-[420px] rounded-2xl overflow-hidden border border-slate-700">
                            <MapContainer center={defaultCenter} zoom={11} className="h-full w-full">
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                {missions.map((m) => {
                                    const coords = m.location?.coordinates;
                                    if (!coords || coords.length < 2) return null;
                                    const lat = coords[1];
                                    const lng = coords[0];
                                    const radiusM = (m.crisis?.radiusKm || 10) * 1000;
                                    return (
                                        <span key={m._id}>
                                            <Circle
                                                center={[lat, lng]}
                                                radius={radiusM}
                                                pathOptions={{
                                                    color: '#f43f5e',
                                                    fillColor: '#f43f5e',
                                                    fillOpacity: 0.15
                                                }}
                                            />
                                            <Marker position={[lat, lng]}>
                                                <Popup>
                                                    <strong>{m.title}</strong>
                                                    <br />
                                                    {DISASTER_LABELS[m.crisis?.disasterType] || 'Crisis'}
                                                </Popup>
                                            </Marker>
                                        </span>
                                    );
                                })}
                            </MapContainer>
                        </div>

                        <div className="space-y-3 max-h-[420px] overflow-y-auto">
                            {missions.map((m) => (
                                <Card
                                    key={m._id}
                                    className="border-slate-700 bg-slate-900 cursor-pointer hover:border-rose-500/50"
                                    onClick={() => navigate(missionPath(m))}
                                >
                                    <CardContent className="p-4 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <EmergencyBadge urgency={m.crisis?.urgencyLevel} />
                                                <h3 className="font-bold text-white mt-2">{m.title}</h3>
                                                <p className="text-xs text-slate-400">{m.ngoName}</p>
                                            </div>
                                            <span className="text-xs font-bold text-rose-400 uppercase">
                                                {DISASTER_LABELS[m.crisis?.disasterType]}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-300 line-clamp-2">{m.description}</p>
                                        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5" />
                                                {m.crisis?.affectedAreaName || m.location?.name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3.5 w-3.5" />
                                                {m.volunteersJoined?.length || 0}/{m.capacity}
                                            </span>
                                            {m.crisis?.responseDeadline && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    By{' '}
                                                    {new Date(m.crisis.responseDeadline).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        {m.crisis?.immediateNeeds?.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {m.crisis.immediateNeeds.map((need: string) => (
                                                    <span
                                                        key={need}
                                                        className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full"
                                                    >
                                                        {need}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
