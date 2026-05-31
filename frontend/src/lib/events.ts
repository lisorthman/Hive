const API_URL = 'http://127.0.0.1:5001/api';

export const eventService = {
    async getEvents() {
        try {
            const response = await fetch(`${API_URL}/events`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch events');
            return data.data;
        } catch (error) {
            console.error('Error fetching events:', error);
            throw error;
        }
    },

    async getMyEvents() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/events/my-events`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch my events');
            return data.data;
        } catch (error) {
            console.error('Error fetching my events:', error);
            throw error;
        }
    },

    async getJoinedEvents() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/events/joined`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch joined events');
            return data.data;
        } catch (error) {
            console.error('Error fetching joined events:', error);
            throw error;
        }
    },

    async getEvent(id: string) {
        try {
            const response = await fetch(`${API_URL}/events/${id}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch event');
            return data.data;
        } catch (error) {
            console.error('Error fetching event:', error);
            throw error;
        }
    },

    async createEvent(eventData: any) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(eventData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create event');
            return data.data;
        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    },

    async updateEventStatus(id: string, status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled') {
        return this.updateEvent(id, { status });
    },

    async updateEvent(id: string, eventData: any) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/events/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(eventData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update event');
            return data.data;
        } catch (error) {
            console.error('Error updating event:', error);
            throw error;
        }
    },

    async deleteEvent(id: string) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/events/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete event');
            return data.data;
        } catch (error) {
            console.error('Error deleting event:', error);
            throw error;
        }
    },

    async getEventParticipation(id: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/events/${id}/participation`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch participation');
        return data.data;
    },

    async getRecommendedEvents(lat?: number, lng?: number) {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (lat != null && lng != null) {
            params.set('lat', String(lat));
            params.set('lng', String(lng));
        }
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${API_URL}/events/recommended${qs}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch recommendations');
        return data.data;
    },

    async getWaitlistedEvents() {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/events/waitlisted`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch waitlisted events');
        return data.data;
    },

    async joinEvent(id: string, shiftSlotId?: string, deploymentRole?: string) {
        try {
            const token = localStorage.getItem('token');
            const body: Record<string, string> = {};
            if (shiftSlotId) body.shiftSlotId = shiftSlotId;
            if (deploymentRole) body.deploymentRole = deploymentRole;
            const response = await fetch(`${API_URL}/events/${id}/join`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to join event');
            return data;
        } catch (error) {
            console.error('Error joining event:', error);
            throw error;
        }
    },

    async leaveEvent(id: string, shiftSlotId?: string) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/events/${id}/leave`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(shiftSlotId ? { shiftSlotId } : {})
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to leave event');
            return data;
        } catch (error) {
            console.error('Error leaving event:', error);
            throw error;
        }
    },

    async getEventVolunteers(id: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/events/${id}/volunteers`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch event volunteers');
        return data.data;
    },

    async removeVolunteerFromEvent(
        eventId: string,
        volunteerId: string,
        message: string
    ) {
        const token = localStorage.getItem('token');
        const response = await fetch(
            `${API_URL}/events/${eventId}/volunteers/${volunteerId}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ message })
            }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to remove volunteer');
        return data.data;
    }
};
