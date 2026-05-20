import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Trophy, Crown, ArrowLeft, Search, Clock, TrendingUp, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { attendanceService } from '../../lib/attendance';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export default function Leaderboard() {
    const navigate = useNavigate();
    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                setIsLoading(true);
                const data = await attendanceService.getLeaderboard();
                setLeaderboardData(data || []);
            } catch (err) {
                console.error('Error fetching leaderboard data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    const filteredData = leaderboardData.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const topThree = filteredData.slice(0, 3);
    const restOfUsers = filteredData.slice(3);

    // Arrange podium order: [2nd, 1st, 3rd] for visual presentation
    const podiumUsers = [];
    if (topThree[1]) podiumUsers.push({ ...topThree[1], rank: 2 });
    if (topThree[0]) podiumUsers.push({ ...topThree[0], rank: 1 });
    if (topThree[2]) podiumUsers.push({ ...topThree[2], rank: 3 });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-hive-background">
                <Loader2 className="h-10 w-10 text-hive-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-hive-background pb-12 text-hive-text-primary">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-hive-text-secondary hover:text-hive-primary font-bold transition-colors group"
                    >
                        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Dashboard</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-hive-secondary animate-pulse" />
                        <h1 className="text-xl font-black tracking-tight">Hive Leaderboard</h1>
                    </div>
                    <div className="w-24"></div> {/* Spacer for symmetry */}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search volunteers by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-hive-primary/20 focus:border-hive-primary shadow-sm text-sm transition-all"
                    />
                </div>

                {filteredData.length === 0 ? (
                    <Card className="p-12 text-center space-y-4">
                        <Trophy className="h-12 w-12 text-slate-300 mx-auto" />
                        <p className="text-hive-text-secondary italic">No volunteers found matching your search.</p>
                    </Card>
                ) : (
                    <>
                        {/* Podium Section (Top 3) */}
                        {podiumUsers.length > 0 && (
                            <section className="flex flex-col sm:flex-row items-end justify-center gap-6 pt-8 pb-4">
                                {podiumUsers.map((user) => (
                                    <motion.div
                                        key={user.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: user.rank * 0.15 }}
                                        className={cn(
                                            "w-full sm:w-60 bg-white rounded-2xl border flex flex-col items-center p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-medium relative",
                                            user.rank === 1 ? "border-amber-200/80 bg-amber-50/10 order-2 sm:h-80" : "",
                                            user.rank === 2 ? "border-slate-200 order-1 sm:h-72" : "",
                                            user.rank === 3 ? "border-orange-200/60 order-3 sm:h-64" : ""
                                        )}
                                    >
                                        {/* Rank Badge / Crown */}
                                        <div className="absolute -top-6 flex flex-col items-center">
                                            {user.rank === 1 ? (
                                                <Crown className="h-8 w-8 text-amber-500 fill-amber-500 filter drop-shadow-md animate-bounce" />
                                            ) : (
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white shadow-md",
                                                    user.rank === 2 ? "bg-slate-400" : "bg-orange-500"
                                                )}>
                                                    {user.rank}
                                                </div>
                                            )}
                                        </div>

                                        {/* User Details */}
                                        <div className="mt-4 flex flex-col items-center text-center space-y-3 w-full">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden flex items-center justify-center font-black text-lg text-hive-primary">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-extrabold text-base truncate max-w-full">{user.name}</h3>
                                                <span className="text-xs text-hive-text-secondary">Level {user.level}</span>
                                            </div>

                                            {/* Score Metric */}
                                            <div className="w-full bg-slate-50/80 rounded-xl p-3 flex items-center justify-around gap-2 text-xs border border-slate-100">
                                                <div className="text-center">
                                                    <div className="font-black text-hive-primary flex items-center justify-center gap-1">
                                                        <Clock className="h-3 w-3" /> {user.totalHours}h
                                                    </div>
                                                    <div className="text-[10px] text-hive-text-secondary">Hours</div>
                                                </div>
                                                <div className="w-[1px] h-6 bg-slate-200" />
                                                <div className="text-center">
                                                    <div className="font-black text-hive-secondary flex items-center justify-center gap-1">
                                                        <TrendingUp className="h-3 w-3" /> {user.score}
                                                    </div>
                                                    <div className="text-[10px] text-hive-text-secondary">Score</div>
                                                </div>
                                            </div>

                                            {/* Mini Badges */}
                                            {user.badges && user.badges.length > 0 && (
                                                <div className="flex gap-1.5 justify-center flex-wrap pt-2">
                                                    {user.badges.slice(0, 3).map((bId: string) => (
                                                        <span
                                                            key={bId}
                                                            className="w-5 h-5 rounded-full bg-hive-primary/10 text-hive-primary flex items-center justify-center"
                                                            title={bId.replace('_', ' ')}
                                                        >
                                                            <Award className="h-3 w-3" />
                                                        </span>
                                                    ))}
                                                    {user.badges.length > 3 && (
                                                        <span className="text-[10px] font-bold text-hive-text-secondary self-center">
                                                            +{user.badges.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </section>
                        )}

                        {/* List Section (Rank 4+) */}
                        {restOfUsers.length > 0 && (
                            <section className="space-y-4">
                                <h3 className="text-lg font-bold">Community Rankings</h3>
                                <Card padding="none">
                                    <div className="divide-y divide-slate-100">
                                        {restOfUsers.map((user, idx) => {
                                            const rank = idx + 4;
                                            return (
                                                <div key={user.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        {/* Rank */}
                                                        <span className="w-6 text-center text-sm font-black text-hive-text-secondary">{rank}</span>
                                                        
                                                        {/* Avatar */}
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-hive-primary">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>

                                                        {/* Name & Level */}
                                                        <div className="min-w-0">
                                                            <h4 className="font-extrabold text-sm sm:text-base truncate">{user.name}</h4>
                                                            <span className="text-xs text-hive-text-secondary">Level {user.level}</span>
                                                        </div>
                                                    </div>

                                                    {/* Hours & Score */}
                                                    <div className="flex items-center gap-6 text-right">
                                                        <div className="hidden sm:block">
                                                            <div className="text-xs font-bold text-hive-text-secondary">Total Hours</div>
                                                            <div className="text-sm font-black text-hive-text-primary">{user.totalHours} hrs</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-hive-text-secondary">Score</div>
                                                            <div className="text-sm font-black text-hive-secondary">{user.score} pts</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
