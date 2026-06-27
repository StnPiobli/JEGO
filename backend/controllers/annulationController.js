const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// ANNULER SON BILLET (route protégée — voyageur)
// Calcule le remboursement selon type + délai
// ═══════════════════════════════════════════════════
async function annulerBillet(req, res) {
  const client = await pool.connect();
  try {
    const voyageurId = req.utilisateur.id;
    const billetId = req.params.id;

    await client.query('BEGIN');

    // 1. Récupérer le billet + infos trajet (date/heure de départ)
    const billetResult = await client.query(
      `SELECT b.id, b.statut, b.type_billet, b.est_flexible,
              b.prix_total_client, b.prix_agence, b.marge_jego, b.frais_momo,
              b.siege_id, b.trajet_id,
              t.date_depart, t.heure_depart
       FROM billets b
       JOIN trajets t ON t.id = b.trajet_id
       WHERE b.id = $1 AND b.voyageur_id = $2`,
      [billetId, voyageurId]
    );

    if (billetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Billet introuvable' });
    }

    const billet = billetResult.rows[0];

    // 2. Vérifier que le billet est encore annulable
    if (billet.statut !== 'confirme') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Ce billet ne peut pas être annulé (statut : ${billet.statut})` });
    }

    // 3. Calculer le délai avant le départ (en heures)
    // On combine la date et l'heure de départ
    const dateDepart = new Date(billet.date_depart);
    const [h, m] = billet.heure_depart.split(':');
    dateDepart.setHours(parseInt(h), parseInt(m), 0, 0);
    const maintenant = new Date();
    const heuresAvantDepart = (dateDepart - maintenant) / (1000 * 60 * 60);

    // 4. Déterminer le pourcentage de remboursement
    let pourcentage = 0;
    if (billet.est_flexible) {
      pourcentage = heuresAvantDepart >= 24 ? 80 : 50;
    } else {
      pourcentage = 0; // billet standard : aucun remboursement
    }

    const montantRembourse = Math.round(billet.prix_total_client * pourcentage / 100);

    // 5. Passer le billet en "annule"
    await client.query(
      `UPDATE billets SET statut = 'annule', mis_a_jour_le = NOW() WHERE id = $1`,
      [billetId]
    );

    // 6. Nettoyer un éventuel verrou résiduel sur ce siège (sécurité)
    await client.query(
      `DELETE FROM soft_locks WHERE siege_id = $1 AND trajet_id = $2`,
      [billet.siege_id, billet.trajet_id]
    );

    // 7. Gérer l'escrow et le remboursement
    let referenceRemb = null;

    if (montantRembourse > 0) {
      // Remboursement partiel : escrow passe en "rembourse"
      await client.query(
        `UPDATE escrow SET statut = 'rembourse' WHERE billet_id = $1`,
        [billetId]
      );

      // Créer la ligne de remboursement
      referenceRemb = `REMB-${Date.now()}`;
      await client.query(
        `INSERT INTO remboursements
          (billet_id, voyageur_id, montant, motif, pourcentage, statut, reference, traite_le)
         VALUES ($1,$2,$3,'billet_flexible',$4,'traite',$5,NOW())`,
        [billetId, voyageurId, montantRembourse, pourcentage, referenceRemb]
      );

      // [SIMULATION] Remboursement Mobile Money effectué
    } else {
      // Billet standard non remboursé :
      // L'argent reste à JEGO. L'escrow bascule : part agence → 0, tout va à JEGO
      await client.query(
        `UPDATE escrow
         SET statut = 'rembourse',
             montant_agence = 0,
             montant_jego = montant_total - frais_momo
         WHERE billet_id = $1`,
        [billetId]
      );
      // Aucun remboursement créé (montant = 0)
    }

    await client.query('COMMIT');

    res.json({
      message: pourcentage > 0
        ? `Billet annulé. Remboursement de ${montantRembourse} FCFA (${pourcentage}%) initié.`
        : 'Billet annulé. Aucun remboursement (billet standard). Le siège est de nouveau disponible.',
      annulation: {
        billet_id: billetId,
        type_billet: billet.type_billet,
        heures_avant_depart: Math.round(heuresAvantDepart * 10) / 10,
        pourcentage_rembourse: pourcentage,
        montant_rembourse: montantRembourse,
        reference_remboursement: referenceRemb,
        delai_estime: pourcentage > 0 ? '24 à 72h selon votre opérateur Mobile Money' : null
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

module.exports = { annulerBillet };