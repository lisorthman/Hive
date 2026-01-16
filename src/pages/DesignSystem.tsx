import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import {
    Users,
    Calendar,
    MapPin,
    AlertTriangle,
    ShieldCheck,
    Search,
    Plus
} from 'lucide-react';

export default function DesignSystem() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-hive-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-16">
                {/* Header */}
                <header className="space-y-4">
                    <Badge variant="primary">Design System v1.0</Badge>
                    <h1 className="text-5xl font-extrabold text-hive-text-primary tracking-tight">Hive Visual Identity</h1>
                    <p className="text-xl text-hive-text-secondary max-w-2xl leading-relaxed">
                        A trustworthy, calm, and community-focused UI environment designed for NGOs, volunteers, and administrators.
                    </p>
                </header>

                {/* Colors */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <div className="w-1 h-8 bg-hive-primary rounded-full" />
                        Color Palette
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <ColorCard name="Community Green" hex="#2F855A" variable="bg-hive-primary" />
                        <ColorCard name="Teal Accent" hex="#319795" variable="bg-hive-secondary" />
                        <ColorCard name="Charcoal Text" hex="#2D3748" variable="bg-hive-text-primary" />
                        <ColorCard name="Muted Gray" hex="#718096" variable="bg-hive-text-secondary" />
                        <ColorCard name="Off-White BG" hex="#F7FAFC" variable="bg-hive-background" border />
                    </div>
                </section>

                {/* Typography */}
                <section className="space-y-8">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <div className="w-1 h-8 bg-hive-primary rounded-full" />
                        Typography (Inter Sans)
                    </h2>
                    <div className="space-y-6 bg-white p-8 rounded-lg shadow-sm border border-slate-100">
                        <div className="space-y-1">
                            <p className="text-xs font-mono text-slate-400 uppercase">Heading 1</p>
                            <h1 className="text-4xl font-extrabold">The quick brown fox jumps over the lazy dog</h1>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-mono text-slate-400 uppercase">Heading 2</p>
                            <h2 className="text-2xl font-bold">The quick brown fox jumps over the lazy dog</h2>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-mono text-slate-400 uppercase">Body Regular</p>
                            <p className="text-base text-hive-text-secondary leading-relaxed">
                                Volunteering at Hive connects people with purposeful opportunities. We believe in the power of collective action to build stronger, more resilient communities. Our platform simplifies the process of finding and managing volunteer events.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Buttons */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <div className="w-1 h-8 bg-hive-primary rounded-full" />
                        Interactive Components
                    </h2>

                    <Card>
                        <CardHeader>
                            <CardTitle>Buttons & States</CardTitle>
                            <CardDescription>Actions with various weight and visual cues.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="flex flex-wrap gap-4">
                                <Button variant="primary">Primary Action</Button>
                                <Button variant="secondary">Secondary Action</Button>
                                <Button variant="outline">Outline Button</Button>
                                <Button variant="ghost">Ghost Button</Button>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <Button size="sm">Small</Button>
                                <Button size="md">Medium</Button>
                                <Button size="lg">Large Scale</Button>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <Button isLoading>Processing</Button>
                                <Button disabled>Disabled Action</Button>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Specialized Cards */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <div className="w-1 h-8 bg-hive-primary rounded-full" />
                        Cards & Information
                    </h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Event Card Example */}
                        <Card padding="none" className="group cursor-pointer">
                            <div className="h-48 bg-slate-200 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                                    <Badge variant="primary" className="mb-2">Environmental</Badge>
                                </div>
                                <img
                                    src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80"
                                    alt="Nature"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                            <CardContent className="p-6">
                                <CardTitle className="mb-2">Local Park Reforestation</CardTitle>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-hive-text-secondary text-sm">
                                        <Calendar className="h-4 w-4" />
                                        <span>Sat, Oct 12 • 09:00 AM</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-hive-text-secondary text-sm">
                                        <MapPin className="h-4 w-4" />
                                        <span>Central Park, South Entrance</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-hive-text-secondary text-sm">
                                        <Users className="h-4 w-4" />
                                        <span>12/20 Volunteers joined</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="mx-6 mb-6 mt-0 flex justify-between items-center">
                                <span className="text-hive-primary font-bold">Free to Join</span>
                                <Button size="sm">View Details</Button>
                            </CardFooter>
                        </Card>

                        {/* Stat Card Example */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="p-3 bg-hive-primary/10 rounded-full mb-4">
                                    <ShieldCheck className="h-8 w-8 text-hive-primary" />
                                </div>
                                <div className="text-3xl font-extrabold">1,280</div>
                                <div className="text-sm text-hive-text-secondary font-medium uppercase tracking-wider">Hours Tracked</div>
                            </Card>
                            <Card className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="p-3 bg-hive-secondary/10 rounded-full mb-4">
                                    <Users className="h-8 w-8 text-hive-secondary" />
                                </div>
                                <div className="text-3xl font-extrabold">45</div>
                                <div className="text-sm text-hive-text-secondary font-medium uppercase tracking-wider">Active NGO's</div>
                            </Card>
                            <Card className="col-span-2 space-y-4">
                                <div className="flex justify-between items-center">
                                    <Badge variant="secondary">Upcoming Tasks</Badge>
                                    <span className="text-xs text-slate-400">View All</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="w-2 h-2 bg-hive-secondary rounded-full" />
                                        <span className="text-sm font-medium">Verify 5 new applicants</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="w-2 h-2 bg-hive-primary rounded-full" />
                                        <span className="text-sm font-medium">Monthly impact report due</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Feedback & Inputs */}
                <section className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <div className="w-1 h-8 bg-hive-primary rounded-full" />
                            Notifications & Forms
                        </h2>
                        <Card>
                            <CardContent className="p-6 space-y-4">
                                <Alert variant="success" title="Success!">Your volunteer application has been submitted successfully.</Alert>
                                <Alert variant="info" title="Update">There are 3 new events matching your interests in your area.</Alert>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Full Name" placeholder="John Doe" />
                                    <Input label="Email Address" type="email" placeholder="john@example.com" />
                                </div>
                                <Input label="Short Bio" placeholder="Tell us about yourself..." />
                                <div className="pt-4 flex justify-end">
                                    <Button variant="primary">Save Profile</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <div className="w-1 h-8 bg-hive-primary rounded-full" />
                            Overlays
                        </h2>
                        <Card className="h-[300px] flex items-center justify-center flex-col text-center space-y-4 bg-slate-50 border-dashed border-2">
                            <div className="text-hive-text-secondary">
                                <p className="font-medium">Test Component Modals</p>
                                <p className="text-sm">Click below to trigger a dialog</p>
                            </div>
                            <Button variant="outline" onClick={() => setIsModalOpen(true)}>Open Confirmation</Button>
                        </Card>
                    </div>
                </section>

                {/* Tables */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <div className="w-1 h-8 bg-hive-primary rounded-full" />
                        Data Display
                    </h2>
                    <Card padding="none">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search volunteers..."
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hive-primary/20"
                                />
                            </div>
                            <Button size="sm" className="flex items-center gap-1">
                                <Plus className="h-4 w-4" /> Add Volunteer
                            </Button>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Volunteer Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">Sarah Jenkins</TableCell>
                                    <TableCell>Field Coordinator</TableCell>
                                    <TableCell>Oct 12, 2023</TableCell>
                                    <TableCell><Badge variant="success">Active</Badge></TableCell>
                                    <TableCell className="text-right"><Button variant="ghost" size="sm">Manage</Button></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Marcus Chen</TableCell>
                                    <TableCell>Logistics Support</TableCell>
                                    <TableCell>Nov 05, 2023</TableCell>
                                    <TableCell><Badge variant="primary">On Mission</Badge></TableCell>
                                    <TableCell className="text-right"><Button variant="ghost" size="sm">Manage</Button></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Elena Rodriguez</TableCell>
                                    <TableCell>Translator</TableCell>
                                    <TableCell>Jan 20, 2024</TableCell>
                                    <TableCell><Badge variant="gray">Offline</Badge></TableCell>
                                    <TableCell className="text-right"><Button variant="ghost" size="sm">Manage</Button></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Card>
                </section>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Confirm Deletion"
                footer={(
                    <>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={() => setIsModalOpen(false)}>Confirm</Button>
                    </>
                )}
            >
                <div className="text-center py-4 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold">Are you absolutely sure?</h4>
                        <p className="text-hive-text-secondary mt-1">
                            This action cannot be undone. This will permanently delete the selected project and all associated data.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function ColorCard({ name, hex, variable, border = false }: { name: string, hex: string, variable: string, border?: boolean }) {
    return (
        <div className={`p-4 rounded-lg bg-white border ${border ? 'border-slate-200' : 'border-slate-100'} shadow-sm`}>
            <div className={`h-12 rounded-md mb-3 ${variable} shadow-inner`} />
            <div className="font-bold text-sm text-hive-text-primary">{name}</div>
            <div className="text-xs font-mono text-hive-text-secondary uppercase">{hex}</div>
        </div>
    );
}
