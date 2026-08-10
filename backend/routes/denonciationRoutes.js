const express = require('express');
const router = express.Router();
const {
  billetsDenoncables, ouvrirDenonciation, mesDenonciations,
  observerDenonciation, denonciationsAdmin, trancherDenonciation
} = require('../controllers/denonciationController');
const { authentifier, verifierAgenceActive } = require('../middleware/auth');

// VOYAGEUR — choisit parmi ses vrais billets, puis dénonce
router.get('/billets-denoncables', authentifier, billetsDenoncables);
router.post('/', authentifier, ouvrirDenonciation);

// VOYAGEUR ou AGENCE — consulter ses dossiers
router.get('/mes-denonciations', authentifier, mesDenonciations);

// AGENCE — mode observation : se défendre sans pouvoir clore
router.put('/:id/observation', authentifier, verifierAgenceActive, observerDenonciation);

// ADMIN — instruire et trancher
router.get('/admin/tous', authentifier, denonciationsAdmin);
router.put('/:id/decision', authentifier, trancherDenonciation);

module.exports = router;
