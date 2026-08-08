const express = require('express');
const router = express.Router();
const { creerLigne, listerLignes, supprimerLigne } = require('../controllers/ligneController');
const { authentifier, verifierAgenceActive } = require('../middleware/auth');

router.post('/', authentifier, verifierAgenceActive, creerLigne);
router.get('/', authentifier, listerLignes);
router.delete('/:id', authentifier, verifierAgenceActive, supprimerLigne);

module.exports = router;