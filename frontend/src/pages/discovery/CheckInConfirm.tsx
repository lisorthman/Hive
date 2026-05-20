import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    XCircle,
    Loader2,
    ArrowLeft,
    Calendar,
    MapPin,
    Clock
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Logo } from '../../components/ui/Logo';
import { eventService } from '../../lib/events';
import { attendanceService } from '../../lib/attendance';
import { motion } from 'framer-motion';

export default function CheckInConfirm() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const code = searchParams.get('code');

    const [isLoading, setIsLoading] = useState(true);
    const [event, setEvent] = useState<any>(null);
    const [status, setStatus] = useState<'success' | 'error'>('success');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const processCheckIn = async () => {
            if (!id || !code) {
                setStatus('error');
                setErrorMessage('Invalid check-in link. Missing event ID or secure code.');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                // Fetch event details first
                const eventData = await eventService.getEvent(id);
                setEvent(eventData);

                // Try to check in
                await attendanceService.checkInVolunteer(id, code);
                setStatus('success');
            } catch (err: any) {
                setStatus('error');
                setErrorMessage(err.message || 'Check-in failed. Please ask the NGO host to verify you manually.');
            } finally {
                setIsLoading(false);
            }
        };

        processCheckIn();
    }, [id, code]);

    return (
        <div className="min-h-screen bg-hive-background flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 text-hive-text-primary">
            {/* Logo Header */}
            <div className="flex justify-center">
                <Logo size="lg" />
            </div>

            {/* Main Confirmation Card */}
            <div className="my-auto max-w-md w-full mx-auto">
                <Card className="shadow-premium border-slate-100 overflow-hidden relative">
                    <div className={`absolute top-0 left-0 w-full h-1.5 ${
                        isLoading ? 'bg-hive-primary' : status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                    
                    <CardContent className="p-8 text-center space-y-6">
                        {isLoading ? (
                            <div className="py-12 space-y-4">
                                <Loader2 className="h-12 w-12 text-hive-primary animate-spin mx-auto" />
                                <h2 className="text-xl font-bold tracking-tight">Verifying Check-In</h2>
                                <p className="text-sm text-hive-text-secondary">Please wait while we secure your attendance...</p>
                            </div>
                        ) : status === 'success' ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-6"
                            >
                                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto relative">
                                    <span className="absolute inset-0 rounded-full bg-emerald-100/50 animate-ping opacity-75" />
                                    <CheckCircle2 className="h-10 w-10 text-emerald-500 relative z-10" />
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black text-emerald-600 tracking-tight">Check-In Successful!</h2>
                                    <p className="text-sm text-hive-text-secondary leading-relaxed">
                                        Your attendance has been verified. Thank you for volunteering!
                                    </p>
                                </div>

                                {event && (
                                    <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl text-left space-y-3">
                                        <div className="text-[10px] font-bold text-hive-primary uppercase tracking-widest">Confirmed Mission</div>
                                        <h3 className="font-extrabold text-base leading-snug">{event.title}</h3>
                                        <div className="space-y-1 text-xs text-hive-text-secondary font-bold">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4.5 w-4.5 text-hive-primary" />
                                                <span>{new Date(event.date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4.5 w-4.5 text-hive-primary" />
                                                <span className="truncate">{event.location.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4.5 w-4.5 text-hive-primary" />
                                                <span>4.0 verified hours logged (pending final approval)</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <Button
                                        onClick={() => navigate('/dashboard')}
                                        className="w-full font-bold"
                                    >
                                        Go to Volunteer Dashboard
                                    </Button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-6"
                            >
                                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                                    <XCircle className="h-10 w-10 text-rose-500" />
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black text-rose-600 tracking-tight">Check-In Failed</h2>
                                    <p className="text-sm text-hive-text-secondary leading-relaxed">
                                        {errorMessage}
                                    </p>
                                </div>

                                {event && (
                                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-left space-y-1.5">
                                        <div className="text-[10px] font-bold text-hive-text-secondary uppercase tracking-wider">Mission Details</div>
                                        <h3 className="font-extrabold text-sm text-hive-text-primary">{event.title}</h3>
                                        <div className="text-xs text-hive-text-secondary">{event.ngoName}</div>
                                    </div>
                                )}

                                <div className="pt-2 flex flex-col gap-2">
                                    <Button
                                        onClick={() => navigate('/dashboard')}
                                        variant="outline"
                                        className="w-full font-bold"
                                    >
                                        Go to Dashboard
                                    </Button>
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="text-xs font-bold text-hive-text-secondary hover:text-hive-text-primary flex items-center justify-center gap-1 mt-2"
                                    >
                                        <ArrowLeft className="h-3 w-3" /> Go Back
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Empty footer spacing */}
            <div className="text-center text-xs text-hive-text-secondary font-bold mt-8">
                &copy; {new Date().getFullYear()} Hive Platform. Hyperlocal Volunteering.
            </div>
        </div>
    );
}
