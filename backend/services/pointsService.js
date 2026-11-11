const pool = require('../config/database');
const { lireParametreEntier } = require('./parametreService');

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

// Rendre les points dépensés en réduction sur un billet, quand c'est
// l'agence qui annule : le voyageur n'y est pour rien. Sans effet si
// rien n'a été dépensé, ou si les points ont déjà été rendus.
const MOTIF_POINTS_RENDUS = "Points rendus : trajet annulé par l'agence";

async function rendrePointsDepenses(billetId, client = null) {
  const executeur = client || pool;
  const r = await executeur.query(
    `SELECT voyageur_id, -SUM(points)::int AS depenses
       FROM jego_points
      WHERE billet_id = $1 AND type = 'depense'
      GROUP BY voyageur_id`,
    [billetId]
  );
  for (const { voyageur_id, depenses } of r.rows) {
    const deja = await executeur.query(
      `SELECT 1 FROM jego_points WHERE billet_id = $1 AND voyageur_id = $2 AND motif = $3`,
      [billetId, voyageur_id, MOTIF_POINTS_RENDUS]
    );
    if (depenses > 0 && deja.rows.length === 0) {
      await crediterPoints(voyageur_id, depenses, MOTIF_POINTS_RENDUS, billetId, executeur);
    }
  }
}

// Points gagnés sur un montant payé par Mobile Money (10 par 1 000 FCFA
// par défaut, réglable par l'admin)
async function calculerPointsGagnes(montant) {
  const parMille = await lireParametreEntier('points_par_1000_fcfa', 10);
  return Math.floor(montant / 1000) * parMille;
}

module.exports = { crediterPoints, debiterPoints, rendrePointsDepenses, calculerPointsGagnes, recupererPaliers };