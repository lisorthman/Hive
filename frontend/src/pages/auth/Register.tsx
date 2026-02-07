import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';
import { Users, Building2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../../lib/auth';

type Role = 'volunteer' | 'ngo';

export default function Register() {
    const location = useLocation();
    const [role, setRole] = useState<Role | null>(location.state?.role || null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [verificationDoc, setVerificationDoc] = useState<File | null>(null);

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (role === 'ngo' && !verificationDoc) {
            setError("Please upload a verification document (PDF)");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Use FormData for file upload
            const formData = new FormData();
            formData.append('name', name);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('role', role || 'volunteer');

            if (role === 'ngo' && verificationDoc) {
                formData.append('verificationDocument', verificationDoc);
            }

            // We need to bypass the type check for now since authService expects JSON
            // In a real app, we'd update the authService type signature
            await authService.register(formData as any);

            // Redirect based on role
            if (role === 'ngo') {
                // Show success message or redirect to a waiting page
                alert("Registration successful! Please wait for admin approval."); // Simple feedback for now
                navigate('/login');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error('Registration error:', err);
            if (err.message?.includes('duplicate key error') || err.message?.includes('E11000')) {
                setError('This email is already registered. Please use a different email or try logging in.');
            } else {
                setError(err.message || 'Failed to create account. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Create your account"
            subtitle="Join the Hive community and start tracking your impact"
        >
            {!role ? (
                <div className="space-y-6">
                    <p className="text-sm font-medium text-hive-text-primary text-center">Choose your role to get started</p>
                    <div className="grid grid-cols-1 gap-4">
                        <RoleCard
                            icon={<Users className="h-6 w-6" />}
                            title="Volunteer"
                            description="I want to find events and track my community service hours."
                            onClick={() => setRole('volunteer')}
                            isSelected={role === 'volunteer'}
                        />
                        <RoleCard
                            icon={<Building2 className="h-6 w-6" />}
                            title="NGO / Organization"
                            description="I want to post events and manage volunteer teams."
                            onClick={() => setRole('ngo')}
                            isSelected={role === 'ngo'}
                        />
                    </div>
                    <div className="text-center text-sm">
                        <span className="text-hive-text-secondary">Already have an account? </span>
                        <Link to="/login" className="font-bold text-hive-primary hover:text-hive-secondary transition-colors">Login</Link>
                    </div>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="mb-6 flex items-center justify-between">
                        <button
                            onClick={() => setRole(null)}
                            className="text-xs font-bold text-hive-text-secondary hover:text-hive-text-primary transition-colors flex items-center gap-1"
                        >
                            ← Change role ({role === 'volunteer' ? 'Volunteer' : 'NGO'})
                        </button>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <Alert variant="error" className="py-2">
                                {error}
                            </Alert>
                        )}

                        <Input
                            label="Full Name"
                            placeholder="Jane Doe"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <Input
                            label="Email address"
                            type="email"
                            placeholder="jane@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <div className="space-y-1">
                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <p className="text-[10px] text-hive-text-secondary px-1">Must be at least 8 characters with at least one number.</p>
                        </div>

                        <Input
                            label="Confirm Password"
                            type="password"
                            placeholder="••••••••"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />

                        {role === 'ngo' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-hive-text-primary">
                                    Verification Document
                                </label>
                                <div className="flex flex-col gap-2">
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setVerificationDoc(e.target.files?.[0] || null)}
                                            className="hidden"
                                            id="doc-upload"
                                        />
                                        <label
                                            htmlFor="doc-upload"
                                            className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-hive-primary/50 hover:bg-hive-primary/5 transition-all"
                                        >
                                            <div className="text-center">
                                                <p className="text-sm text-hive-text-secondary font-medium">
                                                    {verificationDoc ? verificationDoc.name : "Upload NGO Verification PDF"}
                                                </p>
                                                <p className="text-[10px] text-hive-text-secondary mt-1">PDF only, max 5MB</p>
                                            </div>
                                        </label>
                                    </div>
                                    <p className="text-[10px] text-hive-text-secondary">
                                        To ensure validity, please upload a government-issued registration document.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <Button type="submit" className="w-full py-3" isLoading={isLoading}>
                                Create {role === 'volunteer' ? 'Volunteer' : 'NGO'} Account
                            </Button>
                        </div>

                        <div className="text-center text-sm pt-2">
                            <span className="text-hive-text-secondary">Already have an account? </span>
                            <Link to="/login" className="font-bold text-hive-primary hover:text-hive-secondary transition-colors">Login</Link>
                        </div>
                    </form>
                </motion.div>
            )}
        </AuthLayout>
    );
}

function RoleCard({ icon, title, description, onClick, isSelected }: { icon: React.ReactNode, title: string, description: string, onClick: () => void, isSelected: boolean }) {
    return (
        <Card
            onClick={onClick}
            padding="sm"
            className={cn(
                "cursor-pointer transition-all border-2 relative overflow-hidden group",
                isSelected ? "border-hive-primary bg-hive-primary/5" : "border-slate-100 hover:border-hive-primary/50"
            )}
        >
            <div className="flex items-center gap-4">
                <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                    isSelected ? "bg-hive-primary text-white" : "bg-slate-50 text-hive-text-secondary group-hover:bg-hive-primary group-hover:text-white"
                )}>
                    {icon}
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-hive-text-primary">{title}</h4>
                    <p className="text-xs text-hive-text-secondary leading-relaxed">{description}</p>
                </div>
                <AnimatePresence>
                    {isSelected && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="bg-hive-primary text-white rounded-full p-0.5"
                        >
                            <Check className="h-4 w-4" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Card>
    );
}
