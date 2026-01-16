import { useState } from 'react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Users, Building2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Role = 'volunteer' | 'ngo';

export default function Register() {
    const [role, setRole] = useState<Role | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 2000);
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
                        <a href="/login" className="font-bold text-hive-primary hover:text-hive-secondary transition-colors">Login</a>
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
                        <Input label="Full Name" placeholder="Jane Doe" required />
                        <Input label="Email address" type="email" placeholder="jane@example.com" required />

                        <div className="space-y-1">
                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                required
                            />
                            <p className="text-[10px] text-hive-text-secondary px-1">Must be at least 8 characters with at least one number.</p>
                        </div>

                        <Input label="Confirm Password" type="password" placeholder="••••••••" required />

                        <div className="pt-2">
                            <Button type="submit" className="w-full py-3" isLoading={isLoading}>
                                Create {role === 'volunteer' ? 'Volunteer' : 'NGO'} Account
                            </Button>
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
