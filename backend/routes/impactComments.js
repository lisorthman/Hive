const express = require('express');
const {
    getImpactComments,
    createImpactComment,
    deleteImpactComment,
    reportImpactComment
} = require('../controllers/impactComments');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/post/:postId', protect, getImpactComments);
router.post('/', protect, createImpactComment);
router.delete('/:id', protect, deleteImpactComment);
router.post('/:id/report', protect, reportImpactComment);

module.exports = router;
