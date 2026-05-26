import { API_URL } from './auth';

const authHeader = (): HeadersInit => ({
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

export const reportService = {
    async downloadImpactReport(format: 'csv' | 'pdf') {
        const response = await fetch(`${API_URL}/reports/impact?format=${format}`, {
            headers: authHeader()
        });

        if (!response.ok) {
            let message = 'Failed to download report';
            try {
                const data = await response.json();
                message = data.error || message;
            } catch {
                /* binary error body */
            }
            throw new Error(message);
        }

        const blob = await response.blob();
        const disposition = response.headers.get('Content-Disposition');
        const filenameMatch = disposition?.match(/filename="?([^";]+)"?/);
        const filename =
            filenameMatch?.[1] || `hive-impact-report.${format === 'pdf' ? 'pdf' : 'csv'}`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }
};
