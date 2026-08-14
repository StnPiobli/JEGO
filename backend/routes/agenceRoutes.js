const express = require('express');
const router = express.Router();
const {
  inscription, connexion, monProfil,
  televerserDocument, mesDocuments, supprimerMonDocument,
  mesNotifications
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

// Versements escrow reçus par l'agence (page Paiements du portail)
const { versementsAgence } = require('../controllers/trajetController');
router.get('/versements', authentifier, versementsAgence);
router.delete('/documents/:id', authentifier, supprimerMonDocument);

router.get('/notifications', authentifier, mesNotifications);

const { tableauDeBord, modifierProfil, changerMotDePasseAgence, televerserLogo, envoyerCodeAcces, verifierCodeAcces } = require('../controllers/agenceController');
router.get('/tableau-de-bord', authentifier, tableauDeBord);
router.put('/profil', authentifier, modifierProfil);
router.put('/mot-de-passe', authentifier, changerMotDePasseAgence);
router.post('/logo', authentifier, televerserLogo);
router.post('/envoyer-code-acces', authentifier, envoyerCodeAcces);
router.post('/verifier-code-acces', authentifier, verifierCodeAcces);

module.exports = router;