import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { cn } from '../../lib/utils';

export const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 sm:px-6 lg:px-8',
                isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'
            )}
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Logo />

                <div className="hidden md:flex items-center gap-8">
                    <a href="#" className="text-sm font-semibold text-hive-text-primary hover:text-hive-primary transition-colors">Events</a>
                    <a href="#" className="text-sm font-semibold text-hive-text-primary hover:text-hive-primary transition-colors">NGOs</a>
                    <a href="#" className="text-sm font-semibold text-hive-text-primary hover:text-hive-primary transition-colors">About</a>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Log In</Button>
                    <Button size="sm">Join Now</Button>
                </div>
            </div>
        </nav>
    );
};
