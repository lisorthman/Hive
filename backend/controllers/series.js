const EventSeries = require('../models/EventSeries');
const EventInstance = require('../models/EventInstance');
const generateSeriesInstances = require('../utils/generateSeriesInstances');

// @desc    Create recurring series and generate instances
// @route   POST /api/series
// @access  Private (NGO)
exports.createSeries = async (req, res) => {
    try {
        if (req.user.role !== 'ngo' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Only NGOs can create series' });
        }

        req.body.organization = req.user.id;
        req.body.ngoName = req.user.name;

        if (req.body.useShiftSlots && (!req.body.shiftSlotTemplate || !req.body.shiftSlotTemplate.length)) {
            return res.status(400).json({
                success: false,
                error: 'Add at least one shift slot template when using shift slots'
            });
        }

        const series = await EventSeries.create(req.body);
        const instances = await generateSeriesInstances(series);

        res.status(201).json({
            success: true,
            data: {
                series,
                instanceCount: instances.length,
                instances
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Series owned by logged-in NGO
// @route   GET /api/series/my-series
// @access  Private (NGO)
exports.getMySeries = async (req, res) => {
    try {
        const series = await EventSeries.find({ organization: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: series.length, data: series });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get single series
// @route   GET /api/series/:id
// @access  Public
exports.getSeries = async (req, res) => {
    try {
        const series = await EventSeries.findById(req.params.id).populate({
            path: 'organization',
            select: 'name email'
        });
        if (!series) {
            return res.status(404).json({ success: false, error: 'Series not found' });
        }
        res.status(200).json({ success: true, data: series });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    List instances for a series
// @route   GET /api/series/:id/instances
// @access  Public
exports.getSeriesInstances = async (req, res) => {
    try {
        const series = await EventSeries.findById(req.params.id);
        if (!series) {
            return res.status(404).json({ success: false, error: 'Series not found' });
        }

        const instances = await EventInstance.find({ series: series._id }).sort({ date: 1 });
        res.status(200).json({ success: true, count: instances.length, data: instances });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
