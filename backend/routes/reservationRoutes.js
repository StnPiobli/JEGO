const express = require('express');
const router = express.Router();
const { planTrajet, verrouillerSiege, prolongerVerrou, payer, venteGuichet, scannerBillet } = require('../controllers/reservationController');
const { authentifier, verifierChauffeurActif } = require('../middleware/auth');

router.get('/trajets/:id/plan', planTrajet);

router.post('/verrou', authentifier, verrouillerSiege);
router.put('/verrou/:id/prolonger', authentifier, prolongerVerrou);
router.post('/payer', authentifier, payer);

router.post('/trajets/:id/vente-guichet', authentifier, venteGuichet);

router.post('/scanner', authentifier, verifierChauffeurActif, scannerBillet);

module.exports = router;
