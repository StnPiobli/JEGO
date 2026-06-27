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

// ═══════════════════════════════════════════════════
// VERROUILLER UN SIÈGE (soft lock — 5 min)
// Route protégée : le voyageur doit être connecté
// ═══════════════════════════════════════════════════
async function verrouillerSiege(req, res) {
  const client = await pool.connect();
  try {
    const voyageurId = req.utilisateur.id;
    const { trajet_id, siege_id } = req.body;

    if (!trajet_id || !siege_id) {
      return res.status(400).json({ error: 'Trajet et siège sont obligatoires' });
    }

    await client.query('BEGIN');

    // 1. Vérifier que le siège existe, appartient au bon bus, et est vendable
    const siegeCheck = await client.query(
      `SELECT s.id, s.numero, s.statut, s.est_premium
       FROM sieges s
       JOIN trajets t ON t.bus_id = s.bus_id
       WHERE s.id = $1 AND t.id = $2`,
      [siege_id, trajet_id]
    );

    if (siegeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Siège introuvable pour ce trajet' });
    }

    const siege = siegeCheck.rows[0];

    // Refuser les sièges non vendables
    if (siege.statut === 'supprime_toilettes') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce siège n\'est pas disponible (emplacement toilettes)' });
    }
    if (siege.statut === 'desactive') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce siège est indisponible (hors service)' });
    }

    // 2. Vérifier qu'aucun billet confirmé n'existe pour ce siège+trajet
    const billetCheck = await client.query(
      `SELECT id FROM billets
       WHERE siege_id = $1 AND trajet_id = $2 AND statut = 'confirme'`,
      [siege_id, trajet_id]
    );
    if (billetCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ce siège est déjà vendu' });
    }

    // 3. Nettoyer un éventuel verrou EXPIRÉ sur ce siège+trajet
    await client.query(
      `DELETE FROM soft_locks
       WHERE siege_id = $1 AND trajet_id = $2 AND expire_le < NOW()`,
      [siege_id, trajet_id]
    );

    // 4. Vérifier s'il reste un verrou ACTIF (par quelqu'un d'autre)
    const verrouExistant = await client.query(
      `SELECT id, voyageur_id FROM soft_locks
       WHERE siege_id = $1 AND trajet_id = $2 AND expire_le > NOW()`,
      [siege_id, trajet_id]
    );
    if (verrouExistant.rows.length > 0) {
      // Si c'est le même voyageur, on le laisse (il re-sélectionne son siège)
      if (verrouExistant.rows[0].voyageur_id === voyageurId) {
        await client.query('ROLLBACK');
        return res.status(200).json({ message: 'Vous avez déjà ce siège verrouillé' });
      }
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ce siège est en cours de réservation par un autre voyageur' });
    }

    // 5. Créer le verrou : expire dans 5 minutes
    const verrou = await client.query(
      `INSERT INTO soft_locks (siege_id, trajet_id, voyageur_id, expire_le, prolongations)
       VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes', 0)
       RETURNING id, expire_le`,
      [siege_id, trajet_id, voyageurId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: `Siège ${siege.numero} verrouillé pour 5 minutes`,
      verrou_id: verrou.rows[0].id,
      siege: siege.numero,
      expire_le: verrou.rows[0].expire_le
    });

  } catch (err) {
    await client.query('ROLLBACK');
    // Si la contrainte unique a bloqué (race condition), message clair
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ce siège vient d\'être pris par un autre voyageur' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// PROLONGER UN VERROU (+5 min, max 2 fois)
// ═══════════════════════════════════════════════════
async function prolongerVerrou(req, res) {
  try {
    const voyageurId = req.utilisateur.id;
    const verrouId = req.params.id;

    // Récupérer le verrou et vérifier qu'il appartient au voyageur
    const verrou = await pool.query(
      `SELECT id, voyageur_id, expire_le, prolongations
       FROM soft_locks WHERE id = $1`,
      [verrouId]
    );

    if (verrou.rows.length === 0) {
      return res.status(404).json({ error: 'Verrou introuvable ou déjà expiré' });
    }

    const v = verrou.rows[0];

    if (v.voyageur_id !== voyageurId) {
      return res.status(403).json({ error: 'Ce verrou ne vous appartient pas' });
    }

    // Vérifier que le verrou n'est pas déjà expiré
    if (new Date(v.expire_le) < new Date()) {
      return res.status(410).json({ error: 'Ce verrou a déjà expiré' });
    }

    // Vérifier la limite de prolongations (max 2)
    if (v.prolongations >= 2) {
      return res.status(403).json({
        error: 'Limite de prolongations atteinte (2 maximum). Veuillez finaliser le paiement.'
      });
    }

    // Prolonger de 5 minutes et incrémenter le compteur
    const resultat = await pool.query(
      `UPDATE soft_locks
       SET expire_le = expire_le + INTERVAL '5 minutes',
           prolongations = prolongations + 1
       WHERE id = $1
       RETURNING expire_le, prolongations`,
      [verrouId]
    );

    res.json({
      message: 'Verrou prolongé de 5 minutes',
      expire_le: resultat.rows[0].expire_le,
      prolongations: resultat.rows[0].prolongations,
      prolongations_restantes: 2 - resultat.rows[0].prolongations
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { planTrajet, verrouillerSiege, prolongerVerrou };