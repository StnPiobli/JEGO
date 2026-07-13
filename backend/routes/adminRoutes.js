const express = require('express');
const router = express.Router();
const {
  connexion, agencesEnAttente, validerAgence, refuserAgence,
  listerParametres, modifierParametre
} = require('../controllers/adminController');
const { authentifier, verifierPermission } = require('../middleware/auth');

router.post('/connexion', connexion);
router.get('/agences-en-attente', authentifier, verifierPermission('valider_agence'), agencesEnAttente);
router.put('/agences/:id/valider', authentifier, verifierPermission('valider_agence'), validerAgence);
router.put('/agences/:id/refuser', authentifier, verifierPermission('refuser_agence'), refuserAgence);
router.get('/parametres', authentifier, verifierPermission('modifier_parametres'), listerParametres);
router.put('/parametres/:cle', authentifier, verifierPermission('modifier_parametres'), modifierParametre);

module.exports = router;