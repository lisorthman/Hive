import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Flag, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { impactFeedService } from '../../lib/impactFeed';
import { authService } from '../../lib/auth';
import { ImpactCommentsThread } from './ImpactCommentsThread';

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

    const liked = post.likes?.some((id: string) => id === user?.id);

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

    return (
        <Card className="border-slate-100">
            <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-black text-hive-text-primary">{post.title}</p>
                        <p className="text-xs text-slate-500">
                            {post.ngo?.name || 'NGO'} · {new Date(post.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <div className="flex gap-1">
                        <button className="p-1 text-slate-400 hover:text-rose-600" onClick={report}>
                            <Flag className="h-4 w-4" />
                        </button>
                        {(user?.role === 'admin' || post.ngo?._id === user?.id) && (
                            <button className="p-1 text-slate-400 hover:text-rose-600" onClick={remove}>
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{post.description}</p>
                {post.photos?.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {post.photos.map((url: string, idx: number) => (
                            <img
                                key={`${post._id}-${idx}`}
                                src={url.startsWith('http') ? url : `http://127.0.0.1:5001${url}`}
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
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={toggleLike} isLoading={busy}>
                        <Heart className={`h-4 w-4 mr-1 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                        {post.likesCount || 0}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowComments((v) => !v)}>
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {post.commentsCount || 0}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => impactFeedService.shareImpactPost(post._id)}>
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => impactFeedService.saveImpactPost(post._id)}>
                        <Bookmark className="h-4 w-4 mr-1" />
                        Save
                    </Button>
                </div>
                {showComments && <ImpactCommentsThread postId={post._id} />}
            </CardContent>
        </Card>
    );
}
