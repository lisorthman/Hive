import { useEffect, useState } from 'react';
import { MessageCircle, Reply, Flag, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { impactFeedService } from '../../lib/impactFeed';

type CommentNode = {
    _id: string;
    text: string;
    createdAt: string;
    author?: { name?: string; role?: string };
    replies?: CommentNode[];
};

export function ImpactCommentsThread({ postId }: { postId: string }) {
    const [comments, setComments] = useState<CommentNode[]>([]);
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            setComments(await impactFeedService.getComments(postId));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [postId]);

    const post = async () => {
        if (!body.trim()) return;
        setPosting(true);
        setError(null);
        try {
            await impactFeedService.comment(postId, body.trim());
            setBody('');
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold">
                <MessageCircle className="h-4 w-4 text-hive-primary" /> Comments
            </div>
            <div className="flex gap-2">
                <input
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Write a comment..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                />
                <Button size="sm" onClick={post} isLoading={posting}>
                    Post
                </Button>
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}

            {loading ? (
                <div className="py-4 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-hive-primary" />
                </div>
            ) : comments.length === 0 ? (
                <p className="text-xs text-slate-400">No comments yet.</p>
            ) : (
                <div className="space-y-2">
                    {comments.map((comment) => (
                        <CommentNodeView key={comment._id} node={comment} postId={postId} onReload={load} />
                    ))}
                </div>
            )}
        </div>
    );
}

function CommentNodeView({
    node,
    postId,
    onReload
}: {
    node: CommentNode;
    postId: string;
    onReload: () => Promise<void>;
}) {
    const [replyOpen, setReplyOpen] = useState(false);
    const [replyBody, setReplyBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [reporting, setReporting] = useState(false);

    const reply = async () => {
        if (!replyBody.trim()) return;
        setSubmitting(true);
        try {
            await impactFeedService.comment(postId, replyBody.trim(), node._id);
            setReplyBody('');
            setReplyOpen(false);
            await onReload();
        } finally {
            setSubmitting(false);
        }
    };

    const report = async () => {
        const reason = window.prompt('Reason for reporting this comment?') || '';
        if (!reason.trim()) return;
        setReporting(true);
        try {
            await impactFeedService.reportComment(node._id, reason.trim());
            alert('Comment reported to moderators.');
        } finally {
            setReporting(false);
        }
    };

    return (
        <div className="border border-slate-100 rounded-lg p-3">
            <div className="flex justify-between gap-2">
                <div>
                    <p className="text-xs font-bold">{node.author?.name || 'User'}</p>
                    <p className="text-sm text-slate-700">{node.text}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(node.createdAt).toLocaleString()}
                    </p>
                </div>
                <button
                    className="text-slate-400 hover:text-rose-600 p-1"
                    onClick={report}
                    disabled={reporting}
                >
                    <Flag className="h-4 w-4" />
                </button>
            </div>
            <button
                className="text-xs font-bold text-hive-primary mt-2 inline-flex items-center gap-1"
                onClick={() => setReplyOpen((v) => !v)}
            >
                <Reply className="h-3.5 w-3.5" /> {replyOpen ? 'Cancel' : 'Reply'}
            </button>
            {replyOpen && (
                <div className="mt-2 flex gap-2">
                    <input
                        className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Write a reply..."
                    />
                    <Button size="sm" onClick={reply} isLoading={submitting}>
                        Reply
                    </Button>
                </div>
            )}
            {node.replies?.length ? (
                <div className="ml-4 mt-2 space-y-2">
                    {node.replies.map((child) => (
                        <CommentNodeView key={child._id} node={child} postId={postId} onReload={onReload} />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
