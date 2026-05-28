import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { authService } from '../../lib/auth';
import { cn } from '../../lib/utils';
import { impactFeedService } from '../../lib/impactFeed';

const CATEGORIES = [
    'Environmental',
    'Social Work',
    'Education',
    'Animal Welfare',
    'Healthcare',
    'Disaster Relief',
    'Other'
];

export default function VolunteerProfile() {
    const [activeTab, setActiveTab] = useState<'settings' | 'activity'>('settings');
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [availability, setAvailability] = useState('');
    const [interests, setInterests] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [allowStoryTagging, setAllowStoryTagging] = useState(true);
    const [activity, setActivity] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const user = await authService.getMe();
                setName(user.name || '');
                setBio(user.bio || '');
                setAvailability(user.availability || '');
                setInterests(user.interests || []);
                setSkills(user.skills || []);
                setAllowStoryTagging(user.allowStoryTagging !== false);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const loadActivity = async () => {
            const current = authService.getCurrentUser();
            if (!current?.id) return;
            try {
                const data = await impactFeedService.getVolunteerActivity(current.id);
                setActivity(data);
            } catch {
                setActivity({ taggedPosts: [], completedMissions: [] });
            }
        };
        loadActivity();
    }, []);

    const toggleInterest = (cat: string) => {
        setInterests((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };

    const addSkill = () => {
        const trimmed = skillInput.trim();
        if (!trimmed || skills.includes(trimmed)) return;
        setSkills([...skills, trimmed]);
        setSkillInput('');
    };

    const removeSkill = (skill: string) => {
        setSkills(skills.filter((s) => s !== skill));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await authService.updateProfile({
                name,
                bio,
                availability,
                interests,
                skills,
                allowStoryTagging
            });
            setSuccess('Profile updated successfully.');
        } catch (err: any) {
            setError(err.message);
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

    return (
        <div className="min-h-screen bg-hive-background pb-12">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-1 text-hive-text-secondary hover:text-hive-text-primary"
                    >
                        <ChevronLeft className="h-5 w-5" />
                        <span className="text-sm font-bold">Dashboard</span>
                    </button>
                    <h1 className="text-lg font-bold">My Profile</h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 mt-8">
                <div className="flex gap-2 mb-4">
                    <Button
                        type="button"
                        size="sm"
                        variant={activeTab === 'settings' ? 'primary' : 'outline'}
                        onClick={() => setActiveTab('settings')}
                    >
                        Profile Settings
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={activeTab === 'activity' ? 'primary' : 'outline'}
                        onClick={() => setActiveTab('activity')}
                    >
                        Activity Timeline
                    </Button>
                </div>

                {activeTab === 'settings' ? (
                <form onSubmit={handleSave} className="space-y-6">
                    {error && <Alert variant="error">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h2 className="font-bold text-hive-text-primary">Basic info</h2>
                            <div>
                                <label className="text-xs font-bold text-hive-text-secondary uppercase tracking-wider">
                                    Display name
                                </label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-hive-text-secondary uppercase tracking-wider">
                                    Bio
                                </label>
                                <textarea
                                    className="w-full mt-1 p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-hive-primary/20 outline-none resize-none"
                                    rows={3}
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Tell NGOs a bit about yourself..."
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-hive-text-secondary uppercase tracking-wider">
                                    Availability
                                </label>
                                <textarea
                                    className="w-full mt-1 p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-hive-primary/20 outline-none resize-none"
                                    rows={2}
                                    value={availability}
                                    onChange={(e) => setAvailability(e.target.value)}
                                    placeholder="e.g. Weekends, weekday evenings..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h2 className="font-bold text-hive-text-primary">Mission interests</h2>
                            <p className="text-xs text-hive-text-secondary">
                                Select causes you care about to improve future recommendations.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => toggleInterest(cat)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                                            interests.includes(cat)
                                                ? 'bg-hive-primary text-white border-hive-primary'
                                                : 'bg-white text-hive-text-secondary border-slate-200 hover:border-hive-primary/40'
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h2 className="font-bold text-hive-text-primary">Skills</h2>
                            <div className="flex gap-2">
                                <Input
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    placeholder="Add a skill and press Add"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addSkill();
                                        }
                                    }}
                                />
                                <Button type="button" variant="outline" onClick={addSkill}>
                                    Add
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold"
                                    >
                                        {skill}
                                        <button
                                            type="button"
                                            onClick={() => removeSkill(skill)}
                                            className="text-slate-400 hover:text-rose-600"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-2">
                            <h2 className="font-bold text-hive-text-primary">Privacy</h2>
                            <label className="flex items-center gap-2 text-sm text-hive-text-secondary">
                                <input
                                    type="checkbox"
                                    checked={allowStoryTagging}
                                    onChange={(e) => setAllowStoryTagging(e.target.checked)}
                                />
                                Allow NGOs to tag me in impact stories
                            </label>
                        </CardContent>
                    </Card>

                    <Button type="submit" className="w-full gap-2" isLoading={isSaving}>
                        <Save className="h-4 w-4" /> Save profile
                    </Button>
                </form>
                ) : (
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="p-6">
                                <h2 className="font-bold text-hive-text-primary mb-3">Tagged Impact Stories</h2>
                                {activity?.taggedPosts?.length ? (
                                    <div className="space-y-2">
                                        {activity.taggedPosts.map((post: any) => (
                                            <div key={post._id} className="border border-slate-100 rounded-lg p-3">
                                                <p className="text-sm font-bold">{post.title}</p>
                                                <p className="text-xs text-hive-text-secondary">
                                                    {post.ngo?.name} · {new Date(post.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-hive-text-secondary">No tagged stories yet.</p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <h2 className="font-bold text-hive-text-primary mb-3">Completed Missions</h2>
                                {activity?.completedMissions?.length ? (
                                    <div className="space-y-2">
                                        {activity.completedMissions.map((m: any, idx: number) => (
                                            <div key={`${m.title}-${idx}`} className="border border-slate-100 rounded-lg p-3">
                                                <p className="text-sm font-bold">{m.title}</p>
                                                <p className="text-xs text-hive-text-secondary">
                                                    {new Date(m.date).toLocaleDateString()} · {m.hoursWorked}h verified
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-hive-text-secondary">No completed missions yet.</p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <h2 className="font-bold text-hive-text-primary mb-3">Recent Comments</h2>
                                {activity?.recentComments?.length ? (
                                    <div className="space-y-2">
                                        {activity.recentComments.map((c: any) => (
                                            <div key={c.commentId} className="border border-slate-100 rounded-lg p-3">
                                                <p className="text-xs font-bold text-hive-text-secondary">
                                                    {c.postTitle}
                                                </p>
                                                <p className="text-sm">{c.text}</p>
                                                <p className="text-[10px] text-hive-text-secondary">
                                                    {new Date(c.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-hive-text-secondary">No recent comments yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
