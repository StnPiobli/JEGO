const pool = require('../config/database');
const { genererQR } = require('../utils/qr');
const { creerNotification } = require('../services/notificationService');
const { crediterPoints, calculerPointsGagnes } = require('../services/pointsService');
const { genererIdentifiant } = require('../utils/identifiant');

// ═══════════════════════════════════════════════════
// RÉSERVER UN GROUPE (voyageur organisateur)
// Attribution automatique de N sièges, un billet + un
// paiement par siège (traçabilité individuelle conservée),
// tout ou rien (transaction atomique).
// ═══════════════════════════════════════════════════
async function reserverGroupe(req, res) {
  const client = await pool.connect();
  try {
    const voyageurId = req.utilisateur.id;
    const { trajet_id, nombre_places, operateur } = req.body;

    if (!trajet_id || !nombre_places || !operateur) {
      return res.status(400).json({ error: 'Trajet, nombre de places et opérateur sont obligatoires' });
    }
    if (nombre_places < 2) {
      return res.status(400).json({ error: 'Une réservation de groupe requiert au moins 2 places' });
    }
    if (!['mtn_momo', 'orange_money'].includes(operateur)) {
      return res.status(400).json({ error: 'Opérateur invalide : mtn_momo ou orange_money' });
    }

    await client.query('BEGIN');

    const trajetInfo = await client.query(
      `SELECT t.prix_base, t.agence_id, t.date_depart, t.heure_depart, t.statut, t.bus_id,
              b.supplement_premium
       FROM trajets t JOIN bus b ON b.id = t.bus_id
       WHERE t.id = $1`,
      [trajet_id]
    );
    if (trajetInfo.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trajet introuvable' });
    }
    const info = trajetInfo.rows[0];
    if (['en_cours', 'termine', 'annule'].includes(info.statut)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La vente est fermée pour ce trajet' });
    }

    const dateDepart = new Date(info.date_depart);
    const [h, m] = info.heure_depart.split(':');
    dateDepart.setHours(parseInt(h), parseInt(m), 0, 0);
    if ((dateDepart - new Date()) / 60000 < 30) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Réservation impossible : ce trajet part dans moins de 30 minutes' });
    }

    const siegesDispo = await client.query(
      `SELECT s.id, s.numero, s.est_premium
       FROM sieges s
       WHERE s.bus_id = $1
         AND s.statut = 'disponible'
         AND NOT EXISTS (
           SELECT 1 FROM billets bil
           WHERE bil.siege_id = s.id AND bil.trajet_id = $2 AND bil.statut = 'confirme'
         )
       ORDER BY s.rangee, s.position
       LIMIT $3
       FOR UPDATE OF s`,
      [info.bus_id, trajet_id, nombre_places]
    );

    if (siegesDispo.rows.length < nombre_places) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Places insuffisantes : ${siegesDispo.rows.length} disponible(s) sur ${nombre_places} demandées`
      });
    }

    const grille = await client.query(
      `SELECT pourcentage FROM configuration_frais
       WHERE type_frais = 'commission' AND actif = true
         AND tranche_min <= $1 AND (tranche_max IS NULL OR tranche_max >= $1)
         AND (agence_id = $2 OR agence_id IS NULL)
       ORDER BY agence_id NULLS LAST LIMIT 1`,
      [info.prix_base, info.agence_id]
    );
    const pourcentage = grille.rows.length > 0 ? parseFloat(grille.rows[0].pourcentage) : 7;

    const numeroGroupe = `GRP-${Date.now()}`;
    const dateStr = new Date(info.date_depart).toISOString().slice(0,10).replace(/-/g,'');

    let montantTotalGroupe = 0;
    const billetsCreés = [];

    const groupe = await client.query(
      `INSERT INTO reservations_groupe (voyageur_id, trajet_id, nombre_places, montant_total, statut)
       VALUES ($1, $2, $3, 0, 'confirme') RETURNING id`,
      [voyageurId, trajet_id, nombre_places]
    );
    const groupeId = groupe.rows[0].id;

    for (const siege of siegesDispo.rows) {
      let prixAgenceSiege = info.prix_base;
      if (siege.est_premium) prixAgenceSiege += info.supplement_premium;

      const commission = Math.round(prixAgenceSiege * pourcentage / 100);
      const prixTotalSiege = prixAgenceSiege + commission;
      const fraisMomoSiege = Math.round(prixTotalSiege * 0.015);

      const numeroBillet = genererIdentifiant('BIL');
      const qrCode = genererQR(numeroBillet, trajet_id, siege.id);

      const billet = await client.query(
        `INSERT INTO billets
          (numero, trajet_id, voyageur_id, siege_id, agence_id, groupe_id,
           type_billet, statut, prix_total_client, prix_agence, marge_jego, frais_momo,
           qr_code, source_vente)
         VALUES ($1,$2,$3,$4,$5,$6,'standard','confirme',$7,$8,$9,$10,$11,'en_ligne')
         RETURNING id, numero, qr_code`,
        [numeroBillet, trajet_id, voyageurId, siege.id, info.agence_id, groupeId,
         prixTotalSiege, prixAgenceSiege, commission, fraisMomoSiege, qrCode]
      );
      const billetId = billet.rows[0].id;

      await client.query(
        `INSERT INTO escrow (billet_id, montant_total, montant_agence, montant_jego, frais_momo, statut)
         VALUES ($1,$2,$3,$4,$5,'retenu')`,
        [billetId, prixTotalSiege, prixAgenceSiege, commission - fraisMomoSiege, fraisMomoSiege]
      );

      await client.query(
        `INSERT INTO paiements (billet_id, voyageur_id, montant, operateur, reference_momo, statut, type, confirme_le)
         VALUES ($1,$2,$3,$4,$5,'confirme','paiement',NOW())`,
        [billetId, voyageurId, prixTotalSiege, operateur, `SIM-${operateur.toUpperCase()}-${Date.now()}-${siege.numero}`]
      );

      montantTotalGroupe += prixTotalSiege;
      billetsCreés.push({ numero: billet.rows[0].numero, siege: siege.numero, qr_code: billet.rows[0].qr_code });
    }

    await client.query(`UPDATE reservations_groupe SET montant_total = $1 WHERE id = $2`, [montantTotalGroupe, groupeId]);

    const pointsGagnes = calculerPointsGagnes(montantTotalGroupe);
    if (pointsGagnes > 0) {
      await crediterPoints(voyageurId, pointsGagnes, 'Réservation de groupe', null, client);
    }

    await client.query('COMMIT');

    await creerNotification({
      destinataire_type: 'voyageur',
      destinataire_id: voyageurId,
      type: 'confirmation_groupe',
      titre: 'Réservation de groupe confirmée',
      contenu: `Votre groupe de ${nombre_places} places (${numeroGroupe}) est confirmé pour un total de ${montantTotalGroupe} FCFA.`,
      canal: 'push'
    });

    res.status(201).json({
      message: 'Réservation de groupe confirmée',
      groupe_id: groupeId,
      numero_groupe: numeroGroupe,
      nombre_places: nombre_places,
      montant_total: montantTotalGroupe,
      billets: billetsCreés
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

module.exports = { reserverGroupe };