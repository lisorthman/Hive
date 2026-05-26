const express = require('express');
const { getNGOProfile, getNGOEvents } = require('../controllers/ngos');

const router = express.Router();

router.get('/:id', getNGOProfile);
router.get('/:id/events', getNGOEvents);

module.exports = router;
