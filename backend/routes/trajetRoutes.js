const express = require('express');
const router = express.Router();
const { creerTrajet, listerTrajets, declarerArrivee, assignerChauffeur, annulerTrajet, declarerRetard, passagersTrajet, versementsAgence, supprimerTrajet } = require('../controllers/trajetController');
const { authentifier, verifierAgenceActive } = require('../middleware/auth');

router.post('/', authentifier, verifierAgenceActive, creerTrajet);
router.get('/', authentifier, listerTrajets);
router.put('/:id/arrivee', authentifier, verifierAgenceActive, declarerArrivee);
router.put('/:id/chauffeur', authentifier, verifierAgenceActive, assignerChauffeur);
router.put('/:id/annuler', authentifier, verifierAgenceActive, annulerTrajet);
router.delete('/:id', authentifier, verifierAgenceActive, supprimerTrajet);
// Le versement de l'escrow n'est PAS une route : la tache automatique
// (jobs/versementEscrow.js) s'en charge. Une route ouverte permettait a
// n'importe qui de declencher un versement.
router.put('/:id/retard', authentifier, verifierAgenceActive, declarerRetard);
// Liste des passagers d'un trajet (portail agence)
router.get('/:id/passagers', authentifier, passagersTrajet);
// Versements escrow reçus par l'agence — placée avant /:id pour ne pas
// être capturée comme un identifiant de trajet.


module.exports = router;