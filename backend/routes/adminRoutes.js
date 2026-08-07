const express = require('express');
const router = express.Router();
const {
  connexion, agencesEnAttente, validerAgence, refuserAgence,
  listerParametres, modifierParametre,
  listerVoyageurs, modifierStatutVoyageur,
  listerFrais, modifierGrilleFrais, creerDerogationFrais, supprimerDerogationFrais,
  listerAgences,
  listerTrajetsAdmin, resumeTrajetsAdmin
} = require('../controllers/adminController');

// Accès simple admin, sans permission RBAC dédiée — cohérent avec la
// décision d'un Super Admin unique tant que l'équipe n'existe pas.
function adminSeul(req, res, next) {
  if (req.utilisateur.type !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}
const { authentifier, verifierPermission } = require('../middleware/auth');

router.post('/connexion', connexion);
router.get('/agences-en-attente', authentifier, verifierPermission('valider_agence'), agencesEnAttente);
router.put('/agences/:id/valider', authentifier, verifierPermission('valider_agence'), validerAgence);
router.put('/agences/:id/refuser', authentifier, verifierPermission('refuser_agence'), refuserAgence);
router.get('/parametres', authentifier, verifierPermission('modifier_parametres'), listerParametres);
router.put('/parametres/:cle', authentifier, verifierPermission('modifier_parametres'), modifierParametre);

// Voyageurs
router.get('/voyageurs', authentifier, adminSeul, listerVoyageurs);
router.put('/voyageurs/:id/statut', authentifier, adminSeul, modifierStatutVoyageur);

// Agences (liste filtrable — distincte de la file de validation)
router.get('/agences', authentifier, adminSeul, listerAgences);

// Configuration des frais
router.get('/frais', authentifier, adminSeul, listerFrais);
router.put('/frais/grille', authentifier, adminSeul, modifierGrilleFrais);
router.post('/frais/derogations', authentifier, adminSeul, creerDerogationFrais);
router.delete('/frais/derogations/:id', authentifier, adminSeul, supprimerDerogationFrais);

// Billets & trajets (vue globale toutes agences)
router.get('/trajets', authentifier, adminSeul, listerTrajetsAdmin);
router.get('/trajets/resume', authentifier, adminSeul, resumeTrajetsAdmin);

module.exports = router;