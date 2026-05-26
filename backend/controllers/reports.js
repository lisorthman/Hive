const buildNGOImpactReport = require('../utils/buildNGOImpactReport');
const { impactReportToCsv, impactReportToPdf } = require('../utils/reportFormatters');

// @desc    Export NGO impact report (CSV or PDF)
// @route   GET /api/reports/impact?format=csv|pdf
// @access  Private (ngo, admin)
exports.exportImpactReport = async (req, res) => {
    try {
        const format = (req.query.format || 'csv').toLowerCase();
        if (!['csv', 'pdf'].includes(format)) {
            return res.status(400).json({ success: false, error: 'format must be csv or pdf' });
        }

        let ngoId = req.user.id;
        if (req.user.role === 'admin' && req.query.ngoId) {
            ngoId = req.query.ngoId;
        }

        const report = await buildNGOImpactReport(ngoId);
        const safeName = report.organization.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'ngo';
        const dateStamp = new Date().toISOString().slice(0, 10);

        if (format === 'csv') {
            const csv = impactReportToCsv(report);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="hive-impact-${safeName}-${dateStamp}.csv"`
            );
            return res.status(200).send(csv);
        }

        const pdfBuffer = await impactReportToPdf(report);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="hive-impact-${safeName}-${dateStamp}.pdf"`
        );
        return res.status(200).send(pdfBuffer);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
