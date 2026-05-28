import { useEffect, useState } from 'react';
import { Sparkles, Upload, Wand2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { impactFeedService } from '../../lib/impactFeed';
import { VolunteerTagPicker } from './VolunteerTagPicker';

export function ImpactComposer({
    eventId,
    eventInstanceId,
    onPublished
}: {
    eventId?: string;
    eventInstanceId?: string;
    onPublished: () => Promise<void>;
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [hashtags, setHashtags] = useState('');
    const [visibility, setVisibility] = useState<'public' | 'community'>('public');
    const [files, setFiles] = useState<File[]>([]);
    const [loadingDraft, setLoadingDraft] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [taggedVolunteerIds, setTaggedVolunteerIds] = useState<string[]>([]);
    const [taggablePool, setTaggablePool] = useState<{ _id: string }[]>([]);
    const [publishError, setPublishError] = useState('');

    const missionLinked = !!(eventId || eventInstanceId);

    useEffect(() => {
        if (!missionLinked) return;
        impactFeedService
            .getTaggableVolunteers({ eventId, eventInstanceId })
            .then(setTaggablePool)
            .catch(() => setTaggablePool([]));
    }, [eventId, eventInstanceId, missionLinked]);

    const generateDraft = async () => {
        const sourceId = eventId || eventInstanceId;
        if (!sourceId) return;
        setLoadingDraft(true);
        setPublishError('');
        try {
            const draft = await impactFeedService.generateDraftFromMission(sourceId);
            setTitle(draft.title || '');
            setDescription(draft.description || '');
            setHashtags((draft.hashtags || []).join(', '));
        } catch (e: any) {
            setPublishError(e.message || 'Failed to generate draft');
        } finally {
            setLoadingDraft(false);
        }
    };

    const quickPublishWizard = async () => {
        await generateDraft();
        setTaggedVolunteerIds(taggablePool.map((v) => v._id));
    };

    const publish = async () => {
        if (!missionLinked) {
            setPublishError('Open this page from a mission (Publish impact story) to link your story.');
            return;
        }
        setSubmitting(true);
        setPublishError('');
        try {
            const photoUrls = files.length ? await impactFeedService.uploadPhotos(files) : [];
            await impactFeedService.createPost({
                title,
                description,
                event: eventId,
                eventInstance: eventInstanceId,
                photos: photoUrls,
                hashtags: hashtags
                    .split(',')
                    .map((h) => h.trim())
                    .filter(Boolean),
                taggedVolunteers: taggedVolunteerIds,
                visibility
            });
            setTitle('');
            setDescription('');
            setHashtags('');
            setTaggedVolunteerIds([]);
            setFiles([]);
            setVisibility('public');
            await onPublished();
        } catch (e: any) {
            setPublishError(e.message || 'Failed to publish');
        } finally {
            setSubmitting(false);
        }
    };

    if (!missionLinked) {
        return (
            <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-5 text-sm text-amber-900">
                    <p className="font-bold mb-1">Link a completed mission to publish</p>
                    <p>
                        Go to <strong>NGO Dashboard → Mission hub → Publish impact story</strong> after
                        marking the event completed and checking volunteers in.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-100">
            <CardContent className="p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-hive-text-primary">Publish Impact Story</h3>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={quickPublishWizard} isLoading={loadingDraft}>
                            <Wand2 className="h-4 w-4 mr-1" /> Quick: draft + tag all
                        </Button>
                        <Button size="sm" variant="outline" onClick={generateDraft} isLoading={loadingDraft}>
                            <Sparkles className="h-4 w-4 mr-1" /> Generate draft
                        </Button>
                    </div>
                </div>

                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                    Stories can be published after the mission is marked <strong>completed</strong>.
                    Only checked-in volunteers with tagging enabled can be named.
                </p>

                <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Story title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[110px]"
                    placeholder="Describe your mission impact..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="Hashtags (comma separated)"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                />
                <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as 'public' | 'community')}
                >
                    <option value="public">Public — visible to everyone</option>
                    <option value="community">Community — mission participants only</option>
                </select>
                <VolunteerTagPicker
                    eventId={eventId}
                    eventInstanceId={eventInstanceId}
                    selectedIds={taggedVolunteerIds}
                    onChange={setTaggedVolunteerIds}
                />
                <label className="flex items-center gap-2 text-sm text-slate-600 border border-dashed border-slate-300 rounded-lg px-3 py-2 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Upload photos
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    />
                </label>
                {files.length > 0 && (
                    <p className="text-xs text-slate-500">{files.length} photo(s) selected</p>
                )}
                {publishError && (
                    <p className="text-xs text-rose-600 bg-rose-50 rounded-lg p-2">{publishError}</p>
                )}
                <Button
                    onClick={publish}
                    isLoading={submitting}
                    disabled={!title.trim() || !description.trim()}
                >
                    Publish Story
                </Button>
            </CardContent>
        </Card>
    );
}
