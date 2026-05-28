import { API_URL, authService } from './auth';

const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authService.getToken()}`
});

export type FeedScope = 'all' | 'my_missions' | 'saved';

export const impactFeedService = {
    async getFeed(params?: {
        category?: string;
        hashtag?: string;
        ngo?: string;
        q?: string;
        cursor?: string;
        limit?: number;
        volunteerId?: string;
        featured?: boolean;
        eventId?: string;
        eventInstanceId?: string;
        scope?: FeedScope;
    }) {
        const search = new URLSearchParams();
        if (params?.category) search.set('category', params.category);
        if (params?.hashtag) search.set('hashtag', params.hashtag);
        if (params?.ngo) search.set('ngo', params.ngo);
        if (params?.q) search.set('q', params.q);
        if (params?.cursor) search.set('cursor', params.cursor);
        if (params?.limit) search.set('limit', String(params.limit));
        if (params?.volunteerId) search.set('volunteerId', params.volunteerId);
        if (params?.featured) search.set('featured', 'true');
        if (params?.eventId) search.set('eventId', params.eventId);
        if (params?.eventInstanceId) search.set('eventInstanceId', params.eventInstanceId);
        if (params?.scope && params.scope !== 'all') search.set('scope', params.scope);

        const qs = search.toString();
        const response = await fetch(`${API_URL}/impact-posts${qs ? `?${qs}` : ''}`, {
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch impact feed');
        return data;
    },

    async getSavedPosts() {
        const response = await fetch(`${API_URL}/impact-posts/saved/list`, {
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch saved posts');
        return data.data;
    },

    async getTrending() {
        const response = await fetch(`${API_URL}/impact-posts/trending`, { headers: authHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch trending');
        return data.data;
    },

    async getTaggableVolunteers(params: { eventId?: string; eventInstanceId?: string }) {
        const search = new URLSearchParams();
        if (params.eventId) search.set('eventId', params.eventId);
        if (params.eventInstanceId) search.set('eventInstanceId', params.eventInstanceId);
        const response = await fetch(
            `${API_URL}/impact-posts/taggable-volunteers?${search.toString()}`,
            { headers: authHeaders() }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load volunteers');
        return data.data as { _id: string; name: string; email?: string }[];
    },

    async generateDraftFromMission(eventId: string) {
        const response = await fetch(`${API_URL}/impact-posts/draft-from-event/${eventId}`, {
            method: 'POST',
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to generate draft');
        return data.data;
    },

    async uploadPhotos(files: File[]) {
        const formData = new FormData();
        files.forEach((f) => formData.append('photos', f));
        const response = await fetch(`${API_URL}/impact-posts/upload-photos`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authService.getToken()}` },
            body: formData
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to upload photos');
        return data.data as string[];
    },

    async createPost(payload: any) {
        const response = await fetch(`${API_URL}/impact-posts`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to publish post');
        return data.data;
    },

    async updatePost(
        postId: string,
        payload: {
            title?: string;
            description?: string;
            hashtags?: string[];
            visibility?: 'public' | 'community';
            photos?: string[];
            taggedVolunteers?: string[];
        }
    ) {
        const response = await fetch(`${API_URL}/impact-posts/${postId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update post');
        return data.data;
    },

    async likePost(postId: string) {
        const response = await fetch(`${API_URL}/impact-posts/${postId}/like`, {
            method: 'POST',
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to like post');
        return data.data;
    },

    async unlikePost(postId: string) {
        const response = await fetch(`${API_URL}/impact-posts/${postId}/like`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to unlike post');
        return data.data;
    },

    async saveImpactPost(postId: string) {
        const response = await fetch(`${API_URL}/impact-posts/${postId}/save`, {
            method: 'POST',
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to save post');
        return data.data as { saved: boolean; savesCount: number };
    },

    async shareImpactPost(postId: string) {
        const response = await fetch(`${API_URL}/impact-posts/${postId}/share`, {
            method: 'POST',
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to share post');
        return data.data as { sharesCount: number; shareUrl: string };
    },

    async addContribution(postId: string, text: string) {
        const response = await fetch(`${API_URL}/impact-posts/${postId}/contributions`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to submit contribution');
        return data.data;
    },

    async moderateContribution(
        postId: string,
        contributionId: string,
        status: 'approved' | 'rejected'
    ) {
        const response = await fetch(
            `${API_URL}/impact-posts/${postId}/contributions/${contributionId}`,
            {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ status })
            }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to moderate contribution');
        return data.data;
    },

    async comment(postId: string, text: string, parentComment?: string) {
        const response = await fetch(`${API_URL}/impact-comments`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ postId, text, parentComment })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to comment');
        return data.data;
    },

    async getComments(postId: string) {
        const response = await fetch(`${API_URL}/impact-comments/post/${postId}`, {
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load comments');
        return data.data;
    },

    async reportPost(postId: string, reason: string) {
        const response = await fetch(`${API_URL}/impact-posts/${postId}/report`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ reason })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to report post');
    },

    async reportComment(commentId: string, reason: string) {
        const response = await fetch(`${API_URL}/impact-comments/${commentId}/report`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ reason })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to report comment');
    },

    async deletePost(postId: string) {
        const response = await fetch(`${API_URL}/impact-posts/${postId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete post');
    },

    async getVolunteerActivity(volunteerId: string) {
        const response = await fetch(`${API_URL}/impact-posts/activity/${volunteerId}`, {
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load activity');
        return data.data;
    },

    async getOpenReports() {
        const response = await fetch(`${API_URL}/impact-posts/reports/open`, {
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load reports');
        return data.data;
    },

    async resolveReport(reportId: string, status: 'resolved' | 'dismissed') {
        const response = await fetch(`${API_URL}/impact-posts/reports/${reportId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update report');
        return data.data;
    }
};
