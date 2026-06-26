const express = require('express');
const router = express.Router();
const { inscription, connexion, monProfil, modifierProfil } = require('../controllers/voyageurController');
const { authentifier } = require('../middleware/auth');

// Routes publiques
router.post('/inscription', inscription);
router.post('/connexion', connexion);

// Routes protégées (nécessitent un token)
router.get('/profil', authentifier, monProfil);
router.put('/profil', authentifier, modifierProfil);

module.exports = router;