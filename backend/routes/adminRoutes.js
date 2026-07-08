const express = require('express');
const router = express.Router();
const { connexion, agencesEnAttente, validerAgence, refuserAgence } = require('../controllers/adminController');
const { authentifier } = require('../middleware/auth');

router.post('/connexion', connexion);
router.get('/agences-en-attente', authentifier, agencesEnAttente);
router.put('/agences/:id/valider', authentifier, validerAgence);
router.put('/agences/:id/refuser', authentifier, refuserAgence);

module.exports = router;