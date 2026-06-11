const express = require('express');
const router = express.Router();
const { inscription, connexion } = require('../controllers/voyageurController');

// Inscription d'un voyageur
router.post('/inscription', inscription);

// Connexion d'un voyageur
router.post('/connexion', connexion);

module.exports = router;