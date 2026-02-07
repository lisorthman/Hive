export const API_URL = 'http://127.0.0.1:5001/api';

export const authService = {
    async register(userData: any) {
        const isFormData = userData instanceof FormData;
        const headers: HeadersInit = isFormData ? {} : { 'Content-Type': 'application/json' };

        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: headers,
            body: isFormData ? userData : JSON.stringify(userData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }

        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    },

    async login(credentials: any) {
        console.log('Attempting login for:', credentials.email);
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            const data = await response.json();
            console.log('Login response received:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                console.log('Token and user saved to localStorage');
            }

            return data;
        } catch (error: any) {
            console.error('Frontend Auth Service Error:', error);
            if (error.message === 'Failed to fetch') {
                throw new Error('Unable to connect to the server. Please ensure the backend is running.');
            }
            throw error;
        }
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    getToken() {
        return localStorage.getItem('token');
    }
};
