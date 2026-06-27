const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// RECHERCHER DES TRAJETS (route publique)
// Le voyageur cherche par CODES de villes + date
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
    // On joint la table villes deux fois : une pour le départ, une pour l'arrivée
    // afin de récupérer les noms d'affichage (jolis noms avec accents)
    const resultat = await pool.query(
      `SELECT
          t.id, t.date_depart, t.heure_depart, t.heure_arrivee_estimee,
          t.prix_base, t.categorie, t.statut,
          l.ville_depart AS code_depart, l.ville_arrivee AS code_arrivee,
          vd.nom_affiche AS depart_affiche,
          va.nom_affiche AS arrivee_affiche,
          l.est_direct, l.distance_km,
          b.nom AS nom_bus, b.disposition, b.type_bus,
          b.climatisation, b.prises_usb, b.wifi, b.toilettes, b.sieges_inclinables,
          a.id AS agence_id, a.nom AS nom_agence, a.badge_certifie,
          (SELECT COUNT(*) FROM sieges s
           WHERE s.bus_id = b.id AND s.statut = 'disponible') AS places_disponibles
       FROM trajets t
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       JOIN bus b ON b.id = t.bus_id
       JOIN agences a ON a.id = t.agence_id
       WHERE l.ville_depart = LOWER($1)
         AND l.ville_arrivee = LOWER($2)
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