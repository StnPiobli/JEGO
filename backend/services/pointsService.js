const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// SERVICE : GESTION DES JEGO POINTS
// Les paliers de reconversion sont lus depuis parametres_systeme,
// modifiables par l'admin sans toucher au code.
// ═══════════════════════════════════════════════════

// Récupérer les paliers actuels depuis la base
async function recupererPaliers() {
  const params = await pool.query(
    `SELECT cle, valeur FROM parametres_systeme
     WHERE cle IN ('points_palier_reduction_points', 'points_palier_reduction_fcfa', 'points_palier_gratuit_points')`
  );
  const p = {};
  params.rows.forEach(r => { p[r.cle] = parseInt(r.valeur); });
  // 0 est une valeur VALIDE : on ne retombe sur le defaut que si le
  // parametre est absent ou illisible (NaN), jamais quand il vaut 0.
  const lire = (cle, defaut) => Number.isInteger(p[cle]) ? p[cle] : defaut;
  return {
    reductionPoints: lire('points_palier_reduction_points', 500),
    reductionFcfa: lire('points_palier_reduction_fcfa', 500),
    gratuitPoints: lire('points_palier_gratuit_points', 1000)
  };
}

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

// Débiter des points (dépense) — vérifie le solde AVANT de débiter
async function debiterPoints(voyageurId, points, motif, billetId = null, client = null) {
  const executeur = client || pool;

  const solde = await executeur.query(
    `SELECT points_fidelite FROM voyageurs WHERE id = $1`,
    [voyageurId]
  );
  if (solde.rows.length === 0 || solde.rows[0].points_fidelite < points) {
    throw new Error('Solde de points insuffisant');
  }

  await executeur.query(
    `INSERT INTO jego_points (voyageur_id, points, type, motif, billet_id)
     VALUES ($1, $2, 'depense', $3, $4)`,
    [voyageurId, -Math.abs(points), motif, billetId]
  );
  await executeur.query(
    `UPDATE voyageurs SET points_fidelite = points_fidelite - $1 WHERE id = $2`,
    [points, voyageurId]
  );
}

// Calculer les points gagnés sur un montant payé (10 points / 1000 FCFA)
function calculerPointsGagnes(montant) {
  return Math.floor(montant / 1000) * 10;
}

module.exports = { crediterPoints, debiterPoints, calculerPointsGagnes, recupererPaliers };