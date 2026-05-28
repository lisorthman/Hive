import { useState } from 'react';
import { Sparkles, Upload } from 'lucide-react';
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
    const [files, setFiles] = useState<File[]>([]);
    const [loadingDraft, setLoadingDraft] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [taggedVolunteerIds, setTaggedVolunteerIds] = useState<string[]>([]);

    const generateDraft = async () => {
        const sourceId = eventId || eventInstanceId;
        if (!sourceId) return;
        setLoadingDraft(true);
        try {
            const draft = await impactFeedService.generateDraftFromMission(sourceId);
            setTitle(draft.title || '');
            setDescription(draft.description || '');
            setHashtags((draft.hashtags || []).join(', '));
        } finally {
            setLoadingDraft(false);
        }
    };

    const publish = async () => {
        setSubmitting(true);
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
                taggedVolunteers: taggedVolunteerIds
            });
            setTitle('');
            setDescription('');
            setHashtags('');
            setTaggedVolunteerIds([]);
            setFiles([]);
            await onPublished();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="border-slate-100">
            <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-hive-text-primary">Publish Impact Story</h3>
                    {(eventId || eventInstanceId) && (
                        <Button size="sm" variant="outline" onClick={generateDraft} isLoading={loadingDraft}>
                            <Sparkles className="h-4 w-4 mr-1" /> Generate Draft
                        </Button>
                    )}
                </div>
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
                <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                    Suggested prompt: mention volunteer count, total hours, mission outcome, and one gratitude line.
                </div>
                <Button onClick={publish} isLoading={submitting} disabled={!title.trim() || !description.trim()}>
                    Publish Story
                </Button>
            </CardContent>
        </Card>
    );
}
