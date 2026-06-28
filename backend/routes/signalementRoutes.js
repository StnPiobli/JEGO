const express = require('express');
const router = express.Router();
const { signaler } = require('../controllers/signalementController');
const { authentifier } = require('../middleware/auth');

// Route PROTÉGÉE - le voyageur signale (doit être connecté + avoir un billet)
router.post('/', authentifier, signaler);

module.exports = router;