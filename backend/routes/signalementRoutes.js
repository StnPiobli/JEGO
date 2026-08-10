const express = require('express');
const router = express.Router();
const { signaler, signalementsAgence } = require('../controllers/signalementController');
const { authentifier } = require('../middleware/auth');

// Route PROTÉGÉE - le voyageur signale (doit être connecté + avoir un billet)
router.post('/', authentifier, signaler);
// Signalements reçus par l'agence (page Incidents du portail)
router.get('/mon-agence', authentifier, signalementsAgence);

module.exports = router;