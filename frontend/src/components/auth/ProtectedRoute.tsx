import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../../lib/auth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const location = useLocation();
    const user = authService.getCurrentUser();
    const token = authService.getToken();

    if (!token || !user) {
        // Redirect to login but save the current location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Role not authorized, redirect to home page
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
