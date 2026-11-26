import { Fragment, useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
    AlertTriangle,
    Ban,
    ChevronDown,
    ChevronRight,
    FileWarning,
    KeyRound,
    Link2,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    ShieldX,
    Timer
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { cn } from '../../lib/utils';
import {
    adminService,
    SECURITY_EVENT_TYPES
} from '../../lib/admin';
import type {
    ChainVerification,
    SecurityAlert,
    SecurityEvent,
    SecurityEventFilters,
    SecurityOutcome,
    SecuritySeverity,
    SecuritySummary
} from '../../lib/admin';

/**
 * R5 – Security monitoring panel (Policy §8.3.6 alerting, §8.3.7 review).
 * Read-only view of the security event log: there are deliberately no edit/delete controls.
 */

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'gray';

const SEVERITY_VARIANT: Record<SecuritySeverity, BadgeVariant> = {
    info: 'gray',
    low: 'secondary',
    medium: 'warning',
    high: 'error',
    critical: 'error'
};

const OUTCOME_VARIANT: Record<SecurityOutcome, BadgeVariant> = {
    success: 'success',
    failure: 'warning',
    denied: 'error'
};

const ALERT_KIND_LABEL: Record<SecurityAlert['kind'], string> = {
    brute_force_account: 'Brute force – account',
    brute_force_ip: 'Brute force – IP address',
    log_integrity_failure: 'Log integrity failure'
};

const PROBLEM_LABEL: Record<string, string> = {
    hash_mismatch: 'Record edited (hash mismatch)',
    broken_link: 'Chain link broken (record edited and re-hashed)',
    seq_gap: 'Records deleted (sequence gap)',
    missing_oldest_records: 'Oldest records deleted before retention age',
    audit_entry_missing: 'Mirrored audit entry deleted',
    audit_entry_modified: 'Mirrored audit entry changed'
};

const label = (value: string) => value.replace(/_/g, ' ');
const formatTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : '—');

const EMPTY_FILTERS: SecurityEventFilters = { type: '', outcome: '', ip: '', email: '' };

interface SecurityMonitorPanelProps {
    onOpenAlertsChange?: (count: number) => void;
}

export function SecurityMonitorPanel({ onOpenAlertsChange }: SecurityMonitorPanelProps) {
    const [summary, setSummary] = useState<SecuritySummary | null>(null);
    const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
    const [showAcknowledged, setShowAcknowledged] = useState(false);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [ackBusy, setAckBusy] = useState<string | null>(null);

    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [nextBefore, setNextBefore] = useState<number | null>(null);
    const [filters, setFilters] = useState<SecurityEventFilters>(EMPTY_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState<SecurityEventFilters>(EMPTY_FILTERS);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);

    const [verification, setVerification] = useState<ChainVerification | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadOverview = useCallback(async () => {
        try {
            const [s, a] = await Promise.all([
                adminService.getSecuritySummary(),
                adminService.getSecurityAlerts()
            ]);
            setSummary(s);
            setAlerts(a);
            onOpenAlertsChange?.(s.openAlerts);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load security data');
        }
    }, [onOpenAlertsChange]);

    const loadEvents = useCallback(async (applied: SecurityEventFilters, before?: number) => {
        try {
            setEventsLoading(true);
            const page = await adminService.getSecurityEvents({ ...applied, before, limit: 50 });
            setEvents((prev) => (before ? [...prev, ...page.data] : page.data));
            setNextBefore(page.nextBefore);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load security events');
        } finally {
            setEventsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadOverview();
            loadEvents(EMPTY_FILTERS);
        }, 0);
        return () => clearTimeout(timer);
    }, [loadOverview, loadEvents]);

    const refreshAll = () => {
        setError(null);
        loadOverview();
        loadEvents(appliedFilters);
    };

    const applyFilters = (e: FormEvent) => {
        e.preventDefault();
        setAppliedFilters(filters);
        loadEvents(filters);
    };

    const clearFilters = () => {
        setFilters(EMPTY_FILTERS);
        setAppliedFilters(EMPTY_FILTERS);
        loadEvents(EMPTY_FILTERS);
    };

    const acknowledge = async (alert: SecurityAlert) => {
        try {
            setAckBusy(alert._id);
            await adminService.acknowledgeSecurityAlert(alert._id, notes[alert._id] || '');
            setNotes((prev) => ({ ...prev, [alert._id]: '' }));
            await loadOverview();
            await loadEvents(appliedFilters);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not acknowledge alert');
        } finally {
            setAckBusy(null);
        }
    };

    const verify = async () => {
        try {
            setVerifying(true);
            setVerification(await adminService.verifySecurityLog());
            await loadOverview();
            await loadEvents(appliedFilters);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Integrity check failed to run');
        } finally {
            setVerifying(false);
        }
    };

    const count = (...types: (keyof SecuritySummary['last24h'])[]) =>
        types.reduce((sum, t) => sum + (summary?.last24h[t] ?? 0), 0);

    const visibleAlerts = alerts.filter((a) => showAcknowledged || a.status === 'open');
    const openAlerts = summary?.openAlerts ?? 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold text-hive-text-primary">Security monitoring</h3>
                    <p className="text-xs text-hive-text-secondary mt-1">
                        Tamper-evident security event log, brute-force alerts and integrity checks
                        {summary ? ` · ${summary.totalEvents} events kept for ${summary.retentionDays} days` : ''}.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={refreshAll}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
            </div>

            {error && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 flex items-start justify-between gap-3">
                    <span>{error}</span>
                    <button className="text-xs font-bold" onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            {/* Last 24 hours */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <StatCard icon={KeyRound} label="Failed logins" value={count('login_failure')} />
                <StatCard icon={Ban} label="Denied logins" value={count('login_denied')} />
                <StatCard icon={ShieldX} label="Refused requests" value={count('auth_required', 'access_denied')} />
                <StatCard icon={FileWarning} label="Rejected uploads" value={count('upload_rejected')} />
                <StatCard icon={Timer} label="Rate limited / locked" value={count('rate_limited', 'account_locked')} />
                <StatCard icon={ShieldAlert} label="Open alerts" value={openAlerts} alert={openAlerts > 0} />
            </div>
            <p className="text-[11px] text-hive-text-secondary -mt-3">Counts cover the last 24 hours.</p>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Alerts */}
                <Card className="lg:col-span-2 border-slate-100" padding="none">
                    <CardContent>
                        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h4 className="font-bold text-hive-text-primary">Security alerts</h4>
                                <p className="text-xs text-hive-text-secondary mt-1">
                                    Review and acknowledge each alert within 24 hours (Policy §8.3.7).
                                </p>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-hive-text-secondary">
                                <input
                                    type="checkbox"
                                    checked={showAcknowledged}
                                    onChange={(e) => setShowAcknowledged(e.target.checked)}
                                />
                                Show acknowledged
                            </label>
                        </div>
                        {visibleAlerts.length === 0 ? (
                            <p className="p-8 text-center text-sm text-hive-text-secondary">No {showAcknowledged ? '' : 'open '}alerts.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {visibleAlerts.map((alert) => (
                                    <li key={alert._id} className="p-5 space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <AlertTriangle className={cn('h-4 w-4', alert.status === 'open' ? 'text-red-500' : 'text-slate-400')} />
                                            <span className="font-bold text-sm text-hive-text-primary">{ALERT_KIND_LABEL[alert.kind]}</span>
                                            <Badge variant={SEVERITY_VARIANT[alert.severity]} className="uppercase">{alert.severity}</Badge>
                                            <Badge variant={alert.status === 'open' ? 'error' : 'success'}>{alert.status}</Badge>
                                        </div>
                                        <p className="text-sm text-hive-text-primary">{alert.message}</p>
                                        <p className="text-xs text-hive-text-secondary">
                                            Key <span className="font-mono">{alert.key}</span> · {alert.count} event(s)
                                            {alert.firstEventSeq != null && ` · seq ${alert.firstEventSeq}–${alert.lastEventSeq ?? alert.firstEventSeq}`}
                                            {' '}· first {formatTime(alert.firstSeenAt)} · last {formatTime(alert.lastSeenAt)}
                                        </p>
                                        {alert.status === 'open' ? (
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <Input
                                                    placeholder="Review note (what you checked, action taken)"
                                                    maxLength={500}
                                                    value={notes[alert._id] || ''}
                                                    onChange={(e) => setNotes((prev) => ({ ...prev, [alert._id]: e.target.value }))}
                                                />
                                                <Button
                                                    size="sm"
                                                    className="shrink-0"
                                                    isLoading={ackBusy === alert._id}
                                                    onClick={() => acknowledge(alert)}
                                                >
                                                    Acknowledge
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                                                Acknowledged by <strong>{alert.acknowledgedByName}</strong> at {formatTime(alert.acknowledgedAt)}
                                                {alert.note ? ` — “${alert.note}”` : ''}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Integrity */}
                <Card className="border-slate-100" padding="md">
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-hive-primary" />
                            <h4 className="font-bold text-hive-text-primary">Log integrity</h4>
                        </div>
                        <p className="text-xs text-hive-text-secondary">
                            Recomputes the SHA-256 hash chain to detect edited or deleted security events and audit entries.
                        </p>
                        <Button className="w-full" onClick={verify} isLoading={verifying}>
                            <ShieldCheck className="h-4 w-4 mr-2" /> Verify integrity
                        </Button>

                        {verification ? (
                            <div className={cn(
                                'rounded-lg border p-3 space-y-2 text-xs',
                                verification.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                            )}>
                                <div className={cn('flex items-center gap-2 font-bold text-sm', verification.valid ? 'text-green-700' : 'text-red-700')}>
                                    {verification.valid ? <ShieldCheck className="h-4 w-4" /> : <ShieldX className="h-4 w-4" />}
                                    {verification.valid ? 'Chain intact' : `Tampering detected (${verification.issueCount})`}
                                </div>
                                <p className="text-hive-text-secondary">
                                    {verification.checked} records checked
                                    {verification.firstSeq != null && ` (seq ${verification.firstSeq}–${verification.lastSeq})`}
                                    {' '}· {formatTime(verification.verifiedAt)}
                                </p>
                                {verification.issues.length > 0 && (
                                    <ul className="space-y-1 text-red-700">
                                        {verification.issues.map((issue, i) => (
                                            <li key={`${issue.seq}-${issue.problem}-${i}`}>
                                                <span className="font-mono">seq {issue.seq}</span>: {PROBLEM_LABEL[issue.problem] || label(issue.problem)}
                                                {issue.missing ? ` — ${issue.missing} missing` : ''}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {verification.headHash && (
                                    <div>
                                        <p className="font-bold text-hive-text-secondary">Head hash</p>
                                        <p className="font-mono break-all text-hive-text-primary">{verification.headHash}</p>
                                    </div>
                                )}
                            </div>
                        ) : summary?.lastIntegrityCheck ? (
                            <p className="text-xs text-hive-text-secondary">
                                Last check: <strong className={summary.lastIntegrityCheck.valid ? 'text-green-700' : 'text-red-700'}>
                                    {summary.lastIntegrityCheck.valid ? 'intact' : 'tampered'}
                                </strong>{' '}
                                at {formatTime(summary.lastIntegrityCheck.at)}
                            </p>
                        ) : (
                            <p className="text-xs text-hive-text-secondary">No integrity check has been run yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Event log */}
            <Card className="border-slate-100" padding="none">
                <CardContent>
                    <div className="p-5 border-b border-slate-100 space-y-4">
                        <div>
                            <h4 className="font-bold text-hive-text-primary">Security event log</h4>
                            <p className="text-xs text-hive-text-secondary mt-1">Append-only. Click a row for details and its hash.</p>
                        </div>
                        <form onSubmit={applyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                            <select
                                aria-label="Event type"
                                className="h-10 rounded-medium border border-slate-200 bg-white px-3 text-sm"
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value as SecurityEventFilters['type'] })}
                            >
                                <option value="">All event types</option>
                                {SECURITY_EVENT_TYPES.map((t) => (
                                    <option key={t} value={t}>{label(t)}</option>
                                ))}
                            </select>
                            <select
                                aria-label="Outcome"
                                className="h-10 rounded-medium border border-slate-200 bg-white px-3 text-sm"
                                value={filters.outcome}
                                onChange={(e) => setFilters({ ...filters, outcome: e.target.value as SecurityEventFilters['outcome'] })}
                            >
                                <option value="">All outcomes</option>
                                <option value="success">Success</option>
                                <option value="failure">Failure</option>
                                <option value="denied">Denied</option>
                            </select>
                            <Input
                                placeholder="IP address"
                                aria-label="IP address"
                                value={filters.ip}
                                onChange={(e) => setFilters({ ...filters, ip: e.target.value })}
                            />
                            <Input
                                placeholder="Email contains…"
                                aria-label="Email"
                                value={filters.email}
                                onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <Button type="submit" size="sm" className="flex-1 h-10">Apply</Button>
                                <Button type="button" variant="ghost" size="sm" className="h-10" onClick={clearFilters}>Clear</Button>
                            </div>
                        </form>
                    </div>

                    {events.length === 0 ? (
                        <p className="p-8 text-center text-sm text-hive-text-secondary">
                            {eventsLoading ? 'Loading events…' : 'No security events match these filters.'}
                        </p>
                    ) : (
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8" />
                                    <TableHead>Seq</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Severity</TableHead>
                                    <TableHead>Outcome</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>IP</TableHead>
                                    <TableHead>Request</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.map((ev) => {
                                    const open = expanded === ev._id;
                                    return (
                                        <Fragment key={ev._id}>
                                            <TableRow
                                                className="cursor-pointer"
                                                onClick={() => setExpanded(open ? null : ev._id)}
                                            >
                                                <TableCell className="p-3">
                                                    {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                                </TableCell>
                                                <TableCell className="p-3 font-mono">{ev.seq}</TableCell>
                                                <TableCell className="p-3 whitespace-nowrap">{formatTime(ev.timestamp)}</TableCell>
                                                <TableCell className="p-3">
                                                    <div className="font-bold">{label(ev.eventType)}</div>
                                                    {ev.reason && <div className="text-hive-text-secondary">{label(ev.reason)}</div>}
                                                </TableCell>
                                                <TableCell className="p-3">
                                                    <Badge variant={SEVERITY_VARIANT[ev.severity]}>{ev.severity}</Badge>
                                                </TableCell>
                                                <TableCell className="p-3">
                                                    <Badge variant={OUTCOME_VARIANT[ev.outcome]}>{ev.outcome}</Badge>
                                                </TableCell>
                                                <TableCell className="p-3">
                                                    <div className="break-all">{ev.userEmail || '—'}</div>
                                                    {ev.userRole && <div className="text-hive-text-secondary capitalize">{ev.userRole}</div>}
                                                </TableCell>
                                                <TableCell className="p-3 font-mono">{ev.ip || '—'}</TableCell>
                                                <TableCell className="p-3 font-mono">
                                                    {ev.method ? `${ev.method} ` : ''}{ev.route || '—'}
                                                    {ev.statusCode != null && <span className="text-hive-text-secondary"> → {ev.statusCode}</span>}
                                                </TableCell>
                                            </TableRow>
                                            {open && (
                                                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                                                    <TableCell colSpan={9} className="p-4">
                                                        <dl className="grid md:grid-cols-2 gap-x-6 gap-y-2">
                                                            <Detail term="User agent" value={ev.userAgent} />
                                                            <Detail term="User id" value={ev.userId} mono />
                                                            <Detail term="Alert subject" value={ev.subject} mono />
                                                            <Detail term="Counts toward alerts" value={ev.countsTowardAlert ? 'yes' : 'no'} />
                                                            <Detail term="Hash" value={ev.hash} mono />
                                                            <Detail term="Previous hash" value={ev.prevHash} mono />
                                                        </dl>
                                                        {ev.details && (
                                                            <pre className="mt-3 p-3 rounded-lg bg-white border border-slate-200 overflow-auto text-[11px] leading-relaxed">
                                                                {JSON.stringify(ev.details, null, 2)}
                                                            </pre>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}

                    {nextBefore != null && (
                        <div className="p-4 flex justify-center border-t border-slate-100">
                            <Button
                                variant="outline"
                                size="sm"
                                isLoading={eventsLoading}
                                onClick={() => loadEvents(appliedFilters, nextBefore)}
                            >
                                Load older events
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({ icon: Icon, label: title, value, alert }: { icon: LucideIcon; label: string; value: number; alert?: boolean }) {
    return (
        <Card padding="sm" className={cn('border-slate-100', alert && 'border-red-200 bg-red-50')}>
            <div className="flex items-center gap-2 text-hive-text-secondary">
                <Icon className={cn('h-4 w-4', alert ? 'text-red-600' : 'text-hive-primary')} />
                <span className="text-[11px] font-bold uppercase tracking-wide">{title}</span>
            </div>
            <p className={cn('mt-2 text-2xl font-black', alert ? 'text-red-700' : 'text-hive-text-primary')}>{value}</p>
        </Card>
    );
}

function Detail({ term, value, mono }: { term: string; value: string | null; mono?: boolean }) {
    return (
        <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-hive-text-secondary">{term}</dt>
            <dd className={cn('text-hive-text-primary break-all', mono && 'font-mono')}>{value || '—'}</dd>
        </div>
    );
}

export default SecurityMonitorPanel;
