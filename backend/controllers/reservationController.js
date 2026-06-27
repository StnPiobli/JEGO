const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// VOIR LE PLAN DU BUS POUR UN TRAJET (route publique)
// Montre quels sièges sont libres / pris pour CE trajet
// ═══════════════════════════════════════════════════
async function planTrajet(req, res) {
  try {
    const trajetId = req.params.id;

    // 1. Récupérer le trajet + son bus + infos villes
    const trajetResult = await pool.query(
      `SELECT
          t.id, t.date_depart, t.heure_depart, t.heure_arrivee_estimee,
          t.prix_base, t.categorie, t.bus_id,
          vd.nom_affiche AS depart_affiche,
          va.nom_affiche AS arrivee_affiche,
          b.nom AS nom_bus, b.disposition, b.type_bus,
          b.supplement_premium, b.nombre_rangees
       FROM trajets t
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       JOIN bus b ON b.id = t.bus_id
       WHERE t.id = $1`,
      [trajetId]
    );

    if (trajetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trajet introuvable' });
    }
    const trajet = trajetResult.rows[0];

    // 2. Récupérer tous les sièges du bus AVEC leur disponibilité pour ce trajet
    // LEFT JOIN sur billets : si un billet confirmé existe pour ce siège+trajet,
    // alors le siège est pris.
    const siegesResult = await pool.query(
      `SELECT
          s.id, s.numero, s.rangee, s.position, s.type_position,
          s.est_premium, s.statut AS statut_siege,
          CASE
            WHEN s.statut = 'supprime_toilettes' THEN 'toilettes'
            WHEN s.statut = 'desactive' THEN 'desactive'
            WHEN bil.id IS NOT NULL THEN 'pris'
            ELSE 'disponible'
          END AS disponibilite
       FROM sieges s
       LEFT JOIN billets bil
         ON bil.siege_id = s.id
         AND bil.trajet_id = $1
         AND bil.statut = 'confirme'
       WHERE s.bus_id = $2
       ORDER BY s.rangee, s.position`,
      [trajetId, trajet.bus_id]
    );

    res.json({
      trajet: {
        id: trajet.id,
        depart: trajet.depart_affiche,
        arrivee: trajet.arrivee_affiche,
        date_depart: trajet.date_depart,
        heure_depart: trajet.heure_depart,
        prix_base: trajet.prix_base,
        categorie: trajet.categorie,
        nom_bus: trajet.nom_bus,
        disposition: trajet.disposition,
        type_bus: trajet.type_bus,
        supplement_premium: trajet.supplement_premium
      },
      sieges: siegesResult.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { planTrajet };