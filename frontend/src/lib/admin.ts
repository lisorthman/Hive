import { API_URL } from './auth';

export const adminService = {
    async getNGOs(status?: string) {
        const token = localStorage.getItem('token');
        const query = status ? `?status=${status}` : '';
        const response = await fetch(`${API_URL}/admin/ngos${query}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async updateNGOStatus(id: string, status: 'verified' | 'rejected' | 'pending') {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/ngo-status/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    }
};
