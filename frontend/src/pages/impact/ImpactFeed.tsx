import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Flame, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { impactFeedService } from '../../lib/impactFeed';
import { ImpactPostCard } from '../../components/impact/ImpactPostCard';
import { ImpactComposer } from '../../components/impact/ImpactComposer';
import { authService } from '../../lib/auth';
import { getDashboardLabel, getDashboardPath } from '../../lib/dashboardPaths';

const CATEGORIES = ['All', 'Environmental', 'Healthcare', 'Education', 'Disaster Relief', 'Social Work'];

export default function ImpactFeed() {
    const navigate = useNavigate();
    const location = useLocation();
    const [posts, setPosts] = useState<any[]>([]);
    const [trending, setTrending] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [cursor, setCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const user = authService.getCurrentUser();
    const canPublish = user?.role === 'ngo' || user?.role === 'admin';
    const dashboardPath = getDashboardPath(user?.role);
    const dashboardLabel = getDashboardLabel(user?.role);
    const qs = new URLSearchParams(location.search);
    const eventId = qs.get('eventId') || undefined;
    const eventInstanceId = qs.get('eventInstanceId') || undefined;

    const load = async (append = false) => {
        try {
            if (!append) setLoading(true);
            else setLoadingMore(true);
            const res = await impactFeedService.getFeed({
                q: search || undefined,
                category: category === 'All' ? undefined : category,
                cursor: append ? cursor || undefined : undefined,
                limit: 12
            });
            setPosts((prev) => (append ? [...prev, ...res.data] : res.data));
            setCursor(res.nextCursor || null);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadTrending = async () => {
        try {
            setTrending(await impactFeedService.getTrending());
        } catch {
            setTrending([]);
        }
    };

    useEffect(() => {
        load();
        loadTrending();
    }, [category]);

    const featured = useMemo(() => trending.slice(0, 3), [trending]);
    const featuredNgos = useMemo(() => {
        const map = new Map<string, { name: string; count: number }>();
        for (const post of trending) {
            const name = post.ngo?.name;
            if (!name) continue;
            map.set(name, { name, count: (map.get(name)?.count || 0) + 1 });
        }
        return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    }, [trending]);

    return (
        <div className="min-h-screen bg-hive-background pb-10">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                    <button
                        className="flex items-center gap-1 text-sm font-bold text-hive-text-secondary"
                        onClick={() => navigate(dashboardPath)}
                    >
                        <ChevronLeft className="h-5 w-5" />
                        {dashboardLabel}
                    </button>
                    <h1 className="text-lg font-bold">Impact Stories Feed</h1>
                    <Button size="sm" variant="outline" onClick={() => load()}>
                        Refresh
                    </Button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 mt-6 grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-slate-400" />
                                <input
                                    className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm"
                                    placeholder="Search impact stories"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button size="sm" onClick={() => load()}>
                                Search
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                                    category === cat
                                        ? 'bg-hive-primary text-white border-hive-primary'
                                        : 'bg-white border-slate-200 text-slate-600'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {canPublish && (
                        <ImpactComposer
                            eventId={eventId}
                            eventInstanceId={eventInstanceId}
                            onPublished={load}
                        />
                    )}

                    {loading ? (
                        <div className="py-12 flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-hive-primary" />
                        </div>
                    ) : posts.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center text-sm text-slate-500">
                                No impact stories found.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {posts.map((post) => (
                                <ImpactPostCard key={post._id} post={post} onRefresh={() => load()} />
                            ))}
                        </div>
                    )}

                    {cursor && (
                        <Button variant="outline" onClick={() => load(true)} isLoading={loadingMore}>
                            Load more
                        </Button>
                    )}
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <h3 className="text-sm font-bold flex items-center gap-1">
                                <Flame className="h-4 w-4 text-orange-500" /> Trending Stories
                            </h3>
                            {featured.length === 0 ? (
                                <p className="text-xs text-slate-400">No trending stories yet.</p>
                            ) : (
                                featured.map((post) => (
                                    <button
                                        key={post._id}
                                        className="text-left w-full border border-slate-100 rounded-lg p-2 hover:bg-slate-50"
                                        onClick={() => navigate(`/impact-feed?focus=${post._id}`)}
                                    >
                                        <p className="text-sm font-bold line-clamp-1">{post.title}</p>
                                        <p className="text-xs text-slate-500">
                                            {post.likesCount} likes · {post.commentsCount} comments
                                        </p>
                                    </button>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <h3 className="text-sm font-bold mb-2">Featured Causes</h3>
                            <div className="text-xs text-slate-600 space-y-1">
                                <p>#Environmental</p>
                                <p>#Healthcare</p>
                                <p>#Education</p>
                                <p>#DisasterRelief</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <h3 className="text-sm font-bold mb-2">Featured NGOs</h3>
                            {featuredNgos.length ? (
                                <div className="space-y-1 text-xs text-slate-600">
                                    {featuredNgos.map((ngo) => (
                                        <p key={ngo.name}>
                                            {ngo.name} · {ngo.count} trending story
                                            {ngo.count === 1 ? '' : 'ies'}
                                        </p>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400">No featured NGOs yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
