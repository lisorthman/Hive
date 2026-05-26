import { useState, useEffect } from 'react';
import { MessageCircle, Loader2, Trash2, CornerDownRight, Reply } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { commentService } from '../../lib/comments';
import { authService } from '../../lib/auth';

export interface ThreadComment {
    _id: string;
    body: string;
    createdAt: string;
    author?: { _id?: string; name?: string; role?: string };
    replies?: ThreadComment[];
}

interface Props {
    eventId: string;
    canComment: boolean;
    /** Optional line under the main heading (e.g. on Mission hub) */
    subtitle?: string;
}

export function EventDiscussionSection({ eventId, canComment, subtitle }: Props) {
    const [threads, setThreads] = useState<ThreadComment[]>([]);
    const [body, setBody] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const user = authService.getCurrentUser();

    const loadComments = async () => {
        try {
            setIsLoading(true);
            const data = await commentService.getEventComments(eventId);
            setThreads(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadComments();
    }, [eventId]);

    const handlePost = async () => {
        if (!body.trim()) return;
        setIsPosting(true);
        setError(null);
        try {
            await commentService.postComment(eventId, body);
            setBody('');
            await loadComments();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-hive-primary" /> Mission Discussion
                </h2>
                {subtitle && (
                    <p className="text-sm text-hive-text-secondary mt-2 leading-relaxed">{subtitle}</p>
                )}
            </div>

            {canComment ? (
                <Card className="border-slate-100">
                    <CardContent className="p-4 space-y-3">
                        <textarea
                            className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-hive-primary/20 focus:border-hive-primary outline-none resize-none"
                            rows={3}
                            placeholder="Ask a question, coordinate carpools, or share logistics..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                        {error && <p className="text-xs text-rose-600">{error}</p>}
                        <Button size="sm" onClick={handlePost} isLoading={isPosting} disabled={!body.trim()}>
                            Post Comment
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <p className="text-sm text-hive-text-secondary bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {user
                        ? 'Join this mission to participate in the discussion.'
                        : 'Sign in and join this mission to join the conversation.'}
                </p>
            )}

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-hive-primary" />
                </div>
            ) : threads.length === 0 ? (
                <p className="text-sm text-hive-text-secondary text-center py-6">
                    No comments yet. Start the conversation!
                </p>
            ) : (
                <div className="space-y-3">
                    {threads.map((c) => (
                        <CommentThread
                            key={c._id}
                            comment={c}
                            depth={0}
                            eventId={eventId}
                            canComment={canComment}
                            user={user}
                            onReload={loadComments}
                            onError={setError}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function CommentThread({
    comment,
    depth,
    eventId,
    canComment,
    user,
    onReload,
    onError
}: {
    comment: ThreadComment;
    depth: number;
    eventId: string;
    canComment: boolean;
    user: { id: string; role?: string } | null;
    onReload: () => Promise<void>;
    onError: (msg: string | null) => void;
}) {
    const [replyOpen, setReplyOpen] = useState(false);
    const [replyBody, setReplyBody] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    const canDelete = user?.role === 'admin';

    const handleDeleteComment = async (commentId: string) => {
        if (!window.confirm('Delete this comment and all replies under it? (Admin only)')) return;
        try {
            await commentService.deleteComment(commentId);
            await onReload();
        } catch (err: any) {
            onError(err.message);
        }
    };

    const handleReply = async () => {
        if (!replyBody.trim()) return;
        setIsPosting(true);
        onError(null);
        try {
            await commentService.postComment(eventId, replyBody, comment._id);
            setReplyBody('');
            setReplyOpen(false);
            await onReload();
        } catch (err: any) {
            onError(err.message);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className={depth > 0 ? 'ml-4 sm:ml-8 pl-3 border-l-2 border-slate-100' : ''}>
            <Card className="border-slate-100 mb-2">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                            {depth > 0 && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    <CornerDownRight className="h-3 w-3" /> Reply
                                </div>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm">{comment.author?.name}</span>
                                <span className="text-[10px] uppercase font-bold text-hive-primary bg-hive-primary/10 px-1.5 py-0.5 rounded">
                                    {comment.author?.role}
                                </span>
                            </div>
                            <p className="text-sm text-hive-text-secondary whitespace-pre-wrap break-words">
                                {comment.body}
                            </p>
                            <p className="text-[10px] text-slate-400">
                                {new Date(comment.createdAt).toLocaleString()}
                            </p>
                            {canComment && (
                                <button
                                    type="button"
                                    onClick={() => setReplyOpen((v) => !v)}
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-hive-primary hover:underline"
                                >
                                    <Reply className="h-3.5 w-3.5" />
                                    {replyOpen ? 'Cancel' : 'Reply'}
                                </button>
                            )}
                        </div>
                        {canDelete && (
                            <button
                                type="button"
                                onClick={() => handleDeleteComment(comment._id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
                                title="Delete comment (admin)"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {replyOpen && canComment && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                            <textarea
                                className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-hive-primary/20 outline-none resize-none"
                                rows={2}
                                placeholder="Write a reply..."
                                value={replyBody}
                                onChange={(e) => setReplyBody(e.target.value)}
                            />
                            <Button size="sm" onClick={handleReply} isLoading={isPosting} disabled={!replyBody.trim()}>
                                Post Reply
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {comment.replies?.map((r) => (
                <CommentThread
                    key={r._id}
                    comment={r}
                    depth={depth + 1}
                    eventId={eventId}
                    canComment={canComment}
                    user={user}
                    onReload={onReload}
                    onError={onError}
                />
            ))}
        </div>
    );
}
