import { API_URL, authService } from './auth';

const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authService.getToken()}`
});

export const reviewService = {
    async getEventReviews(eventId: string) {
        const response = await fetch(`${API_URL}/reviews/event/${eventId}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
    },

    async getMyReview(eventId: string) {
        const response = await fetch(`${API_URL}/reviews/event/${eventId}/mine`, {
            headers: authHeaders()
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
    },

    async submitReview(eventId: string, rating: number, comment: string) {
        const response = await fetch(`${API_URL}/reviews/event/${eventId}`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ rating, comment })
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data;
    },

    async getNGOSummary() {
        const response = await fetch(`${API_URL}/reviews/ngo/summary`, {
            headers: authHeaders()
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
    }
};
