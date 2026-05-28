/** Home route after login or when a role cannot access a page. */
export function getDashboardPath(role?: string | null): string {
    switch (role) {
        case 'ngo':
            return '/ngo-dashboard';
        case 'admin':
            return '/admin';
        case 'volunteer':
        default:
            return '/dashboard';
    }
}

export function getDashboardLabel(role?: string | null): string {
    switch (role) {
        case 'ngo':
            return 'NGO Dashboard';
        case 'admin':
            return 'Admin';
        default:
            return 'Dashboard';
    }
}
