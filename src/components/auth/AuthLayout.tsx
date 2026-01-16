import React from 'react';
import { Hexagon } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
    return (
        <div className="min-h-screen bg-hive-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sm:mx-auto sm:w-full sm:max-w-md"
            >
                <div className="flex justify-center">
                    <div className="bg-hive-primary p-2.5 rounded-xl shadow-soft">
                        <Hexagon className="h-8 w-8 text-white fill-white/20" />
                    </div>
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
