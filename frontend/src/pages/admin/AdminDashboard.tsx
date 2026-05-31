import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ComponentType } from 'react';
import {
    Users,
    Building2,
    CalendarDays,
    Clock,
    ShieldCheck,
    Activity,
    Filter,
    Search,
    UserCheck,
    Settings,
    LogOut,
    FileText,
    AlertTriangle
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell
} from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../lib/utils';
import { authService, API_URL } from '../../lib/auth';
import { adminService } from '../../lib/admin';
import { eventService } from '../../lib/events';
import { PlatformEventsCalendar } from '../../components/calendar/PlatformEventsCalendar';
import { crisisService } from '../../lib/crisis';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'ngos' | 'users' | 'audit' | 'crises'>('overview');
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<{
        type: 'approve' | 'reject' | 'suspend' | 'activate' | 'remove';
        target: string;
        id: string;
    } | null>(null);
    const [ngoRequests, setNgoRequests] = useState<any[]>([]);

    const [ngoFilter, setNgoFilter] = useState<'pending' | 'verified' | 'rejected'>('pending');
    const [platformStats, setPlatformStats] = useState<any>(null);
    const [platformEvents, setPlatformEvents] = useState<any[]>([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [adminUsers, setAdminUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [impactReports, setImpactReports] = useState<any[]>([]);
    const [activeCrises, setActiveCrises] = useState<any[]>([]);
    const [crisesLoading, setCrisesLoading] = useState(false);

    const fetchPlatformStats = async () => {
        try {
            const data = await adminService.getStats();
            setPlatformStats(data);
        } catch (error) {
            console.error('Failed to fetch platform stats:', error);
        }
    };

    const fetchPlatformEvents = async () => {
        try {
            setEventsLoading(true);
            const data = await eventService.getEvents();
            setPlatformEvents(data);
        } catch (error) {
            console.error('Failed to fetch platform events:', error);
        } finally {
            setEventsLoading(false);
        }
    };

    const fetchAdminUsers = async () => {
        try {
            setUsersLoading(true);
            const data = await adminService.getUsers();
            setAdminUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setUsersLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            setAuditLoading(true);
            const data = await adminService.getAuditLogs(100);
            setAuditLogs(data);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setAuditLoading(false);
        }
    };

    const fetchImpactReports = async () => {
        try {
            const data = await adminService.getOpenImpactReports();
            setImpactReports(data);
        } catch (error) {
            console.error('Failed to fetch impact reports:', error);
            setImpactReports([]);
        }
    };

    const fetchActiveCrises = async () => {
        try {
            setCrisesLoading(true);
            setActiveCrises(await crisisService.getAdminOverview());
        } catch (error) {
            console.error('Failed to fetch active crises:', error);
            setActiveCrises([]);
        } finally {
            setCrisesLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'ngos') {
            fetchNGOs();
        } else if (activeTab === 'overview') {
            fetchPlatformStats();
            fetchPlatformEvents();
            fetchAuditLogs();
        } else if (activeTab === 'audit') {
            fetchAuditLogs();
            fetchImpactReports();
        } else if (activeTab === 'users') {
            fetchAdminUsers();
        } else if (activeTab === 'crises') {
            fetchActiveCrises();
        }
    }, [activeTab, ngoFilter]);

    useEffect(() => {
        fetchNGOs('pending');
        fetchPlatformStats();
        fetchPlatformEvents();
        fetchAuditLogs();
        fetchImpactReports();
        fetchActiveCrises();
    }, []);

    const fetchNGOs = async (statusOverride?: string) => {
        try {
            const status = statusOverride || ngoFilter;
            const data = await adminService.getNGOs(status);
            setNgoRequests(data);
        } catch (error) {
            console.error('Failed to fetch NGOs:', error);
        }
    };

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const openConfirm = (
        type: 'approve' | 'reject' | 'suspend' | 'activate' | 'remove',
        target: string,
        id: string
    ) => {
        setSelectedAction({ type, target, id });
        setIsConfirmModalOpen(true);
    };

    const handleConfirmAction = async () => {
        if (!selectedAction) return;

        try {
            if (selectedAction.type === 'approve') {
                await adminService.updateNGOStatus(selectedAction.id, 'verified');
                fetchNGOs();
            } else if (selectedAction.type === 'reject') {
                await adminService.updateNGOStatus(selectedAction.id, 'rejected');
                fetchNGOs();
            } else if (selectedAction.type === 'suspend') {
                await adminService.updateUserAccountStatus(selectedAction.id, 'suspended');
                fetchAdminUsers();
                fetchPlatformStats();
            } else if (selectedAction.type === 'activate') {
                await adminService.updateUserAccountStatus(selectedAction.id, 'active');
                fetchAdminUsers();
            } else if (selectedAction.type === 'remove') {
                await adminService.removeUser(selectedAction.id);
                fetchAdminUsers();
                fetchPlatformStats();
            }
            if (activeTab === 'audit' || selectedAction.type !== 'approve') {
                fetchAuditLogs();
            }
        } catch (error) {
            console.error('Failed to perform admin action:', error);
        }
        setIsConfirmModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-hive-background flex flex-col lg:flex-row">
            {/* Sidebar - Desktop */}
            <aside className="w-full lg:w-64 bg-white border-r border-slate-100 flex-shrink-0">
                <div className="h-20 flex items-center px-6 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Logo size="sm" />
                        <span className="text-[10px] font-bold text-hive-primary ml-auto px-1.5 py-0.5 bg-hive-primary/10 rounded tracking-widest uppercase">Admin</span>
                    </div>
                </div>
                <nav className="p-4 space-y-1">
                    <SidebarLink icon={Activity} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                    <SidebarLink icon={Building2} label="NGO Approvals" active={activeTab === 'ngos'} onClick={() => setActiveTab('ngos')} badge={ngoRequests.length.toString()} />
                    <SidebarLink icon={Users} label="User Roles" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                    <SidebarLink icon={ShieldCheck} label="Audit Log" active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} />
                    <SidebarLink icon={AlertTriangle} label="Active Crises" active={activeTab === 'crises'} onClick={() => setActiveTab('crises')} badge={activeCrises.length ? String(activeCrises.length) : undefined} />
                    <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
                        <SidebarLink icon={Settings} label="System Config" active={false} />
                        <SidebarLink
                            icon={LogOut}
                            label="Logout"
                            active={false}
                            onClick={handleLogout}
                            className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        />
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto">
                {/* Header */}
                <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-30">
                    <h2 className="text-xl font-bold text-hive-text-primary capitalize">{activeTab} Dashboard</h2>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold text-hive-text-secondary uppercase">All Systems Optimal</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shadow-sm">
                            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=100&h=100&q=80" alt="Admin" />
                        </div>
                    </div>
                </header>

                <div className="p-6 space-y-8 max-w-7xl mx-auto">
                    {activeTab === 'overview' && (
                        <>
                            {/* Stats Grid */}
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    {
                                        label: 'Volunteers',
                                        value: platformStats?.volunteers ?? '—',
                                        icon: Users,
                                        color: 'text-blue-600',
                                        bg: 'bg-blue-50'
                                    },
                                    {
                                        label: 'Verified NGOs',
                                        value: platformStats?.verifiedNgos ?? '—',
                                        icon: Building2,
                                        color: 'text-hive-primary',
                                        bg: 'bg-hive-primary/10',
                                        sub: `${platformStats?.pendingNgos ?? 0} pending`
                                    },
                                    {
                                        label: 'Active Events',
                                        value: platformStats?.activeEvents ?? '—',
                                        icon: CalendarDays,
                                        color: 'text-teal-600',
                                        bg: 'bg-teal-50',
                                        sub: `${platformStats?.totalEvents ?? 0} total`
                                    }
                                ].map((stat, i) => (
                                    <Card key={i} className="border-slate-100 group hover:border-hive-primary/20 transition-all">
                                        <CardContent className="p-6 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className={cn('p-2 rounded-lg', stat.bg)}>
                                                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-black text-hive-text-primary">{stat.value}</p>
                                                <p className="text-xs font-bold text-hive-text-secondary uppercase tracking-tight">{stat.label}</p>
                                                {'sub' in stat && stat.sub && (
                                                    <p className="text-[10px] text-hive-text-secondary mt-1">{stat.sub}</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="grid lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2">
                                    {eventsLoading ? (
                                        <Card className="border-slate-100 p-12 text-center text-sm text-hive-text-secondary">
                                            Loading events calendar…
                                        </Card>
                                    ) : (
                                        <PlatformEventsCalendar events={platformEvents} />
                                    )}
                                </div>

                                {/* Recent Activity Log */}
                                <Card className="border-slate-100">
                                    <CardContent className="p-6 space-y-6">
                                        <h3 className="font-bold text-hive-text-primary flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-hive-primary" /> Recent Activity
                                        </h3>
                                        <div className="space-y-6">
                                            {auditLogs.length === 0 ? (
                                                <p className="text-xs text-hive-text-secondary">No recent audit activity.</p>
                                            ) : (
                                                auditLogs.slice(0, 6).map((log, i) => (
                                                    <div key={log._id} className="flex gap-4 relative">
                                                        {i !== Math.min(auditLogs.length, 6) - 1 && (
                                                            <div className="absolute left-[11px] top-6 w-0.5 h-10 bg-slate-100" />
                                                        )}
                                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-sm">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-hive-primary" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-xs leading-relaxed">
                                                                <span className="font-bold text-hive-text-primary">{log.actorName}</span>
                                                                <span className="text-hive-text-secondary mx-1">
                                                                    {log.action.replace(/_/g, ' ')}
                                                                </span>
                                                            </p>
                                                            <p className="text-[10px] text-hive-text-secondary font-medium">
                                                                {new Date(log.createdAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setActiveTab('audit')}>View full audit log</Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}

                    {activeTab === 'ngos' && (
                        <Card className="border-slate-100">
                            <CardContent className="p-0">
                                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                                    <div className="flex gap-2">
                                        {(['pending', 'verified', 'rejected'] as const).map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => setNgoFilter(status)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors",
                                                    ngoFilter === status
                                                        ? "bg-hive-primary text-white"
                                                        : "bg-slate-50 text-hive-text-secondary hover:bg-slate-100"
                                                )}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" /> Filters</Button>
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50">
                                            <TableHead>Organization</TableHead>
                                            <TableHead>Registration Date</TableHead>
                                            <TableHead>Verification</TableHead>
                                            <TableHead className="text-right">Operations</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ngoRequests.map(ngo => (
                                            <TableRow key={ngo._id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-hive-primary/10 flex items-center justify-center">
                                                            <Building2 className="h-4 w-4 text-hive-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-hive-text-primary">{ngo.name}</p>
                                                            <p className="text-xs text-hive-text-secondary">{ngo.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium text-hive-text-secondary">
                                                    {new Date(ngo.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn(
                                                        "text-[10px] capitalize",
                                                        ngoFilter === 'pending' && "bg-amber-50 text-amber-600 border-amber-100",
                                                        ngoFilter === 'verified' && "bg-green-50 text-green-600 border-green-100",
                                                        ngoFilter === 'rejected' && "bg-rose-50 text-rose-600 border-rose-100",
                                                    )}>
                                                        {ngoFilter}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {ngo.verificationDocument && (
                                                            <a
                                                                href={`${API_URL.replace('/api', '')}/${ngo.verificationDocument}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center justify-center h-8 w-8 text-hive-text-secondary hover:text-hive-primary hover:bg-hive-primary/5 rounded-lg transition-colors mr-2"
                                                                title="View Document"
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                            </a>
                                                        )}
                                                        {ngoFilter !== 'verified' && (
                                                            <Button
                                                                size="sm"
                                                                className="text-xs px-4"
                                                                onClick={() => openConfirm('approve', ngo.name, ngo._id)}
                                                            >
                                                                Approve
                                                            </Button>
                                                        )}

                                                        {ngoFilter !== 'rejected' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-xs text-rose-500 border-rose-200 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                                                                onClick={() => openConfirm('reject', ngo.name, ngo._id)}
                                                            >
                                                                Reject
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'users' && (
                        <Card className="border-slate-100">
                            <CardContent className="p-0">
                                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-hive-text-secondary" />
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-hive-primary/20 focus:border-hive-primary"
                                        />
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50">
                                            <TableHead>User Profile</TableHead>
                                            <TableHead>System Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {usersLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-hive-text-secondary">
                                                    Loading users…
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            adminUsers
                                                .filter((u) => {
                                                    const q = userSearch.toLowerCase();
                                                    if (!q) return true;
                                                    return (
                                                        u.name?.toLowerCase().includes(q) ||
                                                        u.email?.toLowerCase().includes(q) ||
                                                        u.role?.toLowerCase().includes(q)
                                                    );
                                                })
                                                .map((u) => (
                                                    <TableRow key={u._id}>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-bold text-sm text-hive-text-primary">{u.name}</p>
                                                                <p className="text-xs text-hive-text-secondary">{u.email}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-hive-text-secondary capitalize">
                                                                {u.role === 'admin' ? (
                                                                    <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
                                                                ) : (
                                                                    <UserCheck className="h-3.5 w-3.5 text-hive-primary" />
                                                                )}
                                                                {u.role}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {u.accountStatus === 'suspended' ? (
                                                                <Badge className="text-[10px] bg-rose-50 text-rose-600 border-rose-100">
                                                                    Suspended
                                                                </Badge>
                                                            ) : (
                                                                <Badge
                                                                    variant={
                                                                        u.role === 'ngo' &&
                                                                        u.verificationStatus === 'rejected'
                                                                            ? 'gray'
                                                                            : 'success'
                                                                    }
                                                                    className={cn(
                                                                        'text-[10px] capitalize',
                                                                        u.role === 'ngo' &&
                                                                            u.verificationStatus === 'pending' &&
                                                                            'bg-amber-50 text-amber-600 border-amber-100',
                                                                        u.role === 'ngo' &&
                                                                            u.verificationStatus === 'rejected' &&
                                                                            'bg-rose-50 text-rose-600 border-rose-100'
                                                                    )}
                                                                >
                                                                    {u.role === 'ngo'
                                                                        ? u.verificationStatus
                                                                        : 'active'}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-hive-text-secondary font-medium">
                                                            {new Date(u.createdAt).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {u.role === 'admin' ? (
                                                                <span className="text-xs text-slate-400">—</span>
                                                            ) : (
                                                                <div className="flex justify-end gap-1 flex-wrap">
                                                                    {u.accountStatus === 'suspended' ? (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="text-xs"
                                                                            onClick={() =>
                                                                                openConfirm('activate', u.name, u._id)
                                                                            }
                                                                        >
                                                                            Activate
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="text-xs text-amber-700 border-amber-200"
                                                                            onClick={() =>
                                                                                openConfirm('suspend', u.name, u._id)
                                                                            }
                                                                        >
                                                                            Suspend
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                                                                        onClick={() =>
                                                                            openConfirm('remove', u.name, u._id)
                                                                        }
                                                                    >
                                                                        Remove
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'crises' && (
                        <Card className="border-slate-100">
                            <CardContent className="p-0">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-hive-text-primary">National crisis oversight</h3>
                                        <p className="text-xs text-hive-text-secondary mt-1">
                                            Active and stand-down emergency missions across the platform.
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={fetchActiveCrises} disabled={crisesLoading}>
                                        Refresh
                                    </Button>
                                </div>
                                {crisesLoading ? (
                                    <p className="p-8 text-center text-sm text-hive-text-secondary">Loading crises…</p>
                                ) : activeCrises.length === 0 ? (
                                    <p className="p-8 text-center text-sm text-hive-text-secondary">No active crises.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Mission</TableHead>
                                                <TableHead>NGO</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Deployed</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activeCrises.map((c: any) => (
                                                <TableRow key={c._id}>
                                                    <TableCell className="font-bold">{c.title}</TableCell>
                                                    <TableCell>{c.ngoName || c.organization?.name}</TableCell>
                                                    <TableCell className="capitalize">{c.crisis?.crisisStatus}</TableCell>
                                                    <TableCell>{c.analytics?.volunteersDeployed ?? 0}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => navigate(`/ngo-mission/${c._id}`)}
                                                        >
                                                            Command center
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'audit' && (
                        <div className="space-y-6">
                        <Card className="border-slate-100">
                            <CardContent className="p-0">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-hive-text-primary">Impact moderation queue</h3>
                                        <p className="text-xs text-hive-text-secondary mt-1">
                                            Open reports from the community feed. Resolve hides the reported content.
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={fetchImpactReports}>
                                        Refresh
                                    </Button>
                                </div>
                                {impactReports.length === 0 ? (
                                    <p className="p-8 text-center text-sm text-hive-text-secondary">No open impact reports.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/50">
                                                <TableHead>When</TableHead>
                                                <TableHead>Reporter</TableHead>
                                                <TableHead>Target</TableHead>
                                                <TableHead>Reason</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {impactReports.map((r) => (
                                                <TableRow key={r._id}>
                                                    <TableCell className="text-xs text-hive-text-secondary">
                                                        {new Date(r.createdAt).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="text-sm font-bold text-hive-text-primary">{r.reporter?.name}</p>
                                                        <p className="text-[10px] text-hive-text-secondary uppercase">{r.reporter?.role}</p>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-hive-text-secondary max-w-[140px]">
                                                        <span className="capitalize">{r.targetType?.replace('_', ' ')}</span>
                                                        <p className="font-medium text-hive-text-primary truncate">
                                                            {r.targetLabel || String(r.targetId).slice(-8)}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-hive-text-secondary max-w-[160px] truncate">
                                                        {r.reason || '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="text-[10px] capitalize">{r.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2 flex-wrap">
                                                            {(r.targetType === 'impact_post' || r.postId) && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                    onClick={() =>
                                                                        navigate(
                                                                            `/impact-feed?focus=${r.postId || r.targetId}`
                                                                        )
                                                                    }
                                                                >
                                                                    View
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-xs"
                                                                onClick={async () => {
                                                                    await adminService.resolveImpactReport(r._id, 'resolved');
                                                                    fetchImpactReports();
                                                                }}
                                                            >
                                                                Resolve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-xs"
                                                                onClick={async () => {
                                                                    await adminService.resolveImpactReport(r._id, 'dismissed');
                                                                    fetchImpactReports();
                                                                }}
                                                            >
                                                                Dismiss
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="border-slate-100">
                            <CardContent className="p-0">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-hive-text-primary">Audit log</h3>
                                        <p className="text-xs text-hive-text-secondary mt-1">
                                            NGO status changes, user suspend/remove, comment deletes, and event deletions.
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={auditLoading}>
                                        Refresh
                                    </Button>
                                </div>
                                {auditLoading ? (
                                    <p className="p-8 text-center text-sm text-hive-text-secondary">Loading audit entries…</p>
                                ) : auditLogs.length === 0 ? (
                                    <p className="p-8 text-center text-sm text-hive-text-secondary">No audit entries yet.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/50">
                                                <TableHead>When</TableHead>
                                                <TableHead>Actor</TableHead>
                                                <TableHead>Action</TableHead>
                                                <TableHead>Target</TableHead>
                                                <TableHead>Payload hash</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {auditLogs.map((log) => (
                                                <TableRow key={log._id}>
                                                    <TableCell className="text-xs text-hive-text-secondary whitespace-nowrap">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="text-sm font-bold text-hive-text-primary">{log.actorName}</p>
                                                        <p className="text-[10px] text-hive-text-secondary uppercase">{log.actorRole}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="text-[10px] capitalize">{log.action.replace(/_/g, ' ')}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono text-hive-text-secondary">
                                                        {log.targetType}:{String(log.targetId).slice(-8)}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] font-mono text-hive-text-secondary max-w-[140px] truncate" title={log.payloadHash}>
                                                        {log.payloadHash.slice(0, 12)}…
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                        </div>
                    )}
                </div>
            </main>

            {/* Confirmation Modal */}
            <Modal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                title={
                    selectedAction?.type === 'approve'
                        ? 'Approve NGO Registration'
                        : selectedAction?.type === 'reject'
                          ? 'Reject NGO Application'
                          : selectedAction?.type === 'suspend'
                            ? 'Suspend Account'
                            : selectedAction?.type === 'activate'
                              ? 'Activate Account'
                              : selectedAction?.type === 'remove'
                                ? 'Remove Account'
                                : 'Confirm Action'
                }
                footer={
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                        <Button
                            className={cn(
                                (selectedAction?.type === 'suspend' ||
                                    selectedAction?.type === 'reject' ||
                                    selectedAction?.type === 'remove') &&
                                    'bg-rose-500 hover:bg-rose-600'
                            )}
                            onClick={handleConfirmAction}
                        >
                            Confirm
                        </Button>
                    </div>
                }
            >
                <div className="p-1 space-y-4">
                    <p className="text-sm text-hive-text-secondary leading-relaxed">
                        You are about to{' '}
                        <span className="font-bold text-hive-text-primary">{selectedAction?.type}</span>{' '}
                        <span className="font-bold text-hive-text-primary">{selectedAction?.target}</span>.
                        {selectedAction?.type === 'approve'
                            ? ' This will grant them permission to create and manage volunteering events on the platform.'
                            : selectedAction?.type === 'reject'
                              ? ' They will not be able to log in until approved again.'
                              : selectedAction?.type === 'suspend'
                                ? ' They will be blocked from logging in and using the platform until reactivated.'
                                : selectedAction?.type === 'activate'
                                  ? ' They will regain access to the platform.'
                                  : selectedAction?.type === 'remove'
                                    ? ' This permanently deletes their account. NGO accounts also delete all hosted events.'
                                    : ' This will immediately affect their access to platform features.'}
                    </p>
                    <div className="p-3 bg-amber-50 rounded-lg flex gap-3 text-xs text-amber-700 font-medium border border-amber-100">
                        <Activity className="h-4 w-4 shrink-0" />
                        This action will be recorded in the system audit logs.
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function SidebarLink({ icon: Icon, label, active, onClick, badge, className }: {
    icon: ComponentType<LucideProps>,
    label: string,
    active: boolean,
    onClick?: () => void,
    badge?: string,
    className?: string
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all group",
                active
                    ? "bg-hive-primary text-white shadow-md shadow-hive-primary/20"
                    : "text-hive-text-secondary hover:bg-slate-50 hover:text-hive-text-primary",
                className
            )}
        >
            <div className="flex items-center gap-3">
                <Icon className={cn("h-4 w-4", active ? "text-white" : "text-hive-text-secondary group-hover:text-hive-primary")} />
                <span className="text-sm font-bold tracking-tight">{label}</span>
            </div>
            {badge && (
                <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[10px] font-black",
                    active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                )}>
                    {badge}
                </span>
            )}
        </button>
    );
}
