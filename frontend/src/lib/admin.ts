import { API_URL } from './auth';

export const adminService = {
    /**
     * Open an NGO verification document (admin only).
     * The PDF is fetched with the admin's token and shown from a temporary blob URL,
     * so there is no public link to the file.
     */
    async openNgoDocument(ngoId: string) {
        // Open the tab during the click so pop-up blockers allow it.
        const tab = window.open('', '_blank');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/admin/ngos/${encodeURIComponent(ngoId)}/document`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                let message = 'Could not open document';
                try {
                    const data = await response.json();
                    if (data?.error) message = data.error;
                } catch { /* response was not JSON */ }
                throw new Error(message);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            if (tab) tab.location.href = url;
            else window.open(url, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (err) {
            tab?.close();
            throw err;
        }
    },

    async getStats() {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async getUsers(role?: string) {
        const token = localStorage.getItem('token');
        const query = role ? `?role=${role}` : '';
        const response = await fetch(`${API_URL}/admin/users${query}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

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
    },

    async updateUserAccountStatus(id: string, status: 'active' | 'suspended') {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/users/${id}/account-status`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async removeUser(id: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/users/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async getAuditLogs(limit = 50) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/audit-logs?limit=${limit}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async getOpenImpactReports() {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/impact-posts/reports/open`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async resolveImpactReport(id: string, status: 'resolved' | 'dismissed') {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/impact-posts/reports/${id}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    }
};
