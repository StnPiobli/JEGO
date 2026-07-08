const pool = require('../config/database');
const { creerNotification } = require('./notificationService');

// ═══════════════════════════════════════════════════
// SERVICE : VERSER L'ESCROW D'UN TRAJET
// Logique pure (sans HTTP), réutilisable par la route ET le job.
// Retourne un objet décrivant le résultat.
// ═══════════════════════════════════════════════════
async function verserEscrowTrajet(trajetId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Récupérer le trajet
    const trajetResult = await client.query(
      `SELECT id, statut, versement_escrow_le FROM trajets WHERE id = $1`,
      [trajetId]
    );
    if (trajetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { ok: false, raison: 'Trajet introuvable' };
    }
    const trajet = trajetResult.rows[0];

    // 2. Doit être terminé
    if (trajet.statut !== 'termine') {
      await client.query('ROLLBACK');
      return { ok: false, raison: 'Trajet non terminé' };
    }

    // 3. Le délai de 6h doit être passé
    if (!trajet.versement_escrow_le || new Date(trajet.versement_escrow_le) > new Date()) {
      await client.query('ROLLBACK');
      return { ok: false, raison: 'Délai de 6h non écoulé' };
    }

    // 4. Compter les passagers
    const passagers = await client.query(
      `SELECT COUNT(*) AS nb FROM billets WHERE trajet_id = $1 AND statut = 'utilise'`,
      [trajetId]
    );
    const nbPassagers = parseInt(passagers.rows[0].nb);

    // 5. Seuil collectif
    let seuil;
    if (nbPassagers <= 20) seuil = 3;
    else if (nbPassagers <= 40) seuil = 4;
    else seuil = 5;

    // 6. Compter les signalements de fausse arrivée
    const signalements = await client.query(
      `SELECT COUNT(*) AS nb FROM signalements
       WHERE trajet_id = $1 AND categorie = 'fausse_arrivee'`,
      [trajetId]
    );
    const nbSignalements = parseInt(signalements.rows[0].nb);

    // 7. Décision
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

    // 8. Verser tous les escrows "retenu" du trajet
    const escrowResult = await client.query(
      `UPDATE escrow
       SET statut = 'verse', verse_le = NOW()
       FROM billets
       WHERE escrow.billet_id = billets.id
         AND billets.trajet_id = $1
         AND escrow.statut = 'retenu'
       RETURNING escrow.montant_agence`,
      [trajetId]
    );

    const totalVerse = escrowResult.rows.reduce((s, e) => s + e.montant_agence, 0);

    await client.query('COMMIT');

const agenceInfo = await client.query(`SELECT agence_id FROM trajets WHERE id = $1`, [trajetId]);
    await creerNotification({
      destinataire_type: 'agence',
      destinataire_id: agenceInfo.rows[0].agence_id,
      type: 'versement_escrow',
      titre: 'Versement effectué',
      contenu: `Un versement de ${totalVerse} FCFA a été effectué pour votre trajet.`,
      canal: 'email'
    });

    return {
      ok: true,
      billets_verses: escrowResult.rows.length,
      total_verse_agence: totalVerse,
      nb_passagers: nbPassagers
    };

  } catch (err) {
    await client.query('ROLLBACK');
    return { ok: false, raison: err.message };
  } finally {
    client.release();
  }
}

module.exports = { verserEscrowTrajet };