import { API_URL } from './auth';

export const ngoService = {
    async getNGOProfile(ngoId: string) {
        const response = await fetch(`${API_URL}/ngos/${ngoId}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
    },

    async getNGOEvents(ngoId: string) {
        const response = await fetch(`${API_URL}/ngos/${ngoId}/events`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
    }
};
