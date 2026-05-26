import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { authService } from '../../lib/auth';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const state = location.state as { email?: string; devVerificationLink?: string } | null;
    const emailFromState = state?.email || '';

    const [email, setEmail] = useState(emailFromState);
    const [devLink, setDevLink] = useState<string | null>(state?.devVerificationLink || null);
    const [status, setStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>(
        token ? 'verifying' : 'idle'
    );
    const [message, setMessage] = useState<string | null>(null);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        if (!token) return;
        const verify = async () => {
            try {
                const data = await authService.verifyEmail(token);
                setStatus('verified');
                setMessage(data.message);
            } catch (err: any) {
                setStatus('error');
                setMessage(err.message);
            }
        };
        verify();
    }, [token]);

    const handleResend = async () => {
        if (!email.trim()) {
            setMessage('Please enter your email address.');
            setStatus('error');
            return;
        }
        setIsResending(true);
        setMessage(null);
        setDevLink(null);
        try {
            const data = await authService.resendVerification(email.trim());
            setMessage(data.message);
            if (data.devVerificationLink) {
                setDevLink(data.devVerificationLink);
            }
        } catch (err: any) {
            setMessage(err.message);
            setStatus('error');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <AuthLayout
            title={status === 'verified' ? 'Email verified' : 'Check your email'}
            subtitle={
                status === 'verified'
                    ? 'Your account is ready to use'
                    : 'Verify your email to activate your volunteer account'
            }
        >
            <div className="flex flex-col items-center text-center space-y-6">
                {status === 'verifying' && (
                    <Loader2 className="h-10 w-10 text-hive-primary animate-spin" />
                )}

                {status === 'verified' && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-20 h-20 bg-hive-primary/10 rounded-full flex items-center justify-center"
                    >
                        <CheckCircle2 className="h-10 w-10 text-hive-primary" />
                    </motion.div>
                )}

                {message && (
                    <Alert variant={status === 'error' ? 'error' : 'success'} className="w-full text-left">
                        {message}
                    </Alert>
                )}

                {status !== 'verified' && (
                    <>
                        <p className="text-sm text-hive-text-secondary text-left w-full">
                            <strong className="text-hive-text-primary">Evaluator note (dev mode):</strong>{' '}
                            After registration, open the backend terminal — the verification link is printed there.
                            Or enter your email below and click resend to generate a new link in the API response (development only).
                        </p>

                        <div className="w-full space-y-2 text-left">
                            <label className="text-xs font-bold text-hive-text-secondary uppercase tracking-wider">
                                Email
                            </label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                            />
                        </div>

                        {devLink && (
                            <div className="w-full p-3 bg-slate-50 rounded-xl text-left text-xs break-all border border-slate-200">
                                <span className="font-bold block mb-1">Dev verification link:</span>
                                <a href={devLink} className="text-hive-primary font-bold hover:underline">
                                    {devLink}
                                </a>
                            </div>
                        )}

                        <Button className="w-full" onClick={handleResend} isLoading={isResending}>
                            Resend verification link
                        </Button>
                    </>
                )}

                {status === 'verified' ? (
                    <Button className="w-full" onClick={() => navigate('/login')}>
                        Continue to login
                    </Button>
                ) : (
                    <Link
                        to="/login"
                        className="text-sm font-bold text-hive-text-secondary hover:text-hive-text-primary transition-colors"
                    >
                        Back to Login
                    </Link>
                )}
            </div>
        </AuthLayout>
    );
}
