import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LocationMapPicker } from '../../components/map/LocationMapPicker';
import { crisisService, DISASTER_LABELS } from '../../lib/crisis';

const NEEDS_PRESETS = [
    'Food packing',
    'Shelter setup',
    'Medical support',
    'Rescue logistics',
    'Donations sorting',
    'Transport / drivers'
];

export default function CrisisMissionForm() {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        title: '',
        description: '',
        capacity: 50,
        address: '',
        coords: null as [number, number] | null,
        urgencyLevel: 'high',
        disasterType: 'flood',
        responseDeadline: '',
        affectedAreaName: '',
        radiusKm: 15,
        immediateNeeds: [] as string[],
        requiredSkills: '',
        deploymentMode: 'rapid' as 'rapid' | 'standard'
    });

    const toggleNeed = (need: string) => {
        setForm((f) => ({
            ...f,
            immediateNeeds: f.immediateNeeds.includes(need)
                ? f.immediateNeeds.filter((n) => n !== need)
                : [...f.immediateNeeds, need]
        }));
    };

    const submit = async () => {
        if (!form.title.trim() || !form.description.trim() || !form.address || !form.coords) {
            setError('Title, description, and location are required.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const deadline = form.responseDeadline
                ? new Date(form.responseDeadline).toISOString()
                : null;
            const eventDate = deadline || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

            await crisisService.createEmergencyMission({
                title: form.title.trim(),
                description: form.description.trim(),
                category: 'Disaster Relief',
                capacity: form.capacity,
                date: eventDate,
                location: {
                    name: form.address,
                    coordinates: [form.coords[1], form.coords[0]]
                },
                crisis: {
                    urgencyLevel: form.urgencyLevel,
                    disasterType: form.disasterType,
                    responseDeadline: deadline,
                    affectedAreaName: form.affectedAreaName || form.address,
                    radiusKm: form.radiusKm,
                    immediateNeeds: form.immediateNeeds,
                    requiredSkills: form.requiredSkills
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    deploymentMode: form.deploymentMode
                }
            });
            navigate('/ngo-dashboard');
        } catch (e: any) {
            setError(e.message || 'Failed to create emergency mission');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-16">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
                    <button type="button" onClick={() => navigate('/ngo-dashboard')}>
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h1 className="font-black flex items-center gap-2 text-rose-600">
                        <AlertTriangle className="h-5 w-5" />
                        Create Emergency Mission
                    </h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                <Card className="border-rose-200 bg-rose-50">
                    <CardContent className="p-4 text-sm text-rose-900">
                        This publishes an <strong>active crisis mission</strong> and sends in-app alerts to
                        volunteers who opted in for emergencies.
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 space-y-4">
                        <Input
                            label="Mission title"
                            placeholder="Flood Relief — Colombo"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                        />
                        <div>
                            <label className="text-sm font-bold">Description</label>
                            <textarea
                                className="w-full mt-1 border border-slate-200 rounded-xl p-3 text-sm min-h-[100px]"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold">Disaster type</label>
                                <select
                                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-sm"
                                    value={form.disasterType}
                                    onChange={(e) => setForm({ ...form, disasterType: e.target.value })}
                                >
                                    {Object.entries(DISASTER_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>
                                            {v}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-bold">Urgency</label>
                                <select
                                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 text-sm"
                                    value={form.urgencyLevel}
                                    onChange={(e) => setForm({ ...form, urgencyLevel: e.target.value })}
                                >
                                    <option value="critical">Critical</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                        </div>
                        <Input
                            label="Volunteers needed"
                            type="number"
                            value={form.capacity}
                            onChange={(e) =>
                                setForm({ ...form, capacity: parseInt(e.target.value, 10) || 1 })
                            }
                        />
                        <Input
                            label="Response deadline"
                            type="datetime-local"
                            value={form.responseDeadline}
                            onChange={(e) => setForm({ ...form, responseDeadline: e.target.value })}
                        />
                        <Input
                            label="Affected area label"
                            placeholder="Colombo — Kelani river zone"
                            value={form.affectedAreaName}
                            onChange={(e) => setForm({ ...form, affectedAreaName: e.target.value })}
                        />
                        <Input
                            label="Alert radius (km)"
                            type="number"
                            value={form.radiusKm}
                            onChange={(e) =>
                                setForm({ ...form, radiusKm: parseInt(e.target.value, 10) || 10 })
                            }
                        />
                        <div>
                            <label className="text-sm font-bold">Immediate needs</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {NEEDS_PRESETS.map((need) => (
                                    <button
                                        key={need}
                                        type="button"
                                        onClick={() => toggleNeed(need)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                            form.immediateNeeds.includes(need)
                                                ? 'bg-rose-600 text-white border-rose-600'
                                                : 'bg-white border-slate-200'
                                        }`}
                                    >
                                        {need}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Input
                            label="Required skills (comma separated, optional)"
                            placeholder="First aid, Driving"
                            value={form.requiredSkills}
                            onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })}
                        />
                        <LocationMapPicker
                            value={{ address: form.address, coords: form.coords }}
                            onChange={(loc) =>
                                setForm((f) => ({
                                    ...f,
                                    address: loc.address,
                                    coords: loc.coords
                                }))
                            }
                        />
                        {error && <p className="text-sm text-rose-600">{error}</p>}
                        <Button className="w-full gap-2" onClick={submit} isLoading={submitting}>
                            <Save className="h-4 w-4" />
                            Publish emergency mission & alert volunteers
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
