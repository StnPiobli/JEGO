const express = require('express');
const router = express.Router();
const { creerChauffeur, listerChauffeurs, connexionChauffeur, mesTrajets } = require('../controllers/chauffeurController');
const { authentifier } = require('../middleware/auth');

// Routes pour l'AGENCE (création et gestion des chauffeurs)
router.post('/', authentifier, creerChauffeur);
router.get('/', authentifier, listerChauffeurs);

// Route pour le CHAUFFEUR (connexion, publique)
router.post('/connexion', connexionChauffeur);

// Route pour le CHAUFFEUR connecté (voir ses trajets)
router.get('/mes-trajets', authentifier, mesTrajets);

module.exports = router;