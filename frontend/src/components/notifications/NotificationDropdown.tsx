import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Clock } from 'lucide-react';
import { notificationService } from '../../lib/notifications';
import { cn } from '../../lib/utils';

export function NotificationDropdown() {
    const navigate = useNavigate();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.isRead).length);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            clearInterval(interval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleNotificationClick = (n: any) => {
        markAsRead(n._id);
        if (n.impactPost) {
            const postId = typeof n.impactPost === 'string' ? n.impactPost : n.impactPost._id;
            if (postId) {
                navigate(`/impact-feed?focus=${postId}`);
                setShowNotifications(false);
                return;
            }
        }
        if (n.event?._id) {
            navigate(`/event/${n.event._id}`);
            setShowNotifications(false);
            return;
        }
        if (n.type?.startsWith('crisis_')) {
            navigate('/crisis');
            setShowNotifications(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                    'p-2 text-hive-text-secondary hover:bg-slate-50 rounded-lg transition-colors relative',
                    showNotifications && 'bg-slate-100 text-hive-primary'
                )}
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[8px] h-2 px-0.5 bg-rose-500 rounded-full border border-white" />
                )}
            </button>

            {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                    <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={markAllRead}
                                className="text-[10px] font-bold text-hive-primary hover:underline uppercase tracking-wider"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-[400px] overflow-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                <p className="text-xs text-slate-400">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {notifications.map((n) => (
                                    <div
                                        key={n._id}
                                        role="button"
                                        tabIndex={0}
                                        className={cn(
                                            'p-4 hover:bg-slate-50 transition-colors cursor-pointer relative text-left w-full',
                                            !n.isRead && 'bg-blue-50/30'
                                        )}
                                        onClick={() => handleNotificationClick(n)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleNotificationClick(n);
                                        }}
                                    >
                                        {!n.isRead && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-hive-primary" />
                                        )}
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-hive-primary/10 flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="h-4 w-4 text-hive-primary" />
                                            </div>
                                            <div className="space-y-1 min-w-0">
                                                <p className="text-xs text-slate-900 leading-relaxed">
                                                    {n.message}
                                                </p>
                                                {n.event?.title && (
                                                    <p className="text-[10px] font-bold text-hive-primary truncate">
                                                        {n.event.title}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(n.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
