const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// SERVICE : GESTION DES JEGO POINTS
// crediterPoints accepte un client de transaction en 2e position
// pour rester dans la même transaction que l'action qui l'appelle.
// Si aucun client n'est fourni, utilise pool directement (hors transaction).
// ═══════════════════════════════════════════════════

// Créditer des points (gain)
async function crediterPoints(voyageurId, points, motif, billetId = null, client = null) {
  const executeur = client || pool;
  await executeur.query(
    `INSERT INTO jego_points (voyageur_id, points, type, motif, billet_id)
     VALUES ($1, $2, 'gain', $3, $4)`,
    [voyageurId, points, motif, billetId]
  );
  await executeur.query(
    `UPDATE voyageurs SET points_fidelite = points_fidelite + $1 WHERE id = $2`,
    [points, voyageurId]
  );
}

// Calculer les points gagnés sur un montant payé (10 points / 1000 FCFA)
function calculerPointsGagnes(montant) {
  return Math.floor(montant / 1000) * 10;
}

module.exports = { crediterPoints, calculerPointsGagnes };