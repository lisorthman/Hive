const API_URL = 'http://127.0.0.1:5001/api';

export const instanceService = {
    async getInstance(id: string) {
        const response = await fetch(`${API_URL}/instances/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch mission date');
        return data.data;
    },

    async getParticipation(id: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/instances/${id}/participation`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch participation');
        return data.data;
    },

    async joinInstance(id: string, shiftSlotId?: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/instances/${id}/join`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(shiftSlotId ? { shiftSlotId } : {})
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to RSVP');
        return data;
    },

    async leaveInstance(id: string, shiftSlotId?: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/instances/${id}/leave`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(shiftSlotId ? { shiftSlotId } : {})
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to cancel RSVP');
        return data;
    }
};
