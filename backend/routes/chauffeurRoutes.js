const express = require('express');
const router = express.Router();
const {
  creerChauffeur, listerChauffeurs, connexionChauffeur,
  mesTrajets, declarerDepart, declarerArriveeChauffeur,
  desactiverUrgence, reactiverChauffeur,
  changerMotDePasseChauffeur, renvoyerIdentifiantsChauffeur,
  declarerArriveeArret, declarerDepartArret, arretsTrajet, supprimerChauffeur
} = require('../controllers/chauffeurController');
const { authentifier, verifierChauffeurActif, verifierAgenceActive } = require('../middleware/auth');

// Routes pour l'AGENCE
router.post('/', authentifier, verifierAgenceActive, creerChauffeur);
router.get('/', authentifier, listerChauffeurs);
router.put('/:id/desactiver', authentifier, desactiverUrgence);
router.put('/:id/reactiver', authentifier, reactiverChauffeur);
router.delete('/:id', authentifier, supprimerChauffeur);
// L'agence peut renvoyer des identifiants, jamais choisir le mot de passe
router.post('/:id/renvoyer-identifiants', authentifier, verifierAgenceActive, renvoyerIdentifiantsChauffeur);

// Route pour le CHAUFFEUR (connexion, publique)
router.post('/connexion', connexionChauffeur);

// Routes pour le CHAUFFEUR connecté (actions sensibles → vérif désactivation)
router.get('/mes-trajets', authentifier, mesTrajets);
// Changement de mot de passe : uniquement par le chauffeur lui-même
router.put('/mon-mot-de-passe', authentifier, verifierChauffeurActif, changerMotDePasseChauffeur);
router.put('/trajets/:id/depart', authentifier, verifierChauffeurActif, declarerDepart);
router.put('/trajets/:id/arrivee', authentifier, verifierChauffeurActif, declarerArriveeChauffeur);
// Feuille de route et déclaration de passage aux arrêts intermédiaires
router.get('/trajets/:id/arrets', authentifier, verifierChauffeurActif, arretsTrajet);
router.put('/trajets/:id/arret', authentifier, verifierChauffeurActif, declarerArriveeArret);
// Départ d'un arrêt : ferme l'embarquement à ce point
router.put('/trajets/:id/arret/depart', authentifier, verifierChauffeurActif, declarerDepartArret);

module.exports = router;