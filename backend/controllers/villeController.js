const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// AUTOCOMPLÉTION DES VILLES (route publique)
// Le client tape "ba" → Bafoussam, Bamenda...
// On cherche dans le nom ET les abréviations
// ═══════════════════════════════════════════════════
async function autocompletion(req, res) {
  try {
    const { q } = req.query; // q = ce que le client tape

    // Si rien tapé ou moins d'1 caractère, on ne renvoie rien
    if (!q || q.trim().length < 1) {
      return res.json({ villes: [] });
    }

    const recherche = q.trim().toLowerCase();

    // On cherche les villes dont :
    //   - le code commence par la recherche, OU
    //   - le nom d'affichage contient la recherche, OU
    //   - une des abréviations commence par la recherche
    const resultat = await pool.query(
      `SELECT code, nom_affiche, region
       FROM villes
       WHERE actif = true
         AND (
           code LIKE $1
           OR LOWER(nom_affiche) LIKE $2
           OR EXISTS (
             SELECT 1 FROM unnest(abreviations) AS abrev
             WHERE abrev LIKE $1
           )
         )
       ORDER BY
         CASE WHEN code LIKE $1 THEN 0 ELSE 1 END,
         nom_affiche
       LIMIT 10`,
      [`${recherche}%`, `%${recherche}%`]
    );

    res.json({ villes: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { autocompletion };