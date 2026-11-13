const pool = require('../config/database');
const { recalculerNotes } = require('../services/noteService');
const { erreurServeur } = require('../utils/erreurServeur');

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

    // 6. Recalculer les notes de l'agence et du chauffeur
    await recalculerNotes({ agenceId: agence_id, chauffeurId: chauffeur_id }, client);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Merci pour votre avis !',
      note_globale: noteGlobale
    });

  } catch (err) {
    await client.query('ROLLBACK');
    erreurServeur(res, err);
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
              -- Le prénom n'est renvoyé que si le voyageur l'a autorisé.
              -- Sinon rien ne sort de la base : l'anonymat ne doit pas
              -- dépendre de ce que l'application veut bien afficher.
              CASE WHEN v.avis_avec_nom THEN v.prenom ELSE NULL END
                AS voyageur_prenom
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
    erreurServeur(res, err);
  }
}


// ═══════════════════════════════════════════════════
// AVIS D'UN TRAJET (agence)
//
// L'agence voit comment son voyage a ete juge : notes et commentaires,
// avec le nom du voyageur seulement s'il a accepte de le montrer.
// ═══════════════════════════════════════════════════
async function avisTrajet(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const trajetId = req.params.id;
    const check = await pool.query(
      `SELECT id FROM trajets WHERE id = $1 AND agence_id = $2`,
      [trajetId, req.utilisateur.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Trajet introuvable' });
    }

    const resultat = await pool.query(
      `SELECT a.id, a.note_globale, a.note_service, a.note_conduite,
              a.note_horaires, a.note_confort, a.commentaire,
              to_char(a.cree_le, 'DD/MM/YYYY') AS date_avis,
              CASE WHEN v.avis_avec_nom THEN v.prenom || ' ' || v.nom ELSE NULL END AS voyageur
         FROM avis a
         JOIN voyageurs v ON v.id = a.voyageur_id
        WHERE a.trajet_id = $1 AND a.statut <> 'supprime'
        ORDER BY a.cree_le DESC`,
      [trajetId]
    );

    const notes = resultat.rows.map((r) => Number(r.note_globale)).filter((n) => !Number.isNaN(n));
    const moyenne = notes.length
      ? Math.round((notes.reduce((s, n) => s + n, 0) / notes.length) * 10) / 10
      : null;

    res.json({ nombre: resultat.rows.length, moyenne, avis: resultat.rows });
  } catch (err) {
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// MES AVIS (voyageur connecté)
// Les avis qu'il a laissés, avec le trajet concerné. Un avis retiré
// par la modération reste listé, marqué comme tel : le voyageur doit
// savoir pourquoi il ne le voit plus sur la fiche de l'agence.
// ═══════════════════════════════════════════════════
async function mesAvis(req, res) {
  try {
    const r = await pool.query(
      `SELECT av.id, av.note_globale, av.note_service, av.note_conduite,
              av.note_horaires, av.note_confort, av.commentaire, av.statut,
              av.cree_le,
              ag.nom AS nom_agence,
              TO_CHAR(t.date_depart, 'YYYY-MM-DD') AS date_depart,
              TO_CHAR(t.heure_depart, 'HH24:MI') AS heure_depart,
              t.numero AS numero_trajet,
              vd.nom_affiche AS depart, va.nom_affiche AS arrivee
         FROM avis av
         JOIN agences ag ON ag.id = av.agence_id
         JOIN trajets t ON t.id = av.trajet_id
         JOIN lignes l ON l.id = t.ligne_id
         JOIN villes vd ON vd.code = l.ville_depart
         JOIN villes va ON va.code = l.ville_arrivee
        WHERE av.voyageur_id = $1
        ORDER BY av.cree_le DESC`,
      [req.utilisateur.id]
    );
    res.json({ avis: r.rows });
  } catch (err) {
    erreurServeur(res, err);
  }
}

module.exports = { noterVoyage, avisAgence, avisTrajet, mesAvis };