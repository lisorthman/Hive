import { authService } from './auth';

export const notificationService = {
    async getNotifications() {
        const response = await fetch('http://127.0.0.1:5000/api/notifications', {
            headers: {
                'Authorization': `Bearer ${authService.getToken()}`
            }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
    },

    async markAsRead(id: string) {
        const response = await fetch(`http://127.0.0.1:5000/api/notifications/${id}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authService.getToken()}`
            }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
    },

    async markAllAsRead() {
        const response = await fetch('http://127.0.0.1:5000/api/notifications/read-all', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authService.getToken()}`
            }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
    }
};
