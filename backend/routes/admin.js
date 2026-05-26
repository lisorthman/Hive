const express = require('express');
const { getNGOs, updateNGOStatus, getAuditLogs } = require('../controllers/admin');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected and restricted to admin
router.use(protect);
router.use(authorize('admin'));

router.get('/ngos', getNGOs);
router.get('/audit-logs', getAuditLogs);
router.put('/ngo-status/:id', updateNGOStatus);

module.exports = router;
