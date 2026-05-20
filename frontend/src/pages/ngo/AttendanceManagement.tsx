import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    QrCode,
    Save,
    Clock,
    UserCheck,
    AlertCircle,
    Loader2,
    Calendar,
    Users
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { eventService } from '../../lib/events';
import { attendanceService } from '../../lib/attendance';
import { motion } from 'framer-motion';

export default function AttendanceManagement() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [event, setEvent] = useState<any>(null);
    const [attendanceList, setAttendanceList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);

    // Track local edits
    const [edits, setEdits] = useState<{ [volunteerId: string]: { status: string; hoursWorked: number } }>({});

    useEffect(() => {
        const fetchEventAndAttendance = async () => {
            if (!id) return;
            try {
                setIsLoading(true);
                const [eventData, attendanceData] = await Promise.all([
                    eventService.getEvent(id),
                    attendanceService.getEventAttendance(id)
                ]);
                setEvent(eventData);
                setAttendanceList(attendanceData);
                setQrCode(eventData.checkInCode);
            } catch (err: any) {
                setError(err.message || 'Failed to load attendance details');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEventAndAttendance();
    }, [id]);

    const handleStatusChange = (volunteerId: string, status: string) => {
        const currentEdit = edits[volunteerId] || {
            status: attendanceList.find(a => a.volunteer._id === volunteerId)?.status || 'joined',
            hoursWorked: attendanceList.find(a => a.volunteer._id === volunteerId)?.hoursWorked || 0
        };

        // If status is checked-in and hours is 0, default to 4 hours
        let hoursWorked = currentEdit.hoursWorked;
        if (status === 'checked-in' && hoursWorked === 0) {
            hoursWorked = 4;
        } else if (status !== 'checked-in') {
            hoursWorked = 0;
        }

        setEdits({
            ...edits,
            [volunteerId]: {
                ...currentEdit,
                status,
                hoursWorked
            }
        });
    };

    const handleHoursChange = (volunteerId: string, hours: number) => {
        const currentEdit = edits[volunteerId] || {
            status: attendanceList.find(a => a.volunteer._id === volunteerId)?.status || 'joined',
            hoursWorked: attendanceList.find(a => a.volunteer._id === volunteerId)?.hoursWorked || 0
        };

        setEdits({
            ...edits,
            [volunteerId]: {
                ...currentEdit,
                hoursWorked: hours
            }
        });
    };

    const handleGenerateQR = async () => {
        if (!id) return;
        try {
            setIsGeneratingCode(true);
            const code = await attendanceService.generateCheckInCode(id);
            setQrCode(code);
            setSuccessMessage('Successfully generated a new check-in QR Code!');
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err: any) {
            setError(err.message || 'Failed to generate check-in code');
        } finally {
            setIsGeneratingCode(false);
        }
    };

    const handleSaveEdits = async () => {
        if (!id) return;
        try {
            setIsSaving(true);
            setError(null);
            
            const recordsToSave = Object.keys(edits).map(volunteerId => ({
                volunteerId,
                status: edits[volunteerId].status,
                hoursWorked: edits[volunteerId].hoursWorked
            }));

            if (recordsToSave.length === 0) return;

            const updatedRecords = await attendanceService.updateAttendanceManual(id, recordsToSave);
            
            // Merge back into state
            setAttendanceList(prev =>
                prev.map(item => {
                    const match = updatedRecords.find((r: any) => r.volunteer === item.volunteer._id);
                    return match ? { ...item, status: match.status, hoursWorked: match.hoursWorked } : item;
                })
            );

            // Clear edits state
            setEdits({});
            setSuccessMessage('Attendance and hours saved successfully!');
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err: any) {
            setError(err.message || 'Failed to save attendance updates');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-hive-background">
                <Loader2 className="h-10 w-10 text-hive-primary animate-spin" />
            </div>
        );
    }

    if (error && !event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-hive-background p-4 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-hive-text-primary mb-2">Event Attendance Error</h2>
                <p className="text-hive-text-secondary mb-6">{error}</p>
                <Button onClick={() => navigate('/ngo-dashboard')}>
                    Back to NGO Dashboard
                </Button>
            </div>
        );
    }

    const checkInUrl = qrCode ? `http://127.0.0.1:5173/check-in/${id}?code=${qrCode}` : '';
    const qrCodeImageUrl = qrCode ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(checkInUrl)}` : '';

    const hasUnsavedChanges = Object.keys(edits).length > 0;

    return (
        <div className="min-h-screen bg-hive-background pb-12 text-hive-text-primary">
            {/* Top Header Navigation */}
            <nav className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/ngo-dashboard')}
                        className="p-2 -ml-2 text-hive-text-secondary hover:text-hive-text-primary transition-colors flex items-center gap-1 group"
                    >
                        <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-bold">Back to Dashboard</span>
                    </button>
                    <div className="text-right font-bold text-hive-primary uppercase text-xs tracking-wider">
                        Attendance Verification
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                {/* Event Heading Card */}
                <div className="bg-white border border-slate-100 shadow-soft rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <Badge variant="primary" className="font-bold">{event?.category}</Badge>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-hive-text-primary">{event?.title}</h1>
                        <div className="flex flex-wrap gap-4 text-xs font-bold text-hive-text-secondary">
                            <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-hive-primary" /> {new Date(event?.date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Users className="h-4 w-4 text-hive-primary" /> {event?.volunteersJoined?.length} Registered</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleSaveEdits}
                            disabled={!hasUnsavedChanges || isSaving}
                            className="gap-2"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Attendance
                        </Button>
                    </div>
                </div>

                {successMessage && (
                    <Alert variant="success" className="mb-6">
                        {successMessage}
                    </Alert>
                )}

                {error && (
                    <Alert variant="destructive" className="mb-6">
                        {error}
                    </Alert>
                )}

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main List Table (Left) */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="shadow-soft border-slate-100 overflow-hidden">
                            <CardContent className="p-0">
                                {attendanceList.length === 0 ? (
                                    <div className="p-12 text-center space-y-4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                            <Users className="h-8 w-8 text-slate-300" />
                                        </div>
                                        <p className="text-hive-text-secondary font-bold">No volunteers have joined this event yet.</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Volunteer Details</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Assigned Hours</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {attendanceList.map(record => {
                                                const volunteerId = record.volunteer._id;
                                                const currentStatus = edits[volunteerId]?.status ?? record.status;
                                                const currentHours = edits[volunteerId]?.hoursWorked ?? record.hoursWorked;

                                                return (
                                                    <TableRow key={volunteerId}>
                                                        <TableCell className="font-bold">{record.volunteer.name}</TableCell>
                                                        <TableCell className="text-xs text-hive-text-secondary">{record.volunteer.email}</TableCell>
                                                        <TableCell>
                                                            <select
                                                                value={currentStatus}
                                                                onChange={(e) => handleStatusChange(volunteerId, e.target.value)}
                                                                className={`text-xs font-bold py-1.5 px-3 rounded-lg border focus:ring-2 focus:ring-offset-2 focus:outline-none transition-all ${
                                                                    currentStatus === 'checked-in'
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500'
                                                                        : currentStatus === 'absent'
                                                                        ? 'bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-500'
                                                                        : 'bg-slate-50 text-slate-700 border-slate-200 focus:ring-slate-500'
                                                                }`}
                                                            >
                                                                <option value="joined">Joined</option>
                                                                <option value="checked-in">Checked In</option>
                                                                <option value="absent">Absent</option>
                                                            </select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="24"
                                                                    step="0.5"
                                                                    value={currentHours}
                                                                    disabled={currentStatus !== 'checked-in'}
                                                                    onChange={(e) => handleHoursChange(volunteerId, parseFloat(e.target.value) || 0)}
                                                                    className="w-16 border border-slate-200 rounded-lg p-1 text-center font-bold text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:border-hive-primary"
                                                                />
                                                                <span className="text-xs font-semibold text-hive-text-secondary">hours</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* QR Code / Details Panel (Right) */}
                    <div className="space-y-6">
                        <Card className="shadow-soft border-slate-100 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-hive-primary" />
                            <CardContent className="p-6 space-y-6 text-center">
                                <div className="space-y-2 text-left">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <QrCode className="h-5 w-5 text-hive-primary" /> QR Check-in Code
                                    </h3>
                                    <p className="text-xs text-hive-text-secondary leading-relaxed">
                                        Display this QR code at the volunteering site. Volunteers can scan it with their mobile devices to instantly check in and log their attendance.
                                    </p>
                                </div>

                                {qrCode ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="space-y-4"
                                    >
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 inline-block shadow-inner mx-auto">
                                            <img
                                                src={qrCodeImageUrl}
                                                alt="Check-in QR Code"
                                                className="w-48 h-48 block border border-slate-200/50 bg-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Code Token</div>
                                            <code className="text-xs bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 font-mono text-hive-primary block truncate max-w-xs mx-auto">
                                                {qrCode}
                                            </code>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="py-12 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                                        <QrCode className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-xs text-hive-text-secondary font-bold">No active check-in code generated</p>
                                    </div>
                                )}

                                <Button
                                    variant={qrCode ? "outline" : "default"}
                                    onClick={handleGenerateQR}
                                    isLoading={isGeneratingCode}
                                    className="w-full font-bold"
                                >
                                    <QrCode className="h-4 w-4 mr-2" />
                                    {qrCode ? "Regenerate Check-in Code" : "Generate Check-in QR Code"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
