const API_URL = 'http://127.0.0.1:5001/api';

export const seriesService = {
    async createSeries(payload: Record<string, unknown>) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/series`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create recurring series');
        return data.data;
    },

    async getMySeries() {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/series/my-series`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch series');
        return data.data;
    },

    async getSeries(id: string) {
        const response = await fetch(`${API_URL}/series/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch series');
        return data.data;
    },

    async getSeriesInstances(seriesId: string) {
        const response = await fetch(`${API_URL}/series/${seriesId}/instances`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch instances');
        return data.data;
    }
};
