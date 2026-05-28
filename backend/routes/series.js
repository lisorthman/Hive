const express = require('express');
const {
    createSeries,
    getMySeries,
    getSeries,
    getSeriesInstances
} = require('../controllers/series');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/my-series', protect, authorize('ngo', 'admin'), getMySeries);
router.route('/').post(protect, authorize('ngo', 'admin'), createSeries);
router.get('/:id/instances', getSeriesInstances);
router.get('/:id', getSeries);

module.exports = router;
