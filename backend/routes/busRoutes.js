const express = require('express');
const router = express.Router();
const {
  creerBus, listerBus, voirPlanBus,
  marquerToilettes, marquerAbime, reactiverSieges, marquerPremium,
  desactiverBus, voirBus, modifierBus
} = require('../controllers/busController');
const { authentifier, verifierAgenceActive } = require('../middleware/auth');
// Gestion des bus
router.post('/', authentifier, verifierAgenceActive, creerBus);
router.get('/', authentifier, listerBus);
router.get('/:id', authentifier, voirBus);
router.put('/:id', authentifier, verifierAgenceActive, modifierBus);
router.get('/:id/plan', authentifier, voirPlanBus);
router.put('/:id/desactiver', authentifier, desactiverBus);

// Marquage des sièges
router.put('/:id/sieges/toilettes', authentifier, marquerToilettes);
router.put('/:id/sieges/abime', authentifier, marquerAbime);
router.put('/:id/sieges/reactiver', authentifier, reactiverSieges);
router.put('/:id/sieges/premium', authentifier, marquerPremium);

module.exports = router;