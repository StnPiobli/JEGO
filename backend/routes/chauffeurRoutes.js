const express = require('express');
const router = express.Router();
const {
  creerChauffeur, listerChauffeurs, connexionChauffeur,
  mesTrajets, declarerDepart, declarerArriveeChauffeur
} = require('../controllers/chauffeurController');
const { authentifier } = require('../middleware/auth');

// Routes pour l'AGENCE
router.post('/', authentifier, creerChauffeur);
router.get('/', authentifier, listerChauffeurs);

// Route pour le CHAUFFEUR (connexion, publique)
router.post('/connexion', connexionChauffeur);

// Routes pour le CHAUFFEUR connecté
router.get('/mes-trajets', authentifier, mesTrajets);
router.put('/trajets/:id/depart', authentifier, declarerDepart);
router.put('/trajets/:id/arrivee', authentifier, declarerArriveeChauffeur);

module.exports = router;