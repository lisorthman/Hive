import { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { reviewService } from '../../lib/reviews';
import { authService } from '../../lib/auth';

interface Props {
    eventId: string;
    averageRating?: number;
    reviewCount?: number;
    canReview: boolean;
    onRatingUpdate?: (avg: number, count: number) => void;
}

export function EventReviewsSection({ eventId, averageRating = 0, reviewCount = 0, canReview, onRatingUpdate }: Props) {
    const [reviews, setReviews] = useState<any[]>([]);
    const [myReview, setMyReview] = useState<any>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const user = authService.getCurrentUser();

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                const list = await reviewService.getEventReviews(eventId);
                setReviews(list);
                if (user && (user.role === 'volunteer' || user.role === 'admin')) {
                    const mine = await reviewService.getMyReview(eventId);
                    if (mine) {
                        setMyReview(mine);
                        setRating(mine.rating);
                        setComment(mine.comment || '');
                    }
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [eventId, user?.id]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            const result = await reviewService.submitReview(eventId, rating, comment);
            setMyReview(result.data);
            const list = await reviewService.getEventReviews(eventId);
            setReviews(list);
            if (result.ratingSummary && onRatingUpdate) {
                onRatingUpdate(result.ratingSummary.averageRating, result.ratingSummary.reviewCount);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Reviews
                </h2>
                <div className="flex items-center gap-2 text-sm">
                    <StarRating value={averageRating} />
                    <span className="font-bold text-hive-text-primary">
                        {reviewCount > 0 ? averageRating.toFixed(1) : '—'}
                    </span>
                    <span className="text-hive-text-secondary">({reviewCount})</span>
                </div>
            </div>

            {canReview && (
                <Card className="border-amber-100">
                    <CardContent className="p-6 space-y-4">
                        <h3 className="font-bold text-hive-text-primary">
                            {myReview ? 'Update your review' : 'Rate this mission'}
                        </h3>
                        <p className="text-xs text-hive-text-secondary">
                            You verified your attendance — share feedback to help the community.
                        </p>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setRating(n)}
                                    className="p-1 transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`h-7 w-7 ${n <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`}
                                    />
                                </button>
                            ))}
                        </div>
                        <textarea
                            className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-hive-primary/20 focus:border-hive-primary outline-none resize-none"
                            rows={3}
                            placeholder="Share your experience (optional)"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                        {error && <p className="text-xs text-rose-600">{error}</p>}
                        <Button onClick={handleSubmit} isLoading={isSubmitting} className="w-full sm:w-auto">
                            {myReview ? 'Update Review' : 'Submit Review'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-hive-primary" />
                </div>
            ) : reviews.length === 0 ? (
                <p className="text-sm text-hive-text-secondary text-center py-6 bg-white rounded-xl border border-slate-100">
                    No reviews yet. Be the first after your verified check-in!
                </p>
            ) : (
                <div className="space-y-3">
                    {reviews.map((r) => (
                        <Card key={r._id} className="border-slate-100">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm">{r.volunteer?.name || 'Volunteer'}</span>
                                    <StarRating value={r.rating} size="sm" />
                                </div>
                                {r.comment && (
                                    <p className="text-sm text-hive-text-secondary">{r.comment}</p>
                                )}
                                <p className="text-[10px] text-slate-400">
                                    {new Date(r.createdAt).toLocaleDateString()}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
}

function StarRating({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
    const cls = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={`${cls} ${n <= Math.round(value) ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`}
                />
            ))}
        </div>
    );
}
