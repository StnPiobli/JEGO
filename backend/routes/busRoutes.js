const express = require('express');
const router = express.Router();
const { creerBus, listerBus, voirPlanBus } = require('../controllers/busController');
const { authentifier } = require('../middleware/auth');

// Toutes les routes bus nécessitent d'être connecté en tant qu'agence
router.post('/', authentifier, creerBus);
router.get('/', authentifier, listerBus);
router.get('/:id/plan', authentifier, voirPlanBus);

module.exports = router;