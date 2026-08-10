const express = require('express');
const router = express.Router();
const { annulerBillet, annulerBilletGuichet } = require('../controllers/annulationController');
const { authentifier, verifierAgenceActive } = require('../middleware/auth');

// Route PROTÉGÉE - le voyageur annule son propre billet
router.put('/billets/:id/annuler', authentifier, annulerBillet);

// Route PROTÉGÉE - l'agence annule un billet qu'elle a vendu au guichet
// (remboursement en espèces, avant le départ, avant tout scan)
router.put('/billets/:id/annuler-guichet', authentifier, verifierAgenceActive, annulerBilletGuichet);

module.exports = router;
