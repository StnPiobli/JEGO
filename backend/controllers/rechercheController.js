const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// RECHERCHER DES TRAJETS (route publique)
// Le voyageur cherche : départ + arrivée + date
// On ne montre QUE les agences validées (statut actif)
// ═══════════════════════════════════════════════════
async function rechercherTrajets(req, res) {
  try {
    const { ville_depart, ville_arrivee, date_depart } = req.query;

    // Vérifier les champs obligatoires
    if (!ville_depart || !ville_arrivee || !date_depart) {
      return res.status(400).json({
        error: 'Ville de départ, ville d\'arrivée et date sont obligatoires'
      });
    }

    // Rechercher les trajets correspondants
    const resultat = await pool.query(
      `SELECT
          t.id, t.date_depart, t.heure_depart, t.heure_arrivee_estimee,
          t.prix_base, t.categorie, t.statut,
          l.ville_depart, l.ville_arrivee, l.est_direct, l.distance_km,
          b.nom AS nom_bus, b.disposition, b.type_bus,
          b.climatisation, b.prises_usb, b.wifi, b.toilettes, b.sieges_inclinables,
          a.id AS agence_id, a.nom AS nom_agence, a.badge_certifie,
          (SELECT COUNT(*) FROM sieges s
           WHERE s.bus_id = b.id AND s.statut = 'disponible') AS places_disponibles
       FROM trajets t
       JOIN lignes l ON l.id = t.ligne_id
       JOIN bus b ON b.id = t.bus_id
       JOIN agences a ON a.id = t.agence_id
       WHERE LOWER(l.ville_depart) = LOWER($1)
         AND LOWER(l.ville_arrivee) = LOWER($2)
         AND t.date_depart = $3
         AND a.statut = 'actif'
         AND t.statut = 'programme'
       ORDER BY t.heure_depart`,
      [ville_depart, ville_arrivee, date_depart]
    );

    res.json({
      nombre_resultats: resultat.rows.length,
      trajets: resultat.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { rechercherTrajets };