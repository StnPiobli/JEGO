const express = require('express');
const router = express.Router();
const { creerTrajet, listerTrajets, declarerArrivee, verserEscrow, assignerChauffeur, annulerTrajet, declarerRetard } = require('../controllers/trajetController');
const { authentifier } = require('../middleware/auth');

router.post('/', authentifier, creerTrajet);
router.get('/', authentifier, listerTrajets);
router.put('/:id/arrivee', authentifier, declarerArrivee);
router.put('/:id/chauffeur', authentifier, assignerChauffeur);
router.put('/:id/annuler', authentifier, annulerTrajet);
router.post('/:id/verser-escrow', verserEscrow);
router.put('/:id/retard', authentifier, declarerRetard);

module.exports = router;