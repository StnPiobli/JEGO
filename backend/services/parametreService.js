const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// SERVICE : LECTURE DES PARAMETRES SYSTEME
// Centralise la lecture de parametres_systeme pour eviter le piege
// classique du "|| defaut" qui traite 0 comme une valeur absente.
// 0 est TOUJOURS une valeur valide : on ne retombe sur le defaut que si
// le parametre est absent de la table ou illisible (NaN).
// ═══════════════════════════════════════════════════

async function lireParametreEntier(cle, defaut) {
  try {
    const r = await pool.query(
      'SELECT valeur FROM parametres_systeme WHERE cle = $1',
      [cle]
    );
    if (r.rows.length === 0) return defaut;
    const n = parseInt(r.rows[0].valeur, 10);
    return Number.isInteger(n) ? n : defaut;
  } catch (e) {
    return defaut;
  }
}

module.exports = { lireParametreEntier };
