const PDFDocument = require('pdfkit');

const escapeCsv = (value) => {
    const str = value == null ? '' : String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toISOString().slice(0, 10);
};

const impactReportToCsv = (report) => {
    const lines = [];
    lines.push('Hive NGO Impact Report');
    lines.push(`Generated,${formatDate(report.generatedAt)}`);
    lines.push(`Organization,${escapeCsv(report.organization.name)}`);
    lines.push(`Email,${escapeCsv(report.organization.email)}`);
    lines.push('');
    lines.push('Summary Metric,Value');
    lines.push(`Total Events,${report.summary.totalEvents}`);
    lines.push(`Active Events,${report.summary.activeEvents}`);
    lines.push(`Completed Events,${report.summary.completedEvents}`);
    lines.push(`Total Check-ins,${report.summary.totalCheckedIn}`);
    lines.push(`Total Volunteer Hours,${report.summary.totalVolunteerHours}`);
    lines.push(`Overall Average Rating,${report.summary.overallAverageRating}`);
    lines.push(`Total Reviews,${report.summary.totalReviews}`);
    lines.push('');
    lines.push(
        'Event Title,Date,Status,Category,Capacity,Joined,Checked In,Hours,Avg Rating,Review Count'
    );
    for (const e of report.events) {
        lines.push(
            [
                escapeCsv(e.title),
                formatDate(e.date),
                e.status,
                e.category,
                e.capacity,
                e.volunteersJoined,
                e.checkedIn,
                e.volunteerHours,
                e.averageRating,
                e.reviewCount
            ].join(',')
        );
    }
    if (report.recentReviews.length) {
        lines.push('');
        lines.push('Recent Reviews');
        lines.push('Event,Volunteer,Rating,Comment,Date');
        for (const r of report.recentReviews) {
            lines.push(
                [
                    escapeCsv(r.eventTitle),
                    escapeCsv(r.volunteerName),
                    r.rating,
                    escapeCsv(r.comment),
                    formatDate(r.createdAt)
                ].join(',')
            );
        }
    }
    return lines.join('\n');
};

const impactReportToPdf = (report) =>
    new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(20).text('Hive NGO Impact Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#555555');
        doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, {
            align: 'center'
        });
        doc.moveDown(1);
        doc.fillColor('#000000').fontSize(14).text(report.organization.name);
        doc.fontSize(10).text(report.organization.email);
        doc.moveDown(1);

        doc.fontSize(12).text('Summary', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(10);
        const summaryLines = [
            `Total events: ${report.summary.totalEvents}`,
            `Active events: ${report.summary.activeEvents}`,
            `Completed events: ${report.summary.completedEvents}`,
            `Total check-ins: ${report.summary.totalCheckedIn}`,
            `Total volunteer hours: ${report.summary.totalVolunteerHours}`,
            `Overall average rating: ${report.summary.overallAverageRating} / 5`,
            `Total reviews: ${report.summary.totalReviews}`
        ];
        summaryLines.forEach((line) => doc.text(line));
        doc.moveDown(1);

        doc.fontSize(12).text('Events', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(9);
        for (const e of report.events) {
            doc.text(
                `${e.title} | ${formatDate(e.date)} | ${e.status} | joined ${e.volunteersJoined}, checked-in ${e.checkedIn}, ${e.volunteerHours}h | ${e.averageRating}★ (${e.reviewCount} reviews)`
            );
            doc.moveDown(0.2);
        }

        if (report.recentReviews.length) {
            doc.addPage();
            doc.fontSize(12).text('Recent volunteer reviews', { underline: true });
            doc.moveDown(0.3);
            doc.fontSize(9);
            for (const r of report.recentReviews) {
                doc.text(
                    `${r.eventTitle} — ${r.volunteerName}: ${r.rating}/5${r.comment ? ` — "${r.comment.slice(0, 120)}${r.comment.length > 120 ? '…' : ''}"` : ''}`
                );
                doc.moveDown(0.2);
            }
        }

        doc.end();
    });

module.exports = { impactReportToCsv, impactReportToPdf };
