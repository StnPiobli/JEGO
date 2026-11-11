const express = require('express');
const router = express.Router();
const { noterVoyage, avisAgence, avisTrajet, mesAvis } = require('../controllers/avisController');
const { authentifier } = require('../middleware/auth');

// Noter un voyage (voyageur connecté, billet utilisé)
router.post('/', authentifier, noterVoyage);

// Les avis laissés par le voyageur connecté (écran « Mes avis »)
router.get('/mes-avis', authentifier, mesAvis);

// Voir les avis d'une agence (PUBLIC — la machine à confiance)
router.get('/agences/:id', avisAgence);

// Avis d'un trajet, pour l'agence qui l'a opere
router.get('/trajets/:id', authentifier, avisTrajet);

module.exports = router;