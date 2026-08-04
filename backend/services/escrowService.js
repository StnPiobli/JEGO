const pool = require('../config/database');
const { creerNotification } = require('./notificationService');

// ═══════════════════════════════════════════════════
// SERVICE : VERSER L'ESCROW D'UN TRAJET
// Un billet sous litige actif (statut NOT IN 'resolu','cloture') est
// exclu du versement groupé — son escrow reste 'retenu' jusqu'à ce que
// trancherLitige() le libère explicitement vers le gagnant.
// ═══════════════════════════════════════════════════
async function verserEscrowTrajet(trajetId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const trajetResult = await client.query(
      `SELECT id, statut, versement_escrow_le FROM trajets WHERE id = $1`,
      [trajetId]
    );
    if (trajetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { ok: false, raison: 'Trajet introuvable' };
    }
    const trajet = trajetResult.rows[0];

    if (trajet.statut !== 'termine') {
      await client.query('ROLLBACK');
      return { ok: false, raison: 'Trajet non terminé' };
    }

    if (!trajet.versement_escrow_le || new Date(trajet.versement_escrow_le) > new Date()) {
      await client.query('ROLLBACK');
      return { ok: false, raison: 'Délai de 6h non écoulé' };
    }

    const passagers = await client.query(
      `SELECT COUNT(*) AS nb FROM billets WHERE trajet_id = $1 AND statut = 'utilise'`,
      [trajetId]
    );
    const nbPassagers = parseInt(passagers.rows[0].nb);

    let seuil;
    if (nbPassagers <= 20) seuil = 3;
    else if (nbPassagers <= 40) seuil = 4;
    else seuil = 5;

    const signalements = await client.query(
      `SELECT COUNT(*) AS nb FROM signalements
       WHERE trajet_id = $1 AND categorie = 'fausse_arrivee'`,
      [trajetId]
    );
    const nbSignalements = parseInt(signalements.rows[0].nb);

    if (nbSignalements >= seuil) {
      await client.query(
        `UPDATE trajets SET statut = 'incident', mis_a_jour_le = NOW() WHERE id = $1`,
        [trajetId]
      );
      await client.query('COMMIT');
      return {
        ok: false, suspendu: true,
        raison: 'Seuil de fausse arrivée atteint — versement suspendu',
        nb_passagers: nbPassagers, seuil, nb_signalements: nbSignalements
      };
    }

    const escrowResult = await client.query(
      `UPDATE escrow
       SET statut = 'verse', verse_le = NOW()
       FROM billets
       WHERE escrow.billet_id = billets.id
         AND billets.trajet_id = $1
         AND escrow.statut = 'retenu'
         AND NOT EXISTS (
           SELECT 1 FROM litiges l
           WHERE l.billet_id = billets.id
             AND l.statut NOT IN ('resolu', 'cloture')
         )
       RETURNING escrow.montant_agence`,
      [trajetId]
    );

    const totalVerse = escrowResult.rows.reduce((s, e) => s + e.montant_agence, 0);

    const enAttenteLitige = await client.query(
      `SELECT COUNT(*) AS nb
       FROM escrow
       JOIN billets ON billets.id = escrow.billet_id
       JOIN litiges l ON l.billet_id = billets.id
       WHERE billets.trajet_id = $1
         AND escrow.statut = 'retenu'
         AND l.statut NOT IN ('resolu', 'cloture')`,
      [trajetId]
    );
    const nbRetenuLitige = parseInt(enAttenteLitige.rows[0].nb);

    await client.query('COMMIT');

    const agenceInfo = await client.query(`SELECT agence_id FROM trajets WHERE id = $1`, [trajetId]);
    await creerNotification({
      destinataire_type: 'agence',
      destinataire_id: agenceInfo.rows[0].agence_id,
      type: 'versement_escrow',
      titre: 'Versement effectué',
      contenu: nbRetenuLitige > 0
        ? `Un versement de ${totalVerse} FCFA a été effectué pour votre trajet. ${nbRetenuLitige} billet(s) restent bloqués en attente de décision sur litige.`
        : `Un versement de ${totalVerse} FCFA a été effectué pour votre trajet.`,
      canal: 'email'
    });

    return {
      ok: true,
      billets_verses: escrowResult.rows.length,
      total_verse_agence: totalVerse,
      nb_passagers: nbPassagers,
      billets_retenus_litige: nbRetenuLitige
    };

  } catch (err) {
    await client.query('ROLLBACK');
    return { ok: false, raison: err.message };
  } finally {
    client.release();
  }
}

module.exports = { verserEscrowTrajet };
