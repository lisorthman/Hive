import { API_URL, authService } from './auth';

const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authService.getToken()}`
});

export const crisisService = {
    async getMap() {
        const response = await fetch(`${API_URL}/crisis/map`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load crisis map');
        return data.data;
    },

    async broadcastAlert(eventId: string) {
        const response = await fetch(`${API_URL}/crisis/${eventId}/alert`, {
            method: 'POST',
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to broadcast alert');
        return data.data;
    },

    async updateStatus(
        eventId: string,
        crisisStatus: 'active' | 'stand_down' | 'resolved',
        message?: string
    ) {
        const response = await fetch(`${API_URL}/crisis/${eventId}/status`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ crisisStatus, message })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update crisis status');
        return data.data;
    },

    async createEmergencyMission(payload: any) {
        const response = await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ ...payload, missionMode: 'emergency' })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create emergency mission');
        return data.data;
    }
};

export const URGENCY_COLORS: Record<string, string> = {
    critical: 'bg-rose-600 text-white border-rose-700',
    high: 'bg-orange-500 text-white border-orange-600',
    medium: 'bg-amber-500 text-white border-amber-600',
    low: 'bg-slate-500 text-white border-slate-600'
};

export const DISASTER_LABELS: Record<string, string> = {
    flood: 'Flood',
    landslide: 'Landslide',
    cyclone: 'Cyclone',
    wildfire: 'Wildfire',
    earthquake: 'Earthquake',
    medical: 'Medical / Blood',
    food_shortage: 'Food shortage',
    shelter: 'Emergency shelter',
    other: 'Other crisis'
};
