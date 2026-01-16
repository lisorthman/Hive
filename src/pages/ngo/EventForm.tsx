import { useState } from 'react';
import {
    Calendar,
    MapPin,
    Users,
    Info,
    Package,
    ChevronLeft,
    Save,
    X,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Helper component to handle map clicks
function LocationMarker({ position, setPosition }: { position: [number, number] | null, setPosition: (pos: [number, number]) => void }) {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });

    return position === null ? null : (
        <Marker position={position} />
    );
}

export default function EventForm() {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Environment',
        date: '',
        startTime: '',
        endTime: '',
        capacity: 20,
        address: '',
        prepNotes: '',
        coords: [51.505, -0.09] as [number, number] | null
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleInputChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const setCoords = (pos: [number, number]) => {
        setFormData(prev => ({ ...prev, coords: pos }));
    };

    const handlePublish = () => {
        setIsSubmitting(true);
        // Simulate server request
        setTimeout(() => {
            setIsSubmitting(false);
            setIsModalOpen(false);
            setIsSuccess(true);
            // Auto-reset success state
            setTimeout(() => setIsSuccess(false), 5000);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-hive-background pb-24 lg:pb-12">
            {/* Page Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button className="p-2 -ml-2 text-hive-text-secondary hover:text-hive-text-primary transition-colors">
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-hive-text-primary tracking-tight">Create New Mission</h1>
                            <p className="text-xs text-hive-text-secondary font-medium uppercase tracking-wider">Step 1: Event Details</p>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-3">
                        <Button variant="outline" size="sm" className="gap-2">
                            <X className="h-4 w-4" /> Cancel
                        </Button>
                        <Button size="sm" className="gap-2" onClick={() => setIsModalOpen(true)}>
                            <Save className="h-4 w-4" /> Publish Event
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
                {/* Success Alert */}
                {isSuccess && (
                    <Card className="bg-hive-primary/10 border-hive-primary/20">
                        <CardContent className="p-4 flex items-center gap-3 text-hive-primary font-bold">
                            <CheckCircle2 className="h-5 w-5" />
                            Event published successfully! It's now visible to the community.
                        </CardContent>
                    </Card>
                )}

                {/* Basic Information Section */}
                <Section title="Basic Information" icon={<Info className="h-5 w-5" />}>
                    <div className="grid gap-6">
                        <Input
                            label="Event Name"
                            placeholder="e.g., Urban Garden Reforestation"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-hive-text-primary">Event Description</label>
                            <textarea
                                className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hive-primary/20 focus:border-hive-primary transition-all text-sm leading-relaxed"
                                placeholder="Describe what volunteers will be doing..."
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                            />
                            <p className="text-[10px] font-bold text-hive-text-secondary uppercase tracking-tight">Recommended: 150+ characters</p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-hive-text-primary">Mission Category</label>
                                <select
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hive-primary/20 focus:border-hive-primary transition-all text-sm font-medium"
                                    value={formData.category}
                                    onChange={(e) => handleInputChange('category', e.target.value)}
                                >
                                    <option>Environment</option>
                                    <option>Education</option>
                                    <option>Social Work</option>
                                    <option>Healthcare</option>
                                    <option>Disaster Relief</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Schedule & Capacity Section */}
                <Section title="Schedule & Capacity" icon={<Calendar className="h-5 w-5" />}>
                    <div className="grid sm:grid-cols-3 gap-6">
                        <Input
                            type="date"
                            label="Date"
                            value={formData.date}
                            onChange={(e) => handleInputChange('date', e.target.value)}
                        />
                        <Input
                            type="time"
                            label="Start Time"
                            value={formData.startTime}
                            onChange={(e) => handleInputChange('startTime', e.target.value)}
                        />
                        <Input
                            type="number"
                            label="Volunteers Needed"
                            value={formData.capacity}
                            onChange={(e) => handleInputChange('capacity', parseInt(e.target.value))}
                        />
                    </div>
                </Section>

                {/* Location Section */}
                <Section title="Location" icon={<MapPin className="h-5 w-5" />}>
                    <div className="space-y-6">
                        <Input
                            label="Specific Meeting Point / Address"
                            placeholder="e.g., Central Park Gate 4"
                            value={formData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                        />
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-hive-text-primary">Pin Point on Map</label>
                                <span className="text-[10px] font-bold text-hive-secondary uppercase tracking-wider">Click map to set location</span>
                            </div>
                            <div className="h-64 rounded-2xl overflow-hidden border border-slate-100 shadow-sm relative group z-10">
                                <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <LocationMarker position={formData.coords} setPosition={setCoords} />
                                </MapContainer>
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-lg text-[10px] font-bold text-hive-text-secondary border border-slate-100 uppercase z-[1001]">
                                    GPS: {formData.coords?.[0].toFixed(4)}, {formData.coords?.[1].toFixed(4)}
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Additional Information Section */}
                <Section title="Volunteer Preparation" icon={<Package className="h-5 w-5" />}>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-hive-text-primary">What to bring / Requirements</label>
                        <textarea
                            className="w-full min-h-[100px] p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hive-primary/20 focus:border-hive-primary transition-all text-sm leading-relaxed"
                            placeholder="e.g., Gardening gloves, water bottle, comfortable shoes..."
                            value={formData.prepNotes}
                            onChange={(e) => handleInputChange('prepNotes', e.target.value)}
                        />
                        <div className="flex items-center gap-2 p-3 bg-teal-50/50 rounded-lg text-xs text-teal-700 font-medium">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            Being specific helps volunteers feel more confident about joining.
                        </div>
                    </div>
                </Section>
            </main>

            {/* Mobile Sticky Actions */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 p-4 z-50 flex gap-4">
                <Button variant="outline" className="flex-1 py-4 font-bold rounded-xl">
                    Cancel
                </Button>
                <Button
                    className="flex-1 py-4 font-bold rounded-xl shadow-hive"
                    onClick={() => setIsModalOpen(true)}
                >
                    Next Step
                </Button>
            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Review & Publish Mission"
                footer={
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button isLoading={isSubmitting} onClick={handlePublish}>Publish Now</Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-hive-text-primary">{formData.name || 'Untitled Event'}</h4>
                            <Badge variant="primary">{formData.category}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-hive-text-secondary">
                            <div className="flex items-center gap-1.5 font-bold">
                                <Calendar className="h-3.5 w-3.5" /> {formData.date || 'TBD'}
                            </div>
                            <div className="flex items-center gap-1.5 font-bold">
                                <Users className="h-3.5 w-3.5" /> {formData.capacity} slots
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-hive-text-secondary leading-relaxed px-1">
                        By publishing this mission, it will become visible to all volunteers in the Metro City area. You can always edit these details later.
                    </p>
                </div>
            </Modal>
        </div>
    );
}

function Section({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <div className="text-hive-primary">{icon}</div>
                <h2 className="text-lg font-bold text-hive-text-primary tracking-tight">{title}</h2>
            </div>
            <Card className="border-slate-100 shadow-sm">
                <CardContent className="p-6">
                    {children}
                </CardContent>
            </Card>
        </div>
    );
}
