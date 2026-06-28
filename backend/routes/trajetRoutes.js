const express = require('express');
const router = express.Router();
const { creerTrajet, listerTrajets, declarerArrivee, verserEscrow } = require('../controllers/trajetController');
const { authentifier } = require('../middleware/auth');

router.post('/', authentifier, creerTrajet);
router.get('/', authentifier, listerTrajets);
router.put('/:id/arrivee', authentifier, declarerArrivee);
router.post('/:id/verser-escrow', verserEscrow);

module.exports = router;