const express = require('express');
const router = express.Router();
const { noterVoyage, avisAgence } = require('../controllers/avisController');
const { authentifier } = require('../middleware/auth');

// Noter un voyage (voyageur connecté, billet utilisé)
router.post('/', authentifier, noterVoyage);

// Voir les avis d'une agence (PUBLIC — la machine à confiance)
router.get('/agences/:id', avisAgence);

module.exports = router;