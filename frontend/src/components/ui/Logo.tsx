import { Hexagon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LogoProps {
    className?: string;
    iconClassName?: string;
    textClassName?: string;
    showText?: boolean;
    variant?: 'primary' | 'white';
    size?: 'sm' | 'md' | 'lg';
}

export const Logo = ({
    className,
    iconClassName,
    textClassName,
    showText = true,
    variant = 'primary',
    size = 'md'
}: LogoProps) => {
    const sizeMap = {
        sm: { icon: 'h-4 w-4', text: 'text-lg', padding: 'p-1' },
        md: { icon: 'h-5 w-5', text: 'text-2xl', padding: 'p-1.5' },
        lg: { icon: 'h-8 w-8', text: 'text-3xl', padding: 'p-2.5' }
    };

    const currentSize = sizeMap[size];

    return (
        <div className={cn("flex items-center gap-2 cursor-pointer", className)}>
            <div className={cn(
                "rounded-lg transition-colors",
                variant === 'primary' ? "bg-hive-primary" : "bg-white",
                currentSize.padding
            )}>
                <Hexagon className={cn(
                    currentSize.icon,
                    variant === 'primary' ? "text-white fill-white/20" : "text-hive-primary fill-hive-primary/20",
                    iconClassName
                )} />
            </div>
            {showText && (
                <span className={cn(
                    "font-black tracking-tight",
                    variant === 'primary' ? "text-hive-text-primary" : "text-white",
                    currentSize.text,
                    textClassName
                )}>
                    Hive
                </span>
            )}
        </div>
    );
};
