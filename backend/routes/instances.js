const express = require('express');
const {
    getInstance,
    getInstanceParticipation,
    joinInstance,
    leaveInstance
} = require('../controllers/instances');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/:id/participation', protect, getInstanceParticipation);
router.get('/:id', getInstance);
router.put('/:id/join', protect, authorize('volunteer', 'admin'), joinInstance);
router.delete('/:id/leave', protect, authorize('volunteer', 'admin'), leaveInstance);

module.exports = router;
