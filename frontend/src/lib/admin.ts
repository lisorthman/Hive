import { API_URL } from './auth';

// ── R5: security event logging & monitoring (Policy §8) ────────────────────
export const SECURITY_EVENT_TYPES = [
    'login_success',
    'login_failure',
    'login_denied',
    'account_locked',
    'rate_limited',
    'auth_required',
    'access_denied',
    'upload_rejected',
    'validation_failure',
    'role_changed',
    'account_status_changed',
    'ngo_verification_changed',
    'user_removed',
    'admin_action',
    'security_alert_raised',
    'security_alert_acknowledged',
    'log_integrity_check',
    'log_integrity_failed'
] as const;
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];
export type SecuritySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type SecurityOutcome = 'success' | 'failure' | 'denied';

export interface SecurityEvent {
    _id: string;
    seq: number;
    timestamp: string;
    eventType: SecurityEventType;
    severity: SecuritySeverity;
    outcome: SecurityOutcome;
    userId: string | null;
    userEmail: string | null;
    userRole: string | null;
    ip: string | null;
    userAgent: string | null;
    method: string | null;
    route: string | null;
    statusCode: number | null;
    reason: string | null;
    details: Record<string, unknown> | null;
    subject: string | null;
    countsTowardAlert: boolean;
    prevHash: string;
    prevTimestamp: string | null;
    hash: string;
}

export interface SecurityAlert {
    _id: string;
    kind: 'brute_force_ip' | 'brute_force_account' | 'log_integrity_failure';
    key: string;
    severity: SecuritySeverity;
    message: string;
    count: number;
    windowMinutes: number | null;
    firstSeenAt: string;
    lastSeenAt: string;
    firstEventSeq: number | null;
    lastEventSeq: number | null;
    status: 'open' | 'acknowledged';
    acknowledgedBy: string | null;
    acknowledgedByName: string | null;
    acknowledgedAt: string | null;
    note: string | null;
    createdAt: string;
}

export interface SecuritySummary {
    last24h: Record<SecurityEventType, number>;
    openAlerts: number;
    totalEvents: number;
    retentionDays: number;
    lastIntegrityCheck: {
        seq: number;
        at: string;
        valid: boolean;
        checked: number | null;
        issueCount: number | null;
        headHash: string | null;
    } | null;
}

export interface ChainIssue {
    seq: number;
    problem: 'hash_mismatch' | 'broken_link' | 'seq_gap' | 'missing_oldest_records' | 'audit_entry_missing' | 'audit_entry_modified';
    missing?: number;
    auditLogId?: string;
}

export interface ChainVerification {
    valid: boolean;
    checked: number;
    firstSeq: number | null;
    lastSeq: number | null;
    headHash: string | null;
    issueCount: number;
    issues: ChainIssue[];
    verifiedAt: string;
}

export interface SecurityEventFilters {
    type?: SecurityEventType | '';
    outcome?: SecurityOutcome | '';
    ip?: string;
    email?: string;
    before?: number;
    limit?: number;
}

export interface SecurityEventPage {
    data: SecurityEvent[];
    nextBefore: number | null;
}

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            ...init.headers
        }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data as T;
}

export const adminService = {
    async getSecurityEvents(filters: SecurityEventFilters = {}): Promise<SecurityEventPage> {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== '') params.set(key, String(value));
        }
        const query = params.toString() ? `?${params}` : '';
        const res = await adminRequest<{ data: SecurityEvent[]; nextBefore: number | null }>(`/admin/security-events${query}`);
        return { data: res.data, nextBefore: res.nextBefore };
    },

    async getSecuritySummary(): Promise<SecuritySummary> {
        return (await adminRequest<{ data: SecuritySummary }>('/admin/security-events/summary')).data;
    },

    async verifySecurityLog(): Promise<ChainVerification> {
        return (await adminRequest<{ data: ChainVerification }>('/admin/security-events/verify', { method: 'POST' })).data;
    },

    async getSecurityAlerts(status?: 'open' | 'acknowledged'): Promise<SecurityAlert[]> {
        const query = status ? `?status=${status}` : '';
        return (await adminRequest<{ data: SecurityAlert[] }>(`/admin/security-alerts${query}`)).data;
    },

    async acknowledgeSecurityAlert(id: string, note: string): Promise<SecurityAlert> {
        return (await adminRequest<{ data: SecurityAlert }>(
            `/admin/security-alerts/${encodeURIComponent(id)}/acknowledge`,
            { method: 'PUT', body: JSON.stringify({ note }) }
        )).data;
    },

    /**
     * Open an NGO verification document (admin only).
     * The PDF is fetched with the admin's token and shown from a temporary blob URL,
     * so there is no public link to the file.
     */
    async openNgoDocument(ngoId: string) {
        // Open the tab during the click so pop-up blockers allow it.
        const tab = window.open('', '_blank');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/admin/ngos/${encodeURIComponent(ngoId)}/document`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                let message = 'Could not open document';
                try {
                    const data = await response.json();
                    if (data?.error) message = data.error;
                } catch { /* response was not JSON */ }
                throw new Error(message);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            if (tab) tab.location.href = url;
            else window.open(url, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (err) {
            tab?.close();
            throw err;
        }
    },

    async getStats() {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async getUsers(role?: string) {
        const token = localStorage.getItem('token');
        const query = role ? `?role=${role}` : '';
        const response = await fetch(`${API_URL}/admin/users${query}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async getNGOs(status?: string) {
        const token = localStorage.getItem('token');
        const query = status ? `?status=${status}` : '';
        const response = await fetch(`${API_URL}/admin/ngos${query}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async updateNGOStatus(id: string, status: 'verified' | 'rejected' | 'pending') {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/ngo-status/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async updateUserAccountStatus(id: string, status: 'active' | 'suspended') {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/users/${id}/account-status`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async removeUser(id: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/users/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async getAuditLogs(limit = 50) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/audit-logs?limit=${limit}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async getOpenImpactReports() {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/impact-posts/reports/open`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    },

    async resolveImpactReport(id: string, status: 'resolved' | 'dismissed') {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/impact-posts/reports/${id}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.data;
    }
};
