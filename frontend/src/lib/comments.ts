import { API_URL, authService } from './auth';

const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authService.getToken()}`
});

export const commentService = {
    async getEventComments(eventId: string) {
        const response = await fetch(`${API_URL}/comments/event/${eventId}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
    },

    async postComment(eventId: string, body: string, parentComment?: string | null) {
        const response = await fetch(`${API_URL}/comments/event/${eventId}`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ body, parentComment: parentComment || undefined })
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
    },

    async deleteComment(commentId: string) {
        const response = await fetch(`${API_URL}/comments/${commentId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
    }
};
