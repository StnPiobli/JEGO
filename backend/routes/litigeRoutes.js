const express = require('express');
const router = express.Router();
const {
  ouvrirLitige, repondreLitige, trancherLitige, mesLitiges, litigesAdmin
} = require('../controllers/litigeController');
const { authentifier } = require('../middleware/auth');

router.post('/', authentifier, ouvrirLitige);
router.put('/:id/reponse', authentifier, repondreLitige);
router.put('/:id/decision', authentifier, trancherLitige);
router.get('/mes-litiges', authentifier, mesLitiges);
router.get('/admin/tous', authentifier, litigesAdmin);

module.exports = router;