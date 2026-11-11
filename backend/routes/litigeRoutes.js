const express = require('express');
const router = express.Router();
const {
  ouvrirLitige, repondreLitige, trancherLitige, mesLitiges, litigesAdmin,
  ajouterPieceLitige, piecesLitige
} = require('../controllers/litigeController');
const { authentifier, verifierPermission } = require('../middleware/auth');

router.post('/', authentifier, ouvrirLitige);
router.put('/:id/reponse', authentifier, repondreLitige);
router.put('/:id/decision', authentifier, verifierPermission('trancher_litige'), trancherLitige);
router.get('/mes-litiges', authentifier, mesLitiges);
// Pieces jointes : l'agence en ajoute (fichier ou lien), l'agence et
// l'admin les consultent, avant comme apres la decision.
router.post('/:id/pieces', authentifier, ajouterPieceLitige);
router.get('/:id/pieces', authentifier, piecesLitige);
router.get('/admin/tous', authentifier, litigesAdmin);

module.exports = router;