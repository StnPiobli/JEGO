const express = require('express');
const router = express.Router();
const { creerLigne, listerLignes, supprimerLigne } = require('../controllers/ligneController');
const { authentifier } = require('../middleware/auth');

router.post('/', authentifier, creerLigne);
router.get('/', authentifier, listerLignes);
router.delete('/:id', authentifier, supprimerLigne);

module.exports = router;