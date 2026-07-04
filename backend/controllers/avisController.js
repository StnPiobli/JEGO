const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// NOTER UN VOYAGE (voyageur avec billet utilisé)
// 4 critères de 1 à 5, note globale calculée.
// Recalcule les moyennes agence + chauffeur.
// ═══════════════════════════════════════════════════
async function noterVoyage(req, res) {
  const client = await pool.connect();
  try {
    const voyageurId = req.utilisateur.id;
    const { trajet_id, note_service, note_conduite, note_horaires, note_confort, commentaire } = req.body;

    // 1. Vérifier les champs
    if (!trajet_id || !note_service || !note_conduite || !note_horaires || !note_confort) {
      return res.status(400).json({ error: 'Trajet et les 4 notes (service, conduite, horaires, confort) sont obligatoires' });
    }

    // Les notes doivent être entre 1 et 5
    const notes = [note_service, note_conduite, note_horaires, note_confort];
    for (const n of notes) {
      if (n < 1 || n > 5) {
        return res.status(400).json({ error: 'Chaque note doit être entre 1 et 5' });
      }
    }

    await client.query('BEGIN');

    // 2. Vérifier que le voyageur a un billet UTILISÉ sur ce trajet
    //    (le voyage doit avoir eu lieu)
    const billetCheck = await client.query(
      `SELECT id FROM billets
       WHERE trajet_id = $1 AND voyageur_id = $2 AND statut = 'utilise'`,
      [trajet_id, voyageurId]
    );
    if (billetCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Vous ne pouvez noter que les voyages que vous avez effectués' });
    }

    // 3. Récupérer l'agence et le chauffeur du trajet
    const trajetInfo = await client.query(
      `SELECT agence_id, chauffeur_id FROM trajets WHERE id = $1`,
      [trajet_id]
    );
    const { agence_id, chauffeur_id } = trajetInfo.rows[0];

    // 4. Calculer la note globale (moyenne des 4 critères)
    const noteGlobale = Math.round(((parseFloat(note_service) + parseFloat(note_conduite) + parseFloat(note_horaires) + parseFloat(note_confort)) / 4) * 10) / 10;

    // 5. Créer l'avis (la contrainte unique bloque le doublon)
    try {
      await client.query(
        `INSERT INTO avis
          (trajet_id, voyageur_id, agence_id, chauffeur_id,
           note_globale, note_service, note_conduite, note_horaires, note_confort, commentaire)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [trajet_id, voyageurId, agence_id, chauffeur_id,
         noteGlobale, note_service, note_conduite, note_horaires, note_confort, commentaire || null]
      );
    } catch (e) {
      if (e.code === '23505') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Vous avez déjà noté ce voyage' });
      }
      throw e;
    }

    // 6. Recalculer la note moyenne de l'AGENCE
    await client.query(
      `UPDATE agences SET
        note_moyenne = (SELECT ROUND(AVG(note_globale), 2) FROM avis WHERE agence_id = $1 AND statut = 'visible'),
        nombre_avis = (SELECT COUNT(*) FROM avis WHERE agence_id = $1 AND statut = 'visible')
       WHERE id = $1`,
      [agence_id]
    );

    // 7. Recalculer la note moyenne du CHAUFFEUR (s'il y en a un)
    if (chauffeur_id) {
      await client.query(
        `UPDATE chauffeurs SET
          note_moyenne = (SELECT ROUND(AVG(note_conduite), 2) FROM avis WHERE chauffeur_id = $1 AND statut = 'visible')
         WHERE id = $1`,
        [chauffeur_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Merci pour votre avis !',
      note_globale: noteGlobale
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// VOIR LES AVIS D'UNE AGENCE (public — la machine à confiance)
// ═══════════════════════════════════════════════════
async function avisAgence(req, res) {
  try {
    const agenceId = req.params.id;

    // Infos agence + note
    const agence = await pool.query(
      `SELECT nom, note_moyenne, nombre_avis, badge_certifie
       FROM agences WHERE id = $1 AND statut = 'actif'`,
      [agenceId]
    );
    if (agence.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    // Les avis visibles, du plus récent au plus ancien
    const avis = await pool.query(
      `SELECT a.note_globale, a.note_service, a.note_conduite, a.note_horaires, a.note_confort,
              a.commentaire, a.cree_le,
              v.prenom AS voyageur_prenom
       FROM avis a
       JOIN voyageurs v ON v.id = a.voyageur_id
       WHERE a.agence_id = $1 AND a.statut = 'visible'
       ORDER BY a.cree_le DESC
       LIMIT 50`,
      [agenceId]
    );

    res.json({
      agence: agence.rows[0],
      avis: avis.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { noterVoyage, avisAgence };