const pool = require('../config/database');
const { creerNotification } = require('../services/notificationService');
const { genererIdentifiant } = require('../utils/identifiant');

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
      referenceRemb = genererIdentifiant('RMB');
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

    if (montantRembourse > 0) {
      await creerNotification({
        destinataire_type: 'voyageur',
        destinataire_id: voyageurId,
        type: 'remboursement',
        titre: 'Remboursement confirmé',
        contenu: `Votre remboursement de ${montantRembourse} FCFA (${pourcentage}%) a été traité.`,
        canal: 'push'
      });
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

// ═══════════════════════════════════════════════════
// ANNULER UN BILLET VENDU AU GUICHET (agence)
//
// Cas réel : le client se présente au guichet avant le départ et
// renonce à son voyage. L'argent a été encaissé en espèces par
// l'agence, donc le remboursement se fait en espèces au guichet —
// aucun flux Mobile Money n'est déclenché.
//
// Garde-fous :
//   - uniquement un billet de source_vente = 'physique'
//   - uniquement un billet de SA propre agence
//   - impossible une fois le bus parti (trajet en_cours/termine)
//   - impossible si le QR a déjà été scanné (passager embarqué)
//
// Conséquence financière : l'escrow n'a jamais à être versé, la
// commission JEGO est annulée avec la vente. JEGO ne prélève rien
// sur une vente qui n'a pas eu lieu.
// ═══════════════════════════════════════════════════
async function annulerBilletGuichet(req, res) {
  const client = await pool.connect();
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const agenceId = req.utilisateur.id;
    const billetId = req.params.id;
    const { motif } = req.body;

    await client.query('BEGIN');

    const billetResult = await client.query(
      `SELECT b.id, b.numero, b.statut, b.source_vente, b.qr_scanne,
              b.prix_total_client, b.voyageur_id, b.siege_id, b.trajet_id,
              t.statut AS statut_trajet
       FROM billets b
       JOIN trajets t ON t.id = b.trajet_id
       WHERE b.id = $1 AND b.agence_id = $2
       FOR UPDATE OF b`,
      [billetId, agenceId]
    );

    if (billetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Billet introuvable dans votre agence' });
    }
    const billet = billetResult.rows[0];

    if (billet.source_vente !== 'physique') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: 'Ce billet a été acheté en ligne. Seul le voyageur peut l\'annuler depuis son application.'
      });
    }
    if (billet.statut !== 'confirme') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Ce billet ne peut pas être annulé (statut : ${billet.statut})` });
    }
    if (billet.qr_scanne) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce passager est déjà monté à bord — annulation impossible' });
    }
    if (['en_cours', 'termine'].includes(billet.statut_trajet)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Le bus est déjà parti — annulation impossible' });
    }

    await client.query(
      `UPDATE billets SET statut = 'annule', mis_a_jour_le = NOW() WHERE id = $1`,
      [billetId]
    );

    // Libérer le siège (le filet d'exclusion en base ne bloque que les
    // billets 'confirme', mais on nettoie tout verrou résiduel).
    await client.query(
      `DELETE FROM soft_locks WHERE siege_id = $1 AND trajet_id = $2`,
      [billet.siege_id, billet.trajet_id]
    );

    // L'escrow ne partira jamais à l'agence : la vente est annulée.
    await client.query(
      `UPDATE escrow SET statut = 'rembourse' WHERE billet_id = $1 AND statut = 'retenu'`,
      [billetId]
    );

    // Trace du remboursement espèces, pour que la comptabilité de
    // l'agence et celle de JEGO restent réconciliables.
    const reference = `REMB-GUI-${billet.numero}`;
    await client.query(
      `INSERT INTO remboursements
        (billet_id, voyageur_id, montant, motif, pourcentage, statut, reference, traite_le)
       VALUES ($1, $2, $3, 'manuel', 100, 'traite', $4, NOW())`,
      [billetId, billet.voyageur_id, billet.prix_total_client, reference]
    );

    await client.query('COMMIT');

    await creerNotification({
      destinataire_type: 'voyageur',
      destinataire_id: billet.voyageur_id,
      type: 'remboursement',
      titre: 'Billet annulé',
      contenu: `Votre billet ${billet.numero} a été annulé au guichet. Remboursement en espèces : ${billet.prix_total_client} FCFA.`,
      canal: 'sms'
    });

    res.json({
      message: 'Billet annulé. Remboursez le client en espèces au guichet.',
      annulation: {
        billet_id: billetId,
        numero: billet.numero,
        montant_a_rembourser_especes: billet.prix_total_client,
        reference_remboursement: reference,
        motif: motif || null
      }
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

module.exports = { annulerBillet, annulerBilletGuichet };