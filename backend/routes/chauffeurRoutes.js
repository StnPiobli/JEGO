const express = require('express');
const router = express.Router();
const {
  creerChauffeur, listerChauffeurs, connexionChauffeur,
  mesTrajets, declarerDepart, declarerArriveeChauffeur,
  desactiverUrgence, reactiverChauffeur
} = require('../controllers/chauffeurController');
const { authentifier, verifierChauffeurActif } = require('../middleware/auth');

// Routes pour l'AGENCE
router.post('/', authentifier, creerChauffeur);
router.get('/', authentifier, listerChauffeurs);
router.put('/:id/desactiver', authentifier, desactiverUrgence);
router.put('/:id/reactiver', authentifier, reactiverChauffeur);

// Route pour le CHAUFFEUR (connexion, publique)
router.post('/connexion', connexionChauffeur);

// Routes pour le CHAUFFEUR connecté (actions sensibles → vérif désactivation)
router.get('/mes-trajets', authentifier, mesTrajets);
router.put('/trajets/:id/depart', authentifier, verifierChauffeurActif, declarerDepart);
router.put('/trajets/:id/arrivee', authentifier, verifierChauffeurActif, declarerArriveeChauffeur);

module.exports = router;