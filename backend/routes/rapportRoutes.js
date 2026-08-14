const express = require('express');
const router = express.Router();
const {
  rapportAgence, rapportAgencePdf,
  rapportJego, rapportJegoPdf,
  rapportAgenceDetaille
} = require('../controllers/rapportController');
const { authentifier } = require('../middleware/auth');

// Sorties JSON (exploitées par les interfaces web)
router.get('/agence', authentifier, rapportAgence);
router.get('/jego', authentifier, rapportJego);

// Sorties PDF (téléchargement, mise en page JEGO)
router.get('/agence/pdf', authentifier, rapportAgencePdf);
router.get('/jego/pdf', authentifier, rapportJegoPdf);

router.get('/agence-detaille', authentifier, rapportAgenceDetaille);

module.exports = router;
