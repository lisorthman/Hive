import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { authService } from '../../lib/auth';

export default function Login() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const data = await authService.login({ email, password });

            // Redirect based on role
            if (data.user.role === 'admin') {
                navigate('/admin');
            } else if (data.user.role === 'ngo') {
                navigate('/ngo-create');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            if (err.message === 'Invalid credentials') {
                setError('Invalid email or password. Please try again.');
            } else {
                setError(err.message || 'An unexpected error occurred. Please try again later.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Enter your details to access your Hive dashboard"
        >
            <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                    <Alert variant="error" className="py-2">
                        {error}
                    </Alert>
                )}

                <Input
                    label="Email address"
                    type="email"
                    placeholder="name@example.com"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <div className="space-y-1">
                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <a href="#" className="text-xs font-semibold text-hive-primary hover:text-hive-secondary transition-colors">
                            Forgot password?
                        </a>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full py-3"
                    isLoading={isLoading}
                >
                    Login
                </Button>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-100" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-hive-text-secondary">New to Hive?</span>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => navigate('/register')}
                            className="font-bold text-hive-primary hover:text-hive-secondary transition-colors"
                        >
                            Create an account
                        </button>
                    </div>
                </div>
            </form>
        </AuthLayout>
    );
}
