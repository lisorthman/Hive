import { API_URL, authService } from './auth';

const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authService.getToken()}`
});

export type BroadcastOptions = {
    skillsOnly?: boolean;
    maxRadiusKm?: number;
    targetSkills?: string[];
    minScore?: number;
    limit?: number;
    enforceRadius?: boolean;
    message?: string;
};

export const crisisService = {
    async getMap() {
        const response = await fetch(`${API_URL}/crisis/map`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load crisis map');
        return data.data;
    },

    async getMatchedVolunteers(eventId: string, params?: Record<string, string | boolean>) {
        const qs = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== '') qs.set(k, String(v));
            });
        }
        const response = await fetch(
            `${API_URL}/crisis/${eventId}/matched-volunteers?${qs.toString()}`,
            { headers: authHeaders() }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load matched volunteers');
        return data.data;
    },

    async broadcastAlert(eventId: string, options: BroadcastOptions = {}) {
        const response = await fetch(`${API_URL}/crisis/${eventId}/alert`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(options)
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
        return data;
    },

    async getUpdates(eventId: string) {
        const response = await fetch(`${API_URL}/crisis/${eventId}/updates`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load updates');
        return data.data;
    },

    async createUpdate(eventId: string, message: string, isPinned = false) {
        const response = await fetch(`${API_URL}/crisis/${eventId}/updates`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ message, isPinned })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to post update');
        return data.data;
    },

    async getAnalytics(eventId: string) {
        const response = await fetch(`${API_URL}/crisis/${eventId}/analytics`, {
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load analytics');
        return data.data;
    },

    async getImpactDraft(eventId: string) {
        const response = await fetch(`${API_URL}/crisis/${eventId}/impact-draft`, {
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to generate draft');
        return data.data;
    },

    async getSummary(eventId: string) {
        const response = await fetch(`${API_URL}/crisis/${eventId}/summary`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load summary');
        return data.data;
    },

    async getAdminOverview() {
        const response = await fetch(`${API_URL}/crisis/admin/overview`, {
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load crisis overview');
        return data.data;
    },

    async getResources(eventId: string) {
        const response = await fetch(`${API_URL}/crisis/${eventId}/resources`, {
            headers: authHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load resources');
        return data.data;
    },

    async createResourceRequest(
        eventId: string,
        payload: { item: string; quantityNeeded: number; unit?: string; priority?: string }
    ) {
        const response = await fetch(`${API_URL}/crisis/${eventId}/resources`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create resource request');
        return data.data;
    },

    async pledgeResource(resourceId: string, quantity: number, note?: string) {
        const response = await fetch(`${API_URL}/crisis/resources/${resourceId}/pledge`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ quantity, note })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to pledge resource');
        return data.data;
    },

    async invitePartner(eventId: string, partnerEmail: string) {
        const response = await fetch(`${API_URL}/crisis/${eventId}/partners`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ partnerEmail })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to invite partner');
        return data.data;
    },

    async respondPartnerInvite(eventId: string, response: 'accepted' | 'declined') {
        const res = await fetch(`${API_URL}/crisis/${eventId}/partners/respond`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ response })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to respond to invite');
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

export const DEPLOYMENT_ROLES = [
    'Medical support',
    'Driving / transport',
    'Food packing',
    'Shelter setup',
    'Rescue logistics',
    'General support'
];
