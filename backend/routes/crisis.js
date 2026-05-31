const express = require('express');
const {
    getCrisisMap,
    getAdminCrisisOverview,
    getMatchedVolunteers,
    broadcastCrisisAlert,
    updateCrisisStatus,
    getCrisisSummary,
    getCrisisUpdates,
    createCrisisUpdate,
    getCrisisAnalytics,
    getCrisisImpactDraft,
    invitePartnerNgo,
    respondPartnerInvite,
    listResourceRequests,
    createResourceRequest,
    pledgeResource,
    updateResourceRequest
} = require('../controllers/crisis');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/map', getCrisisMap);
router.get('/admin/overview', protect, authorize('admin'), getAdminCrisisOverview);
router.get('/:eventId/summary', getCrisisSummary);
router.get('/:eventId/updates', getCrisisUpdates);
router.post('/:eventId/updates', protect, authorize('ngo', 'admin'), createCrisisUpdate);
router.get('/:eventId/analytics', protect, authorize('ngo', 'admin'), getCrisisAnalytics);
router.get('/:eventId/impact-draft', protect, authorize('ngo', 'admin'), getCrisisImpactDraft);
router.get('/:eventId/matched-volunteers', protect, authorize('ngo', 'admin'), getMatchedVolunteers);
router.post('/:eventId/alert', protect, authorize('ngo', 'admin'), broadcastCrisisAlert);
router.put('/:eventId/status', protect, authorize('ngo', 'admin'), updateCrisisStatus);
router.post('/:eventId/partners', protect, authorize('ngo', 'admin'), invitePartnerNgo);
router.put('/:eventId/partners/respond', protect, authorize('ngo', 'admin'), respondPartnerInvite);
router.get('/:eventId/resources', protect, listResourceRequests);
router.post('/:eventId/resources', protect, authorize('ngo', 'admin'), createResourceRequest);
router.post('/resources/:resourceId/pledge', protect, pledgeResource);
router.put('/resources/:resourceId', protect, authorize('ngo', 'admin'), updateResourceRequest);

module.exports = router;
