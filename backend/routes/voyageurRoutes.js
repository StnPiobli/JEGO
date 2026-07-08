const express = require('express');
const router = express.Router();
const { inscription, connexion, monProfil, modifierProfil, historiqueVoyages } = require('../controllers/voyageurController');
const { authentifier } = require('../middleware/auth');

router.post('/inscription', inscription);
router.post('/connexion', connexion);
router.get('/profil', authentifier, monProfil);
router.put('/profil', authentifier, modifierProfil);
router.get('/historique', authentifier, historiqueVoyages);

module.exports = router;