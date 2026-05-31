export const API_URL = 'http://127.0.0.1:5001/api';

const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

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
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });

            const data = await response.json();

            if (!response.ok) {
                const err = new Error(data.error || 'Login failed') as Error & {
                    requiresVerification?: boolean;
                    email?: string;
                };
                err.requiresVerification = data.requiresVerification;
                err.email = data.email;
                throw err;
            }

            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            return data;
        } catch (error: any) {
            if (error.message === 'Failed to fetch') {
                throw new Error('Unable to connect to the server. Please ensure the backend is running.');
            }
            throw error;
        }
    },

    async verifyEmail(token: string) {
        const response = await fetch(`${API_URL}/auth/verify-email/${token}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data;
    },

    async resendVerification(email: string) {
        const response = await fetch(`${API_URL}/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data;
    },

    async getMe() {
        const response = await fetch(`${API_URL}/auth/me`, { headers: authHeaders() });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        const user = {
            id: data.data._id,
            name: data.data.name,
            email: data.data.email,
            role: data.data.role,
            emailVerified: data.data.emailVerified,
            interests: data.data.interests,
            skills: data.data.skills,
            availability: data.data.availability,
            bio: data.data.bio
            ,
            allowStoryTagging: data.data.allowStoryTagging,
            emergencyProfile: data.data.emergencyProfile
        };
        localStorage.setItem('user', JSON.stringify(user));
        return user;
    },

    async updateProfile(profile: {
        name?: string;
        bio?: string;
        interests?: string[];
        skills?: string[];
        availability?: string;
        allowStoryTagging?: boolean;
        emergencyProfile?: {
            availableForEmergencies?: boolean;
            availabilityWindow?: 'anytime' | 'weekdays' | 'weekends';
            maxRadiusKm?: number;
            remoteSupportOk?: boolean;
        };
    }) {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(profile)
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        const user = {
            id: data.data._id,
            name: data.data.name,
            email: data.data.email,
            role: data.data.role,
            emailVerified: data.data.emailVerified,
            interests: data.data.interests,
            skills: data.data.skills,
            availability: data.data.availability,
            bio: data.data.bio
            ,
            allowStoryTagging: data.data.allowStoryTagging,
            emergencyProfile: data.data.emergencyProfile
        };
        localStorage.setItem('user', JSON.stringify(user));
        return user;
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
