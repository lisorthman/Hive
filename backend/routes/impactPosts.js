const express = require('express');
const {
    createImpactPost,
    getImpactPosts,
    getImpactPost,
    likeImpactPost,
    unlikeImpactPost,
    saveImpactPost,
    shareImpactPost,
    reportImpactPost,
    deleteImpactPost,
    generateDraftFromEvent,
    getVolunteerActivity,
    getTrendingImpactPosts,
    getOpenReports,
    resolveReport,
    uploadImpactPhotos,
    getTaggableVolunteers
} = require('../controllers/impactPosts');
const { protect, authorize, requireVerifiedNgoOrAdmin } = require('../middleware/auth');
const uploadImpactMedia = require('../middleware/uploadImpactMedia');

const router = express.Router();

router.get('/', protect, getImpactPosts);
router.get('/trending', protect, getTrendingImpactPosts);
router.get(
    '/taggable-volunteers',
    protect,
    requireVerifiedNgoOrAdmin,
    getTaggableVolunteers
);
router.get('/activity/:volunteerId', protect, getVolunteerActivity);
router.get('/reports/open', protect, authorize('admin'), getOpenReports);
router.put('/reports/:id', protect, authorize('admin'), resolveReport);
router.get('/:id', protect, getImpactPost);

router.post('/draft-from-event/:eventId', protect, requireVerifiedNgoOrAdmin, generateDraftFromEvent);
router.post(
    '/upload-photos',
    protect,
    requireVerifiedNgoOrAdmin,
    uploadImpactMedia.array('photos', 10),
    uploadImpactPhotos
);
router.post('/', protect, requireVerifiedNgoOrAdmin, createImpactPost);
router.post('/:id/like', protect, likeImpactPost);
router.delete('/:id/like', protect, unlikeImpactPost);
router.post('/:id/save', protect, saveImpactPost);
router.post('/:id/share', protect, shareImpactPost);
router.post('/:id/report', protect, reportImpactPost);
router.delete('/:id', protect, deleteImpactPost);

module.exports = router;
