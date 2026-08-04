const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// RECHERCHER DES TRAJETS (route publique)
// Le voyageur cherche par CODES de villes + date.
// On ne montre QUE les agences validées (statut actif).
//
// MULTI-ARRÊTS (nouveau) : ville_depart/ville_arrivee ne doivent plus
// forcément être les extrémités de la ligne -- n'importe quelle paire de
// points de la ligne peut être demandée (ex: "Loum -> Yaoundé" sur une
// ligne Douala-Loum-Pouma-Yaoundé). Le prix vient de ligne_troncon_prix
// pour ce segment exact ; si absent, on retombe sur t.prix_base UNIQUEMENT
// si le segment demandé couvre la ligne entière (rétrocompatible avec les
// lignes créées sans troncons_prix). Les places disponibles sont comptées
// par chevauchement réel sur les billets existants, pas par un statut
// statique de siège.
// ═══════════════════════════════════════════════════
async function rechercherTrajets(req, res) {
  try {
    const { ville_depart, ville_arrivee, date_depart } = req.query;

    if (!ville_depart || !ville_arrivee || !date_depart) {
      return res.status(400).json({
        error: 'Ville de départ, ville d\'arrivée et date sont obligatoires'
      });
    }

    const resultat = await pool.query(
      `SELECT
          t.id, t.date_depart, t.heure_depart, t.heure_arrivee_estimee,
          t.categorie, t.statut,
          vdp.ville AS code_depart, vap.ville AS code_arrivee,
          vdp.ordre AS ordre_depart, vap.ordre AS ordre_arrivee,
          vdp.lieu_prise_en_charge AS lieu_embarquement,
          vd.nom_affiche AS depart_affiche,
          va.nom_affiche AS arrivee_affiche,
          l.est_direct,
          CASE
            WHEN ltp.prix IS NOT NULL THEN ltp.prix
            WHEN vdp.ordre = 0 AND vap.ordre = (
              SELECT MAX(ordre) FROM ligne_points WHERE ligne_id = l.id
            ) THEN t.prix_base
            ELSE NULL
          END AS prix,
          b.nom AS nom_bus, b.disposition, b.type_bus,
          b.climatisation, b.prises_usb, b.wifi, b.toilettes, b.sieges_inclinables,
          a.id AS agence_id, a.nom AS nom_agence, a.badge_certifie,
          a.note_moyenne, a.nombre_avis,
          (
            SELECT COUNT(*) FROM sieges s
            WHERE s.bus_id = b.id
              AND s.statut NOT IN ('supprime_toilettes', 'desactive')
              AND NOT EXISTS (
                SELECT 1 FROM billets bl
                WHERE bl.siege_id = s.id AND bl.trajet_id = t.id AND bl.statut = 'confirme'
                  AND NOT (
                    vdp.ordre >= COALESCE(bl.point_debarquement_ordre, 1)
                    OR COALESCE(bl.point_embarquement_ordre, 0) >= vap.ordre
                  )
              )
          ) AS places_disponibles,
          (
            SELECT COALESCE(json_agg(
                     json_build_object('ville', lp.ville, 'ordre', lp.ordre, 'lieu_prise_en_charge', lp.lieu_prise_en_charge)
                     ORDER BY lp.ordre
                   ), '[]'::json)
            FROM ligne_points lp
            WHERE lp.ligne_id = l.id AND lp.ordre > vdp.ordre AND lp.ordre < vap.ordre
          ) AS arrets_restants
       FROM trajets t
       JOIN lignes l ON l.id = t.ligne_id
       JOIN ligne_points vdp ON vdp.ligne_id = l.id AND vdp.ville = LOWER($1)
       JOIN ligne_points vap ON vap.ligne_id = l.id AND vap.ville = LOWER($2) AND vap.ordre > vdp.ordre
       LEFT JOIN ligne_troncon_prix ltp
         ON ltp.ligne_id = l.id AND ltp.ordre_depart = vdp.ordre AND ltp.ordre_arrivee = vap.ordre
       JOIN villes vd ON vd.code = vdp.ville
       JOIN villes va ON va.code = vap.ville
       JOIN bus b ON b.id = t.bus_id
       JOIN agences a ON a.id = t.agence_id
       WHERE t.date_depart = $3
         AND a.statut = 'actif'
         AND t.statut = 'programme'
         AND (t.date_depart > CURRENT_DATE OR (t.date_depart = CURRENT_DATE AND t.heure_depart > CURRENT_TIME))
       ORDER BY t.heure_depart`,
      [ville_depart, ville_arrivee, date_depart]
    );

    // Un trajet sans prix résolu pour ce segment précis (ni tronçon dédié,
    // ni segment complet) n'est pas vendable sur ce couple de villes --
    // on ne le montre pas, plutôt que d'afficher un prix inventé.
    const trajetsVendables = resultat.rows.filter(t => t.prix !== null);

    res.json({
      nombre_resultats: trajetsVendables.length,
      trajets: trajetsVendables
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { rechercherTrajets };
