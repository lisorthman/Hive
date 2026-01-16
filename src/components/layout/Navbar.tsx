import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Hexagon } from 'lucide-react';
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
                <div className="flex items-center gap-2 cursor-pointer">
                    <div className="bg-hive-primary p-1.5 rounded-lg">
                        <Hexagon className="h-6 w-6 text-white fill-white/20" />
                    </div>
                    <span className="text-2xl font-black text-hive-text-primary tracking-tight">Hive</span>
                </div>

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
