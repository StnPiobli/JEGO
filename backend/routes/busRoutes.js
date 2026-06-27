const express = require('express');
const router = express.Router();
const {
  creerBus, listerBus, voirPlanBus,
  marquerToilettes, marquerAbime, reactiverSieges, marquerPremium
} = require('../controllers/busController');
const { authentifier } = require('../middleware/auth');

// Gestion des bus
router.post('/', authentifier, creerBus);
router.get('/', authentifier, listerBus);
router.get('/:id/plan', authentifier, voirPlanBus);

// Marquage des sièges
router.put('/:id/sieges/toilettes', authentifier, marquerToilettes);
router.put('/:id/sieges/abime', authentifier, marquerAbime);
router.put('/:id/sieges/reactiver', authentifier, reactiverSieges);
router.put('/:id/sieges/premium', authentifier, marquerPremium);

module.exports = router;