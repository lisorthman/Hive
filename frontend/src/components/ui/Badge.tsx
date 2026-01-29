import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'gray';
}

export const Badge = ({ className, variant = 'gray', ...props }: BadgeProps) => {
    const variants = {
        primary: 'bg-hive-primary/10 text-hive-primary border-hive-primary/20',
        secondary: 'bg-hive-secondary/10 text-hive-secondary border-hive-secondary/20',
        success: 'bg-green-100 text-green-700 border-green-200',
        warning: 'bg-amber-100 text-amber-700 border-amber-200',
        error: 'bg-red-100 text-red-700 border-red-200',
        gray: 'bg-slate-100 text-slate-600 border-slate-200',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors',
                variants[variant],
                className
            )}
            {...props}
        />
    );
};
