const express = require('express');
const {
    getNGOs,
    getNGODocument,
    updateNGOStatus,
    getAuditLogs,
    getAdminStats,
    getAdminUsers,
    updateUserAccountStatus,
    removeUser
} = require('../controllers/admin');
const {
    getSecurityEvents,
    getSecuritySummary,
    verifySecurityLog,
    getSecurityAlerts,
    acknowledgeSecurityAlert
} = require('../controllers/security');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected and restricted to admin
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.put('/users/:id/account-status', updateUserAccountStatus);
router.delete('/users/:id', removeUser);
router.get('/ngos', getNGOs);
router.get('/ngos/:id/document', getNGODocument);
router.get('/audit-logs', getAuditLogs);
router.put('/ngo-status/:id', updateNGOStatus);

// R5 – security monitoring (Policy §8.3.6/§8.3.7). Read, verify and acknowledge only:
// there is no route that edits or deletes security events (§8.3.5).
router.get('/security-events', getSecurityEvents);
router.get('/security-events/summary', getSecuritySummary);
router.post('/security-events/verify', verifySecurityLog);
router.get('/security-alerts', getSecurityAlerts);
router.put('/security-alerts/:id/acknowledge', acknowledgeSecurityAlert);

module.exports = router;
