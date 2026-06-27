const express = require('express');
const router = express.Router();
const { annulerBillet } = require('../controllers/annulationController');
const { authentifier } = require('../middleware/auth');

// Route PROTÉGÉE - le voyageur annule son propre billet
router.put('/billets/:id/annuler', authentifier, annulerBillet);

module.exports = router;