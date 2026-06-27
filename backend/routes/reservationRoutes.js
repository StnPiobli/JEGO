const express = require('express');
const router = express.Router();
const { planTrajet, verrouillerSiege, prolongerVerrou, payer } = require('../controllers/reservationController');
const { authentifier } = require('../middleware/auth');

// Route PUBLIQUE - consulter le plan
router.get('/trajets/:id/plan', planTrajet);

// Routes PROTÉGÉES - réservation (connexion obligatoire)
router.post('/verrou', authentifier, verrouillerSiege);
router.put('/verrou/:id/prolonger', authentifier, prolongerVerrou);
router.post('/payer', authentifier, payer);

module.exports = router;