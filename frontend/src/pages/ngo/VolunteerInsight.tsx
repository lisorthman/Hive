import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, Mail, Award, Clock, Handshake } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { attendanceService } from '../../lib/attendance';
import { Alert } from '../../components/ui/Alert';

export default function VolunteerInsight() {
    const { volunteerId } = useParams<{ volunteerId: string }>();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<any>(null);

    useEffect(() => {
        const run = async () => {
            if (!volunteerId) return;
            try {
                setIsLoading(true);
                const data = await attendanceService.getVolunteerSummaryForOrg(volunteerId);
                setSummary(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        run();
    }, [volunteerId]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-hive-background">
                <Loader2 className="h-10 w-10 text-hive-primary animate-spin" />
            </div>
        );
    }

    if (!summary || error) {
        return (
            <div className="min-h-screen bg-hive-background p-6">
                <button
                    type="button"
                    onClick={() => navigate('/ngo-dashboard')}
                    className="flex items-center gap-1 text-sm font-bold text-hive-text-secondary mb-4"
                >
                    <ChevronLeft className="h-5 w-5" />
                    NGO Dashboard
                </button>
                <Alert variant="error">{error || 'Unable to load volunteer summary'}</Alert>
            </div>
        );
    }

    const { profile, stats } = summary;

    return (
        <div className="min-h-screen bg-hive-background pb-10">
            <header className="bg-white border-b border-slate-100">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/ngo-dashboard')}
                        className="flex items-center gap-1 text-sm font-bold text-hive-text-secondary"
                    >
                        <ChevronLeft className="h-5 w-5" />
                        NGO Dashboard
                    </button>
                    <h1 className="text-lg font-bold">Volunteer Dashboard View</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
                <Card>
                    <CardContent className="p-6 space-y-2">
                        <h2 className="text-2xl font-black text-hive-text-primary">{profile.name}</h2>
                        <p className="text-sm text-hive-text-secondary flex items-center gap-2">
                            <Mail className="h-4 w-4" /> {profile.email}
                        </p>
                        {profile.bio && <p className="text-sm text-hive-text-secondary">{profile.bio}</p>}
                    </CardContent>
                </Card>

                <div className="grid sm:grid-cols-3 gap-4">
                    <StatCard label="Joined Missions" value={stats.joinedCount} icon={<Handshake className="h-5 w-5" />} />
                    <StatCard label="Checked-In" value={stats.checkedInCount} icon={<Award className="h-5 w-5" />} />
                    <StatCard label="Total Hours" value={stats.totalHours} icon={<Clock className="h-5 w-5" />} />
                </div>

                <Card>
                    <CardContent className="p-6">
                        <h3 className="font-bold text-hive-text-primary mb-4">Engagement</h3>
                        <p className="text-sm text-hive-text-secondary">
                            Level <span className="font-bold text-hive-text-primary">{stats.level}</span> · Score{' '}
                            <span className="font-bold text-hive-text-primary">{stats.score}</span>
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <h3 className="font-bold text-hive-text-primary mb-4">
                            Previous Volunteering Details
                        </h3>
                        {stats.recentHistory?.length ? (
                            <div className="space-y-2">
                                {stats.recentHistory.map((item: any) => (
                                    <div
                                        key={item.attendanceId}
                                        className="border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-hive-text-primary">
                                                {item.title}
                                            </p>
                                            <p className="text-xs text-hive-text-secondary">
                                                {new Date(item.date).toLocaleDateString()} · {item.category}
                                                {item.ngoName ? ` · ${item.ngoName}` : ''}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                                                {item.status}
                                            </p>
                                            <p className="text-xs text-hive-text-secondary">
                                                {item.hoursWorked}h
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-hive-text-secondary">
                                No completed volunteering records yet.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <Card>
            <CardContent className="p-5 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-hive-text-secondary">{label}</p>
                    <p className="text-2xl font-black text-hive-text-primary">{value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-hive-primary/10 text-hive-primary flex items-center justify-center">
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}
