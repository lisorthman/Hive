const express = require('express');
const {
    getNGOs,
    updateNGOStatus,
    getAuditLogs,
    getAdminStats,
    getAdminUsers,
    updateUserAccountStatus,
    removeUser
} = require('../controllers/admin');
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
router.get('/audit-logs', getAuditLogs);
router.put('/ngo-status/:id', updateNGOStatus);

module.exports = router;
