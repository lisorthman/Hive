const API_URL = 'http://127.0.0.1:5001/api';

export const attendanceService = {
    async getEventAttendance(eventId: string) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/attendance/event/${eventId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch attendance');
            return data.data;
        } catch (error) {
            console.error('Error fetching event attendance:', error);
            throw error;
        }
    },

    async updateAttendanceManual(eventId: string, records: Array<{ volunteerId: string; status: string; hoursWorked: number }>) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/attendance/event/${eventId}/manual`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ records })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update attendance');
            return data.data;
        } catch (error) {
            console.error('Error updating attendance manually:', error);
            throw error;
        }
    },

    async generateCheckInCode(eventId: string) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/attendance/event/${eventId}/code`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to generate check-in code');
            return data.code;
        } catch (error) {
            console.error('Error generating check-in code:', error);
            throw error;
        }
    },

    async getMyAttendanceStatus(eventId: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/attendance/event/${eventId}/my-status`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch attendance status');
        return data.data;
    },

    async checkInVolunteer(eventId: string, code: string) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/attendance/event/${eventId}/check-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to check-in');
            return data.data;
        } catch (error) {
            console.error('Error checking in volunteer:', error);
            throw error;
        }
    },

    async getVolunteerStats() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/attendance/my-stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch stats');
            return data.data;
        } catch (error) {
            console.error('Error fetching volunteer stats:', error);
            throw error;
        }
    },

    async getLeaderboard() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/attendance/leaderboard`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch leaderboard');
            return data.data;
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            throw error;
        }
    }
};
