import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button } from '../../components/ui/Button';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VerifyEmail() {
    return (
        <AuthLayout
            title="Check your email"
            subtitle="We've sent a verification link to your inbox"
        >
            <div className="flex flex-col items-center text-center space-y-6">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-20 h-20 bg-hive-primary/10 rounded-full flex items-center justify-center"
                >
                    <CheckCircle2 className="h-10 w-10 text-hive-primary" />
                </motion.div>

                <div className="space-y-2">
                    <p className="text-base text-hive-text-primary">
                        Please verify your email to activate your account and start your journey with Hive.
                    </p>
                    <p className="text-sm text-hive-text-secondary">
                        Didn't receive the email? Check your spam folder or click below to resend.
                    </p>
                </div>

                <Button className="w-full">
                    Resend Verification Email
                </Button>

                <a href="/login" className="text-sm font-bold text-hive-text-secondary hover:text-hive-text-primary transition-colors">
                    Back to Login
                </a>
            </div>
        </AuthLayout>
    );
}
