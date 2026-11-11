const express = require('express');
const router = express.Router();
const { lireParametreEntier } = require('../services/parametreService');

// ═══════════════════════════════════════════════════
// TARIFS PUBLICS (route publique)
// Ce que l'application affiche avant le paiement : prix des options,
// règles du billet flexible, points. Ce sont les mêmes réglages que le
// serveur applique au paiement : si l'admin les change, l'écran suit.
// ═══════════════════════════════════════════════════
router.get('/tarifs', async (req, res) => {
  try {
    const lire = (cle, defaut) => lireParametreEntier(cle, defaut);
    res.json({
      option_choix_siege_fcfa: await lire('option_choix_siege_fcfa', 500),
      option_flexible_pourcent: await lire('option_flexible_pourcent', 10),
      flexible_delai_heures: await lire('flexible_delai_heures', 24),
      flexible_remboursement_avant_delai_pourcent: await lire('flexible_remboursement_avant_delai_pourcent', 80),
      flexible_remboursement_apres_delai_pourcent: await lire('flexible_remboursement_apres_delai_pourcent', 50),
      retard_seuil_compensation_heures: await lire('retard_seuil_compensation_heures', 4),
      retard_points_compensation: await lire('retard_points_compensation', 500),
      points_par_1000_fcfa: await lire('points_par_1000_fcfa', 10),
      points_palier_reduction_points: await lire('points_palier_reduction_points', 500),
      points_palier_reduction_fcfa: await lire('points_palier_reduction_fcfa', 500),
      points_palier_gratuit_points: await lire('points_palier_gratuit_points', 1000)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
