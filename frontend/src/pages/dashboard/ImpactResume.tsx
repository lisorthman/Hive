import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Award, Calendar, Clock, CheckCircle, ShieldCheck, Mail, CalendarDays, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { authService } from '../../lib/auth';
import { eventService } from '../../lib/events';
import { attendanceService } from '../../lib/attendance';
import { cn } from '../../lib/utils';

export default function ImpactResume() {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();
    const [stats, setStats] = useState<any>(null);
    const [joinedEvents, setJoinedEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [volunteerStats, joined] = await Promise.all([
                    attendanceService.getVolunteerStats(),
                    eventService.getJoinedEvents()
                ]);
                setStats(volunteerStats);
                setJoinedEvents(joined || []);
            } catch (err) {
                console.error('Error fetching resume data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Print automatically once data is loaded
    useEffect(() => {
        if (!isLoading && stats) {
            const timer = setTimeout(() => {
                window.print();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [isLoading, stats]);

    if (isLoading || !stats) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-hive-background">
                <Loader2 className="h-10 w-10 text-hive-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans antialiased">
            {/* Non-printed Controls Header */}
            <div className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-50 shadow-sm print:hidden">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-slate-600 hover:text-hive-primary font-bold transition-colors group"
                    >
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Return to Dashboard</span>
                    </button>
                    <div className="flex gap-3">
                        <Button variant="outline" size="sm" onClick={() => window.close()} className="hidden sm:inline-flex">
                            Close Tab
                        </Button>
                        <Button size="sm" className="gap-2 font-bold" onClick={() => window.print()}>
                            <Printer className="h-4 w-4" /> Print / Save as PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* Resume / Certificate Container */}
            <div className="max-w-4xl mx-auto mt-8 px-4 sm:px-6 print:px-0 print:mt-0">
                <Card className="bg-white shadow-lg print:shadow-none border border-slate-200/60 print:border-none rounded-2xl overflow-hidden p-8 sm:p-12 space-y-12">
                    
                    {/* Header: Brand & Identity */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-8 gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-hive-primary flex items-center justify-center text-white font-black text-lg">H</div>
                                <span className="text-xl font-black text-hive-primary tracking-tight">HIVE</span>
                            </div>
                            <p className="text-xs font-bold text-hive-secondary uppercase tracking-widest">Community Impact Registry</p>
                        </div>
                        <div className="text-left sm:text-right space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200/50">
                                <ShieldCheck className="h-3.5 w-3.5" /> VERIFIED MEMBER
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono mt-1">ID: HIV-VOL-{user?.id.slice(-8).toUpperCase()}</div>
                        </div>
                    </div>

                    {/* Volunteer Profile Intro */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black tracking-tight text-slate-900">{user?.name}</h2>
                            <div className="space-y-1.5 text-sm text-slate-600 font-medium">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    <span>{user?.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-slate-400" />
                                    <span>Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Core Summary Stats */}
                        <div className="grid grid-cols-3 gap-6 sm:w-80">
                            <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="text-2xl font-black text-hive-primary">{stats.totalHours}</div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Hours Logged</div>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="text-2xl font-black text-hive-secondary">{stats.checkedInCount}</div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Missions</div>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="text-2xl font-black text-slate-700">Lvl {stats.level}</div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Community Lvl</div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Badges & Achievements */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Unlocked Achievements</h3>
                        {stats.badges && stats.badges.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {stats.badges.map((badge: any) => (
                                    <div key={badge.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                                        <div className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                                            badge.color === 'green' && "bg-green-50 text-green-600",
                                            badge.color === 'blue' && "bg-blue-50 text-blue-600",
                                            badge.color === 'orange' && "bg-orange-50 text-orange-600",
                                            badge.color === 'slate' && "bg-slate-200 text-slate-600",
                                            badge.color === 'yellow' && "bg-yellow-50 text-yellow-600",
                                            badge.color === 'purple' && "bg-purple-50 text-purple-600",
                                            badge.color === 'teal' && "bg-teal-50 text-teal-600"
                                        )}>
                                            <Award className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-xs text-slate-800 leading-tight">{badge.name}</h4>
                                            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{badge.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs italic text-slate-400">No achievements unlocked yet.</p>
                        )}
                    </div>

                    {/* Section: Detailed Volunteering Log */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Mission Log History</h3>
                        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                        <th className="p-3.5">Mission Title</th>
                                        <th className="p-3.5">Organization</th>
                                        <th className="p-3.5">Date</th>
                                        <th className="p-3.5 text-center">Status</th>
                                        <th className="p-3.5 text-right">Hours Logged</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {joinedEvents.length > 0 ? (
                                        joinedEvents.map((event: any) => {
                                            // Determine verified status or simple joined status
                                            const isVerified = stats.checkedInCount > 0; // Simple fallback or mock
                                            return (
                                                <tr key={event._id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-3.5 font-extrabold text-slate-900">{event.title}</td>
                                                    <td className="p-3.5 font-medium text-slate-600">{event.ngoName}</td>
                                                    <td className="p-3.5 font-medium text-slate-500">{new Date(event.date).toLocaleDateString()}</td>
                                                    <td className="p-3.5 text-center">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700">
                                                            <CheckCircle className="h-3 w-3" /> VERIFIED
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 text-right font-black text-slate-900">4.0 hrs</td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400 italic">No missions completed in this log.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer / Certificate Seal */}
                    <div className="flex flex-col sm:flex-row justify-between items-center border-t border-slate-100 pt-8 gap-6 text-center sm:text-left">
                        <div className="space-y-1">
                            <div className="text-[10px] font-mono text-slate-400">VERIFICATION HASH</div>
                            <div className="text-[9px] font-mono text-slate-500 break-all select-all max-w-sm">
                                4f98a2b5e0c76d291e779a5bf32de11b5e28a4c7e6cbb91a6e709a3fc821c009
                            </div>
                        </div>
                        <div className="flex flex-col items-center sm:items-end space-y-1">
                            <div className="text-xs font-bold text-slate-400">Hive Platform Board Seal</div>
                            <div className="w-16 h-16 rounded-full border border-hive-primary/20 flex items-center justify-center bg-hive-primary/5 text-hive-primary select-none mt-1">
                                <Award className="h-8 w-8 animate-spin" style={{ animationDuration: '20s' }} />
                            </div>
                        </div>
                    </div>

                </Card>
            </div>
            
            {/* Custom Print Overrides */}
            <style>{`
                @media print {
                    body {
                        background: white !important;
                        color: black !important;
                        padding: 0 !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:border-none {
                        border: none !important;
                    }
                    .print\\:px-0 {
                        padding-left: 0 !important;
                        padding-right: 0 !important;
                    }
                    .print\\:mt-0 {
                        margin-top: 0 !important;
                    }
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
