const express = require('express');
const router = express.Router();
const {
  inscription, connexion, monProfil,
  televerserDocument, mesDocuments, supprimerMonDocument
} = require('../controllers/agenceController');
const { authentifier } = require('../middleware/auth');

// Routes publiques
router.post('/inscription', inscription);
router.post('/connexion', connexion);

// Routes protégées (nécessitent un token)
router.get('/profil', authentifier, monProfil);

// Documents de l'agence (téléversement depuis son espace)
router.post('/documents', authentifier, televerserDocument);
router.get('/documents', authentifier, mesDocuments);
router.delete('/documents/:id', authentifier, supprimerMonDocument);

module.exports = router;