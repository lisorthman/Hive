import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
    return (
        <div className="min-h-screen bg-hive-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
            {/* Back to Home Link */}
            <div className="absolute top-8 left-8">
                <Link
                    to="/"
                    className="flex items-center gap-2 text-sm font-bold text-hive-text-secondary hover:text-hive-primary transition-colors group"
                >
                    <div className="p-2 rounded-full bg-white shadow-soft group-hover:shadow-md transition-all">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    Back to Home
                </Link>
            </div>

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sm:mx-auto sm:w-full sm:max-w-md text-center"
            >
                <div className="flex justify-center">
                    <Link to="/">
                        <Logo size="lg" showText={false} className="shadow-soft rounded-2xl hover:scale-105 transition-transform" />
                    </Link>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-hive-text-primary tracking-tight">
                    {title}
                </h2>
                <p className="mt-2 text-center text-sm text-hive-text-secondary">
                    {subtitle}
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
            >
                <div className="bg-white py-8 px-4 shadow-soft sm:rounded-lg sm:px-10 border border-slate-100">
                    {children}
                </div>
            </motion.div>
        </div>
    );
};
