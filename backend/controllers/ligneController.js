const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// CRÉER UNE LIGNE
// L'agence envoie les CODES de villes (ex: "douala", "yaounde")
//
// MULTI-ARRÊTS (nouveau) : deux champs optionnels supplémentaires.
//
// points : liste ORDONNÉE de tous les points de la ligne, y compris le
//   départ et l'arrivée. Chaque élément : { ville: <code>, lieu_prise_en_charge }.
//   Le premier élément DOIT correspondre à ville_depart, le dernier à
//   ville_arrivee. Si absent, une ligne simple à 2 points (0=départ,
//   1=arrivée) est créée automatiquement -- comportement identique à avant
//   pour les lignes sans arrêts.
//
// troncons_prix : liste de { ordre_depart, ordre_arrivee, prix } pour
//   chaque segment vendable. Le segment complet (0 -> dernier point) doit
//   TOUJOURS avoir un prix défini, sinon aucun trajet sur cette ligne ne
//   pourra être recherché ni réservé.
// ═══════════════════════════════════════════════════
async function creerLigne(req, res) {
  const client = await pool.connect();
  try {
    const agenceId = req.utilisateur.id;
    const { ville_depart, ville_arrivee, est_direct, arrets, distance_km, points, troncons_prix } = req.body;

    if (!ville_depart || !ville_arrivee) {
      return res.status(400).json({ error: 'Ville de départ et ville d\'arrivée sont obligatoires' });
    }
    if (ville_depart === ville_arrivee) {
      return res.status(400).json({ error: 'La ville de départ et d\'arrivée ne peuvent pas être identiques' });
    }

    // Construire la liste de points à utiliser : celle fournie, ou une
    // liste simple à 2 points par défaut (rétrocompatible).
    const pointsAUtiliser = (points && points.length >= 2)
      ? points
      : [{ ville: ville_depart, lieu_prise_en_charge: null }, { ville: ville_arrivee, lieu_prise_en_charge: null }];

    if (pointsAUtiliser[0].ville !== ville_depart) {
      return res.status(400).json({ error: 'Le premier point doit correspondre à ville_depart' });
    }
    if (pointsAUtiliser[pointsAUtiliser.length - 1].ville !== ville_arrivee) {
      return res.status(400).json({ error: 'Le dernier point doit correspondre à ville_arrivee' });
    }

    // Vérifier que toutes les villes utilisées existent
    const codesVilles = [...new Set(pointsAUtiliser.map(p => p.ville))];
    const villesCheck = await pool.query(
      'SELECT code FROM villes WHERE code = ANY($1) AND actif = true',
      [codesVilles]
    );
    if (villesCheck.rows.length !== codesVilles.length) {
      return res.status(400).json({
        error: 'Une ou plusieurs villes des points sont inconnues. Utilisez des codes de ville valides.'
      });
    }

    // Prix par tronçon : au minimum, le segment complet doit être fourni.
    const dernierOrdre = pointsAUtiliser.length - 1;
    const troncons = troncons_prix && troncons_prix.length > 0
      ? troncons_prix
      : [];
    const aUnPrixComplet = troncons.some(t => t.ordre_depart === 0 && t.ordre_arrivee === dernierOrdre);
    if (troncons.length > 0 && !aUnPrixComplet) {
      return res.status(400).json({
        error: `Le prix du segment complet (ordre_depart=0, ordre_arrivee=${dernierOrdre}) est obligatoire dans troncons_prix.`
      });
    }
    for (const t of troncons) {
      if (t.ordre_depart < 0 || t.ordre_arrivee > dernierOrdre || t.ordre_arrivee <= t.ordre_depart) {
        return res.status(400).json({ error: `Tronçon invalide : ordre_depart=${t.ordre_depart}, ordre_arrivee=${t.ordre_arrivee}` });
      }
      if (!t.prix || t.prix <= 0) {
        return res.status(400).json({ error: `Prix invalide pour le tronçon ${t.ordre_depart}->${t.ordre_arrivee}` });
      }
    }

    await client.query('BEGIN');

    const resultat = await client.query(
      `INSERT INTO lignes
        (agence_id, ville_depart, ville_arrivee, est_direct, arrets, distance_km)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, ville_depart, ville_arrivee, est_direct, arrets, distance_km`,
      [agenceId, ville_depart, ville_arrivee,
       est_direct !== undefined ? est_direct : true,
       arrets || null, distance_km || null]
    );
    const ligneId = resultat.rows[0].id;

    for (let i = 0; i < pointsAUtiliser.length; i++) {
      await client.query(
        `INSERT INTO ligne_points (ligne_id, ville, ordre, lieu_prise_en_charge)
         VALUES ($1, $2, $3, $4)`,
        [ligneId, pointsAUtiliser[i].ville, i, pointsAUtiliser[i].lieu_prise_en_charge || null]
      );
    }

    for (const t of troncons) {
      await client.query(
        `INSERT INTO ligne_troncon_prix (ligne_id, ordre_depart, ordre_arrivee, prix)
         VALUES ($1, $2, $3, $4)`,
        [ligneId, t.ordre_depart, t.ordre_arrivee, t.prix]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Ligne créée avec succès',
      ligne: resultat.rows[0],
      points: pointsAUtiliser.map((p, i) => ({ ordre: i, ...p })),
      troncons_prix: troncons
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// LISTER LES LIGNES DE L'AGENCE
// Inclut désormais les points et les prix par tronçon.
// ═══════════════════════════════════════════════════
async function listerLignes(req, res) {
  try {
    const agenceId = req.utilisateur.id;

    const lignes = await pool.query(
      `SELECT id, ville_depart, ville_arrivee, est_direct, arrets, distance_km, cree_le
       FROM lignes WHERE agence_id = $1
       ORDER BY cree_le DESC`,
      [agenceId]
    );

    const ligneIds = lignes.rows.map(l => l.id);
    let pointsParLigne = {};
    let prixParLigne = {};

    if (ligneIds.length > 0) {
      const points = await pool.query(
        `SELECT lp.ligne_id, v.nom_affiche AS ville, lp.ordre, lp.lieu_prise_en_charge
         FROM ligne_points lp
         JOIN villes v ON v.code = lp.ville
         WHERE lp.ligne_id = ANY($1) ORDER BY lp.ligne_id, lp.ordre`,
        [ligneIds]
      );
      for (const p of points.rows) {
        (pointsParLigne[p.ligne_id] ||= []).push(p);
      }

      const prix = await pool.query(
        `SELECT ligne_id, ordre_depart, ordre_arrivee, prix
         FROM ligne_troncon_prix WHERE ligne_id = ANY($1) ORDER BY ligne_id, ordre_depart, ordre_arrivee`,
        [ligneIds]
      );
      for (const p of prix.rows) {
        (prixParLigne[p.ligne_id] ||= []).push(p);
      }
    }

    const lignesCompletes = lignes.rows.map(l => ({
      ...l,
      points: pointsParLigne[l.id] || [],
      troncons_prix: prixParLigne[l.id] || []
    }));

    res.json({ lignes: lignesCompletes });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// SUPPRIMER UNE LIGNE
// ligne_points et ligne_troncon_prix partent automatiquement
// (ON DELETE CASCADE défini en migration).
// ═══════════════════════════════════════════════════
async function supprimerLigne(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const ligneId = req.params.id;

    const ligneCheck = await pool.query(
      'SELECT id FROM lignes WHERE id = $1 AND agence_id = $2',
      [ligneId, agenceId]
    );
    if (ligneCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ligne introuvable' });
    }

    const trajetsCheck = await pool.query(
      'SELECT id FROM trajets WHERE ligne_id = $1 LIMIT 1',
      [ligneId]
    );
    if (trajetsCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'Impossible de supprimer : des trajets utilisent cette ligne'
      });
    }

    await pool.query('DELETE FROM lignes WHERE id = $1', [ligneId]);

    res.json({ message: 'Ligne supprimée' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { creerLigne, listerLignes, supprimerLigne };
