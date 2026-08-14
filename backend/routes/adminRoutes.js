const express = require('express');
const router = express.Router();
const {
  connexion, agencesEnAttente, validerAgence, refuserAgence,
  listerParametres, modifierParametre,
  listerVoyageurs, modifierStatutVoyageur,
  listerFrais, modifierGrilleFrais, creerDerogationFrais, supprimerDerogationFrais,
  listerTrajetsAdmin, resumeTrajetsAdmin,
  resumeFinances, serieFinances, transactionsFinances,
  derniereTransaction, resumeJournal, tachesATraiter,
  resumePoints, pointsParVoyageur, usagesPoints,
  moderationListe, moderationTraiter, listerLogs
} = require('../controllers/adminController');

// Accès simple admin, sans permission RBAC dédiée — cohérent avec la
// décision d'un Super Admin unique tant que l'équipe n'existe pas.
function adminSeul(req, res, next) {
  if (req.utilisateur.type !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}
const {
  listerAgencesAdmin, documentsAgence, telechargerDocument, statuerDocument,
  demanderPieces, listerDemandesPieces, cloreDemandePieces,
  envoyerMessageAgence, rappelProgrammation, desactiverAgence
} = require('../controllers/agenceAdminController');
const { authentifier, verifierPermission } = require('../middleware/auth');
const { rapportAdminDetaille } = require('../controllers/rapportController');

router.post('/connexion', connexion);
router.get('/agences-en-attente', authentifier, verifierPermission('valider_agence'), agencesEnAttente);
router.put('/agences/:id/valider', authentifier, verifierPermission('valider_agence'), validerAgence);
router.put('/agences/:id/refuser', authentifier, verifierPermission('refuser_agence'), refuserAgence);
router.get('/parametres', authentifier, verifierPermission('modifier_parametres'), listerParametres);
router.put('/parametres/:cle', authentifier, verifierPermission('modifier_parametres'), modifierParametre);

// Voyageurs
router.get('/voyageurs', authentifier, adminSeul, listerVoyageurs);
router.put('/voyageurs/:id/statut', authentifier, adminSeul, modifierStatutVoyageur);

// Agences — liste filtrable, distincte de la file de validation
router.get('/agences', authentifier, adminSeul, listerAgencesAdmin);
router.get('/agences/:id/documents', authentifier, adminSeul, documentsAgence);
router.get('/agences/:id/documents/:docId/fichier', authentifier, adminSeul, telechargerDocument);
router.put('/agences/:id/documents/:docId', authentifier, adminSeul, statuerDocument);
router.post('/agences/:id/demande-pieces', authentifier, adminSeul, demanderPieces);
router.get('/agences/:id/demandes-pieces', authentifier, adminSeul, listerDemandesPieces);
router.put('/agences/:id/demandes-pieces/:demandeId/clore', authentifier, adminSeul, cloreDemandePieces);
router.post('/agences/:id/message', authentifier, adminSeul, envoyerMessageAgence);
router.post('/agences/:id/rappel', authentifier, adminSeul, rappelProgrammation);
router.put('/agences/:id/desactiver', authentifier, adminSeul, desactiverAgence);

// Configuration des frais
router.get('/frais', authentifier, adminSeul, listerFrais);
router.put('/frais/grille', authentifier, adminSeul, modifierGrilleFrais);
router.post('/frais/derogations', authentifier, adminSeul, creerDerogationFrais);
router.delete('/frais/derogations/:id', authentifier, adminSeul, supprimerDerogationFrais);

// Billets & trajets (vue globale toutes agences)
router.get('/trajets', authentifier, adminSeul, listerTrajetsAdmin);
router.get('/trajets/resume', authentifier, adminSeul, resumeTrajetsAdmin);

// Finances
router.get('/finances/resume', authentifier, adminSeul, resumeFinances);
router.get('/finances/serie', authentifier, adminSeul, serieFinances);
router.get('/finances/transactions', authentifier, adminSeul, transactionsFinances);
router.get('/finances/derniere-transaction', authentifier, adminSeul, derniereTransaction);

// Tableau de bord
router.get('/dashboard/journal', authentifier, adminSeul, resumeJournal);
router.get('/dashboard/a-traiter', authentifier, adminSeul, tachesATraiter);

// Rapports
router.get('/rapports', authentifier, adminSeul, rapportAdminDetaille);

// Points JEGO
router.get('/points/resume', authentifier, adminSeul, resumePoints);
router.get('/points/voyageurs', authentifier, adminSeul, pointsParVoyageur);
router.get('/points/usages', authentifier, adminSeul, usagesPoints);

// Modération
router.get('/moderation', authentifier, adminSeul, moderationListe);
router.put('/moderation/:id', authentifier, adminSeul, moderationTraiter);

// Sécurité — logs
router.get('/logs', authentifier, adminSeul, listerLogs);

module.exports = router;