import { useState } from 'react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';

export default function Login() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setError("This is a demonstration of how errors appear.");
        }, 1500);
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
                />

                <div className="space-y-1">
                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
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
                        <a href="/register" className="font-bold text-hive-primary hover:text-hive-secondary transition-colors">
                            Create an account
                        </a>
                    </div>
                </div>
            </form>
        </AuthLayout>
    );
}
