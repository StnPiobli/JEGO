const express = require('express');
const router = express.Router();
const { creerTrajet, listerTrajets } = require('../controllers/trajetController');
const { authentifier } = require('../middleware/auth');

router.post('/', authentifier, creerTrajet);
router.get('/', authentifier, listerTrajets);

module.exports = router;