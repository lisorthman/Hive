import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Flag, Trash2, Pencil } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { impactFeedService } from '../../lib/impactFeed';
import { authService } from '../../lib/auth';
import { resolveUploadUrl } from '../../lib/apiBase';
import { ImpactCommentsThread } from './ImpactCommentsThread';
import { VolunteerTagPicker } from './VolunteerTagPicker';

export function ImpactPostCard({
    post,
    onRefresh
}: {
    post: any;
    onRefresh: () => Promise<void>;
}) {
    const user = authService.getCurrentUser();
    const [showComments, setShowComments] = useState(false);
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(!!post.savedByMe);
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(post.title);
    const [editDescription, setEditDescription] = useState(post.description);
    const [editVisibility, setEditVisibility] = useState<'public' | 'community'>(
        post.visibility || 'public'
    );
    const [editTaggedIds, setEditTaggedIds] = useState<string[]>(
        (post.taggedVolunteers || []).map((v: any) => v._id || v)
    );
    const [contributionText, setContributionText] = useState('');

    const ngoId = post.ngo?._id || post.ngo;
    const liked = post.likes?.some((id: string) => id === user?.id || id?.toString?.() === user?.id);
    const isOwner = user?.role === 'admin' || ngoId === user?.id;
    const isVolunteer = user?.role === 'volunteer';

    const toggleLike = async () => {
        setBusy(true);
        try {
            if (liked) await impactFeedService.unlikePost(post._id);
            else await impactFeedService.likePost(post._id);
            await onRefresh();
        } finally {
            setBusy(false);
        }
    };

    const toggleSave = async () => {
        setBusy(true);
        try {
            const res = await impactFeedService.saveImpactPost(post._id);
            setSaved(res.saved);
            await onRefresh();
        } finally {
            setBusy(false);
        }
    };

    const share = async () => {
        try {
            const res = await impactFeedService.shareImpactPost(post._id);
            await navigator.clipboard.writeText(res.shareUrl);
            alert('Link copied to clipboard!');
            await onRefresh();
        } catch {
            alert('Could not copy link.');
        }
    };

    const report = async () => {
        const reason = window.prompt('Why are you reporting this post?') || '';
        if (!reason.trim()) return;
        await impactFeedService.reportPost(post._id, reason);
        alert('Post reported to moderators.');
    };

    const remove = async () => {
        if (!window.confirm('Delete this impact story?')) return;
        await impactFeedService.deletePost(post._id);
        await onRefresh();
    };

    const saveEdit = async () => {
        setBusy(true);
        try {
            await impactFeedService.updatePost(post._id, {
                title: editTitle,
                description: editDescription,
                visibility: editVisibility,
                taggedVolunteers: editTaggedIds
            });
            setEditing(false);
            await onRefresh();
        } finally {
            setBusy(false);
        }
    };

    const submitContribution = async () => {
        if (!contributionText.trim()) return;
        setBusy(true);
        try {
            await impactFeedService.addContribution(post._id, contributionText);
            setContributionText('');
            alert('Submitted for NGO approval.');
            await onRefresh();
        } catch (e: any) {
            alert(e.message || 'Failed to submit');
        } finally {
            setBusy(false);
        }
    };

    const moderateContribution = async (contributionId: string, status: 'approved' | 'rejected') => {
        setBusy(true);
        try {
            await impactFeedService.moderateContribution(post._id, contributionId, status);
            await onRefresh();
        } finally {
            setBusy(false);
        }
    };

    const pendingContributions = (post.volunteerContributions || []).filter(
        (c: any) => c.status === 'pending'
    );
    const approvedContributions = (post.volunteerContributions || []).filter(
        (c: any) => c.status === 'approved'
    );

    return (
        <Card id={`impact-post-${post._id}`} className="border-slate-100 scroll-mt-24">
            <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        {editing ? (
                            <input
                                className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold mb-2"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                            />
                        ) : (
                            <p className="text-sm font-black text-hive-text-primary">{post.title}</p>
                        )}
                        <p className="text-xs text-slate-500">
                            {post.ngo?.name || 'NGO'} · {new Date(post.createdAt).toLocaleString()}
                            {post.visibility === 'community' && (
                                <Badge variant="secondary" className="ml-2 text-[9px]">
                                    Community
                                </Badge>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-1">
                        {isOwner && !editing && (
                            <button
                                type="button"
                                className="p-1 text-slate-400 hover:text-hive-primary"
                                onClick={() => setEditing(true)}
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                        )}
                        <button type="button" className="p-1 text-slate-400 hover:text-rose-600" onClick={report}>
                            <Flag className="h-4 w-4" />
                        </button>
                        {isOwner && (
                            <button type="button" className="p-1 text-slate-400 hover:text-rose-600" onClick={remove}>
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {editing ? (
                    <div className="space-y-2">
                        <textarea
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[100px]"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                        />
                        <select
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            value={editVisibility}
                            onChange={(e) => setEditVisibility(e.target.value as 'public' | 'community')}
                        >
                            <option value="public">Public — everyone</option>
                            <option value="community">Community — mission participants only</option>
                        </select>
                        {(post.event || post.eventInstance) && (
                            <VolunteerTagPicker
                                eventId={post.event?._id || post.event}
                                eventInstanceId={post.eventInstance?._id || post.eventInstance}
                                selectedIds={editTaggedIds}
                                onChange={setEditTaggedIds}
                            />
                        )}
                        <div className="flex gap-2">
                            <Button size="sm" onClick={saveEdit} isLoading={busy}>
                                Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{post.description}</p>
                )}

                {post.taggedVolunteers?.length > 0 && (
                    <p className="text-xs text-slate-500">
                        Tagged:{' '}
                        {post.taggedVolunteers.map((v: any) => v.name || v).join(', ')}
                    </p>
                )}

                {approvedContributions.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-bold text-slate-600">Volunteer voices</p>
                        {approvedContributions.map((c: any) => (
                            <div key={c._id} className="text-sm text-slate-700">
                                <span className="font-semibold">{c.author?.name || 'Volunteer'}: </span>
                                {c.text}
                            </div>
                        ))}
                    </div>
                )}

                {isOwner && pendingContributions.length > 0 && (
                    <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-bold text-amber-800">Pending volunteer additions</p>
                        {pendingContributions.map((c: any) => (
                            <div key={c._id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-slate-700">
                                    <span className="font-semibold">{c.author?.name}: </span>
                                    {c.text}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => moderateContribution(c._id, 'approved')}
                                        isLoading={busy}
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => moderateContribution(c._id, 'rejected')}
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {post.photos?.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {post.photos.map((url: string, idx: number) => (
                            <img
                                key={`${post._id}-${idx}`}
                                src={resolveUploadUrl(url)}
                                alt=""
                                className="w-full h-28 object-cover rounded-lg"
                            />
                        ))}
                    </div>
                )}
                <div className="flex flex-wrap gap-1">
                    {post.hashtags?.map((tag: string) => (
                        <Badge key={`${post._id}-${tag}`} variant="secondary" className="text-[10px]">
                            #{tag}
                        </Badge>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={toggleLike} isLoading={busy}>
                        <Heart className={`h-4 w-4 mr-1 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                        {post.likesCount || 0}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowComments((v) => !v)}>
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {post.commentsCount || 0}
                    </Button>
                    <Button size="sm" variant="outline" onClick={share}>
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                    </Button>
                    <Button size="sm" variant="outline" onClick={toggleSave} isLoading={busy}>
                        <Bookmark className={`h-4 w-4 mr-1 ${saved ? 'fill-hive-primary text-hive-primary' : ''}`} />
                        {saved ? 'Saved' : 'Save'}
                    </Button>
                </div>

                {isVolunteer && !editing && (
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                        <p className="text-xs font-bold text-slate-600">Add your experience (NGO approves)</p>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[60px]"
                            placeholder="Share a short note about your experience..."
                            value={contributionText}
                            onChange={(e) => setContributionText(e.target.value)}
                        />
                        <Button size="sm" onClick={submitContribution} isLoading={busy} disabled={!contributionText.trim()}>
                            Submit addition
                        </Button>
                    </div>
                )}

                {showComments && <ImpactCommentsThread postId={post._id} />}
            </CardContent>
        </Card>
    );
}
