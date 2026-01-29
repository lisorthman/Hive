import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ComponentType } from 'react';
import {
    Users,
    Building2,
    CalendarDays,
    Clock,
    CheckCircle2,
    XCircle,
    ShieldCheck,
    Activity,
    ArrowUpRight,
    Filter,
    Search,
    UserCheck,
    Ban,
    Settings,
    LogOut
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
import { authService } from '../../lib/auth';

// Dummy Data for Admin View
const STATS = [
    { label: 'Total Users', value: '1,284', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', change: '+12% this month' },
    { label: 'Verified NGOs', value: '42', icon: Building2, color: 'text-hive-primary', bg: 'bg-hive-primary/10', change: '+3 new requests' },
    { label: 'Active Events', value: '156', icon: CalendarDays, color: 'text-teal-600', bg: 'bg-teal-50', change: '+8 today' },
    { label: 'System Health', value: '99.9%', icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50', change: 'All systems go' },
];

const NGO_REQUESTS = [
    { id: 'NGO-001', name: 'Global Green Initiative', contact: 'sarah@globalgreen.org', status: 'Pending', date: '2024-10-15' },
    { id: 'NGO-002', name: 'Code for Community', contact: 'dev@codecomm.io', status: 'Pending', date: '2024-10-16' },
    { id: 'NGO-003', name: 'Urban Food Bank', contact: 'logistics@urbanfood.org', status: 'Pending', date: '2024-10-16' },
];

const USERS = [
    { name: 'Alex Thompson', email: 'alex.t@example.com', role: 'Volunteer', status: 'Active', joined: 'Oct 2024' },
    { name: 'Maria Garcia', email: 'm.garcia@greencity.ngo', role: 'NGO Admin', status: 'Active', joined: 'Sep 2024' },
    { name: 'David Chen', email: 'd.chen@example.com', role: 'Volunteer', status: 'Suspended', joined: 'Aug 2024' },
    { name: 'Sarah Wilson', email: 'sarah.admin@hive.com', role: 'Admin', status: 'Active', joined: 'Jan 2024' },
];

const RECENT_ACTIVITY = [
    { user: 'GreenCity', action: 'Published new event', target: 'Beach Cleanup', time: '2 mins ago' },
    { user: 'Admin Sarah', action: 'Approved NGO', target: 'Water First', time: '15 mins ago' },
    { user: 'System', action: 'Auto-archived event', target: 'Past Charity Run', time: '1 hour ago' },
    { user: 'Alex T.', action: 'Joined event', target: 'Urban Reforest', time: '2 hours ago' },
];

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'ngos' | 'users'>('overview');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<{ type: 'approve' | 'suspend', target: string } | null>(null);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const openConfirm = (type: 'approve' | 'suspend', target: string) => {
        setSelectedAction({ type, target });
        setIsConfirmModalOpen(true);
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
                    <SidebarLink icon={Building2} label="NGO Approvals" active={activeTab === 'ngos'} onClick={() => setActiveTab('ngos')} badge="3" />
                    <SidebarLink icon={Users} label="User Roles" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                    <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
                        <SidebarLink icon={Settings} label="System Config" active={false} />
                        <SidebarLink icon={ShieldCheck} label="Security Logs" active={false} />
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
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {STATS.map((stat, i) => (
                                    <Card key={i} className="border-slate-100 group hover:border-hive-primary/20 transition-all">
                                        <CardContent className="p-6 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className={cn("p-2 rounded-lg", stat.bg)}>
                                                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                                                </div>
                                                <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                                                    <ArrowUpRight className="h-3 w-3" /> {stat.change.split(' ')[0]}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-black text-hive-text-primary">{stat.value}</p>
                                                <p className="text-xs font-bold text-hive-text-secondary uppercase tracking-tight">{stat.label}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="grid lg:grid-cols-3 gap-6">
                                {/* NGO Approval Quick View */}
                                <Card className="lg:col-span-2 border-slate-100">
                                    <CardContent className="p-0">
                                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                                            <h3 className="font-bold text-hive-text-primary">New NGO Requests</h3>
                                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveTab('ngos')}>View All</Button>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/50">
                                                    <TableHead>Organization</TableHead>
                                                    <TableHead>Submitted</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {NGO_REQUESTS.map((req) => (
                                                    <TableRow key={req.id}>
                                                        <TableCell>
                                                            <p className="font-bold text-hive-text-primary">{req.name}</p>
                                                            <p className="text-[10px] text-hive-text-secondary">{req.contact}</p>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-hive-text-secondary font-medium">{req.date}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-100 text-[10px]">Pending</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => openConfirm('approve', req.name)}
                                                                    className="p-1.5 text-hive-primary hover:bg-hive-primary/10 rounded-md transition-colors"
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                </button>
                                                                <button className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors">
                                                                    <XCircle className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                {/* Recent Activity Log */}
                                <Card className="border-slate-100">
                                    <CardContent className="p-6 space-y-6">
                                        <h3 className="font-bold text-hive-text-primary flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-hive-primary" /> Recent Activity
                                        </h3>
                                        <div className="space-y-6">
                                            {RECENT_ACTIVITY.map((act, i) => (
                                                <div key={i} className="flex gap-4 relative">
                                                    {i !== RECENT_ACTIVITY.length - 1 && (
                                                        <div className="absolute left-[11px] top-6 w-0.5 h-10 bg-slate-100" />
                                                    )}
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-sm">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-hive-primary" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs leading-none">
                                                            <span className="font-bold text-hive-text-primary">{act.user}</span>
                                                            <span className="text-hive-text-secondary mx-1">{act.action}</span>
                                                            <span className="font-bold text-hive-primary">{act.target}</span>
                                                        </p>
                                                        <p className="text-[10px] text-hive-text-secondary font-medium">{act.time}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <Button variant="outline" size="sm" className="w-full text-xs">Download Full Audit Log</Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}

                    {activeTab === 'ngos' && (
                        <Card className="border-slate-100">
                            <CardContent className="p-0">
                                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-hive-text-secondary" />
                                        <input
                                            type="text"
                                            placeholder="Search organizations..."
                                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-hive-primary/20 focus:border-hive-primary"
                                        />
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
                                        {NGO_REQUESTS.map(ngo => (
                                            <TableRow key={ngo.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-hive-primary/10 flex items-center justify-center">
                                                            <Building2 className="h-4 w-4 text-hive-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-hive-text-primary">{ngo.name}</p>
                                                            <p className="text-xs text-hive-text-secondary">{ngo.contact}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium text-hive-text-secondary">{ngo.date}</TableCell>
                                                <TableCell>
                                                    <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-[10px]">Action Required</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button size="sm" className="text-xs px-4" onClick={() => openConfirm('approve', ngo.name)}>Approve</Button>
                                                        <Button variant="outline" size="sm" className="text-xs text-rose-500 hover:text-rose-600">Reject</Button>
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
                                        {USERS.map((user, i) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-bold text-sm text-hive-text-primary">{user.name}</p>
                                                        <p className="text-xs text-hive-text-secondary">{user.email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-hive-text-secondary">
                                                        {user.role === 'Admin' ? <ShieldCheck className="h-3.5 w-3.5 text-purple-500" /> : <UserCheck className="h-3.5 w-3.5 text-hive-primary" />}
                                                        {user.role}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={user.status === 'Active' ? 'success' : 'gray'}
                                                        className={cn("text-[10px]", user.status === 'Suspended' && "bg-rose-50 text-rose-600 border-rose-100")}
                                                    >
                                                        {user.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-hive-text-secondary font-medium">{user.joined}</TableCell>
                                                <TableCell className="text-right">
                                                    {user.role !== 'Admin' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={cn("text-xs font-bold", user.status === 'Active' ? "text-rose-500" : "text-hive-primary")}
                                                            onClick={() => openConfirm('suspend', user.name)}
                                                        >
                                                            {user.status === 'Active' ? <Ban className="h-4 w-4 mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                                                            {user.status === 'Active' ? 'Suspend' : 'Activate'}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>

            {/* Confirmation Modal */}
            <Modal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                title={selectedAction?.type === 'approve' ? 'Approve NGO Registration' : 'Update User Status'}
                footer={
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                        <Button
                            className={cn(selectedAction?.type === 'suspend' && "bg-rose-500 hover:bg-rose-600")}
                            onClick={() => setIsConfirmModalOpen(false)}
                        >
                            Confirm Action
                        </Button>
                    </div>
                }
            >
                <div className="p-1 space-y-4">
                    <p className="text-sm text-hive-text-secondary leading-relaxed">
                        You are about to {selectedAction?.type} <span className="font-bold text-hive-text-primary">{selectedAction?.target}</span>.
                        {selectedAction?.type === 'approve'
                            ? ' This will grant them permission to create and manage volunteering events on the platform.'
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
