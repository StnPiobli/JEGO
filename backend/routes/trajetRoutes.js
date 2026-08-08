const express = require('express');
const router = express.Router();
const { creerTrajet, listerTrajets, declarerArrivee, verserEscrow, assignerChauffeur, annulerTrajet, declarerRetard } = require('../controllers/trajetController');
const { authentifier, verifierAgenceActive } = require('../middleware/auth');

router.post('/', authentifier, verifierAgenceActive, creerTrajet);
router.get('/', authentifier, listerTrajets);
router.put('/:id/arrivee', authentifier, verifierAgenceActive, declarerArrivee);
router.put('/:id/chauffeur', authentifier, verifierAgenceActive, assignerChauffeur);
router.put('/:id/annuler', authentifier, verifierAgenceActive, annulerTrajet);
router.post('/:id/verser-escrow', verserEscrow);
router.put('/:id/retard', authentifier, verifierAgenceActive, declarerRetard);

module.exports = router;