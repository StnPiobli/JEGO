const express = require('express');
const router = express.Router();
const { rechercherTrajets } = require('../controllers/rechercheController');

// Route PUBLIQUE - pas de middleware authentifier
// Le voyageur peut chercher sans être connecté
router.get('/trajets', rechercherTrajets);

module.exports = router;