import React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    onClose?: () => void;
}

export const Alert = ({ className, variant = 'info', title, children, onClose, ...props }: AlertProps) => {
    const icons = {
        info: <Info className="h-5 w-5 text-blue-500" />,
        success: <CheckCircle className="h-5 w-5 text-hive-primary" />,
        warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
        error: <XCircle className="h-5 w-5 text-red-500" />,
    };

    const variants = {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        success: 'bg-hive-primary/10 border-hive-primary/20 text-hive-primary',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        error: 'bg-red-50 border-red-200 text-red-800',
    };

    return (
        <div
            role="alert"
            className={cn(
                'relative flex items-start gap-3 p-4 rounded-lg border shadow-sm animate-in fade-in slide-in-from-top-2 duration-300',
                variants[variant],
                className
            )}
            {...props}
        >
            <div className="mt-0.5 shrink-0">{icons[variant]}</div>
            <div className="flex-1">
                {title && <h5 className="font-bold leading-none tracking-tight mb-1">{title}</h5>}
                <div className="text-sm opacity-90">{children}</div>
            </div>
            {onClose && (
                <button
                    onClick={onClose}
                    className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};
