const express = require('express');
const router = express.Router();
const {
  connexion, agencesEnAttente, validerAgence, refuserAgence,
  listerParametres, modifierParametre
} = require('../controllers/adminController');
const { authentifier } = require('../middleware/auth');

router.post('/connexion', connexion);
router.get('/agences-en-attente', authentifier, agencesEnAttente);
router.put('/agences/:id/valider', authentifier, validerAgence);
router.put('/agences/:id/refuser', authentifier, refuserAgence);
router.get('/parametres', authentifier, listerParametres);
router.put('/parametres/:cle', authentifier, modifierParametre);

module.exports = router;