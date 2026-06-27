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

// ═══════════════════════════════════════════════════
// PAYER ET CRÉER LE BILLET (route protégée)
// [SIMULATION Mobile Money — à remplacer par la vraie API plus tard]
// ═══════════════════════════════════════════════════
async function payer(req, res) {
  const client = await pool.connect();
  try {
    const voyageurId = req.utilisateur.id;
    const {
      trajet_id, siege_id, operateur,
      est_premium_choisi, supplement_bagage, est_flexible
    } = req.body;

    // Vérifs de base
    if (!trajet_id || !siege_id || !operateur) {
      return res.status(400).json({ error: 'Trajet, siège et opérateur sont obligatoires' });
    }
    if (!['mtn_momo', 'orange_money'].includes(operateur)) {
      return res.status(400).json({ error: 'Opérateur invalide : mtn_momo ou orange_money' });
    }

    await client.query('BEGIN');

    // 1. Vérifier que le voyageur possède un verrou valide sur ce siège
    const verrou = await client.query(
      `SELECT id FROM soft_locks
       WHERE siege_id = $1 AND trajet_id = $2 AND voyageur_id = $3 AND expire_le > NOW()`,
      [siege_id, trajet_id, voyageurId]
    );
    if (verrou.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Aucun verrou valide. Sélectionnez à nouveau le siège.' });
    }

    // 2. Vérifier que le siège n'a pas été vendu entre-temps
    const dejaVendu = await client.query(
      `SELECT id FROM billets WHERE siege_id = $1 AND trajet_id = $2 AND statut = 'confirme'`,
      [siege_id, trajet_id]
    );
    if (dejaVendu.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ce siège vient d\'être vendu' });
    }

    // 3. Récupérer le trajet, le bus, le siège et l'agence
    const infos = await client.query(
      `SELECT t.prix_base, t.agence_id, t.date_depart,
              b.supplement_premium,
              s.numero AS siege_numero, s.est_premium
       FROM trajets t
       JOIN bus b ON b.id = t.bus_id
       JOIN sieges s ON s.id = $1
       WHERE t.id = $2`,
      [siege_id, trajet_id]
    );
    const info = infos.rows[0];

    // 4. Calculer le PRIX AGENCE (ce que l'agence reçoit)
    let prixAgence = info.prix_base;
    // Supplément premium : si le siège est premium, on l'ajoute (revient à l'agence)
    if (info.est_premium) {
      prixAgence += info.supplement_premium;
    }

    // 5. Calculer les SUPPLÉMENTS JEGO (reviennent à JEGO, pas à l'agence)
    const suppSiege = est_premium_choisi ? 500 : 0;  // frais "choix du siège" (exemple)
    const suppBagage = supplement_bagage ? parseInt(supplement_bagage) : 0;
    const suppFlexible = est_flexible ? Math.round(prixAgence * 0.10) : 0; // +10% si flexible

    // 6. Calculer la COMMISSION JEGO via la grille (configuration_frais)
    const grille = await client.query(
      `SELECT pourcentage FROM configuration_frais
       WHERE type_frais = 'commission'
         AND actif = true
         AND tranche_min <= $1
         AND (tranche_max IS NULL OR tranche_max >= $1)
         AND (agence_id = $2 OR agence_id IS NULL)
       ORDER BY agence_id NULLS LAST
       LIMIT 1`,
      [prixAgence, info.agence_id]
    );
    const pourcentage = grille.rows.length > 0 ? parseFloat(grille.rows[0].pourcentage) : 7;
    const commission = Math.round(prixAgence * pourcentage / 100);

    // 7. Calculer le PRIX TOTAL CLIENT
    const margeJego = commission + suppSiege + suppBagage + suppFlexible;
    const prixTotalClient = prixAgence + margeJego;

    // 8. Frais Mobile Money (1,5%, absorbés par JEGO)
    const fraisMomo = Math.round(prixTotalClient * 0.015);

    // 9. [SIMULATION] Appel Mobile Money — ici on simule un succès
    const referenceMomo = `SIM-${operateur.toUpperCase()}-${Date.now()}`;

    // 10. Générer le numéro de billet et le QR
    const dateStr = new Date(info.date_depart).toISOString().slice(0,10).replace(/-/g,'');
    const suffixe = Math.random().toString(36).substring(2,6).toUpperCase();
    const numeroBillet = `JG-${dateStr}-${suffixe}`;
    const qrCode = `JEGO|${numeroBillet}|${trajet_id}|${siege_id}|${info.siege_numero}`;

    // 11. Créer le BILLET
    const billet = await client.query(
      `INSERT INTO billets
        (numero, trajet_id, voyageur_id, siege_id, agence_id,
         type_billet, statut, est_flexible, supplement_flexible,
         supplement_bagage, supplement_siege,
         prix_total_client, prix_agence, marge_jego, frais_momo,
         qr_code, source_vente)
       VALUES ($1,$2,$3,$4,$5,$6,'confirme',$7,$8,$9,$10,$11,$12,$13,$14,$15,'en_ligne')
       RETURNING id, numero, qr_code, prix_total_client`,
      [numeroBillet, trajet_id, voyageurId, siege_id, info.agence_id,
       est_flexible ? 'flexible' : 'standard', est_flexible || false, suppFlexible,
       suppBagage, suppSiege, prixTotalClient, prixAgence, margeJego, fraisMomo,
       qrCode]
    );
    const billetId = billet.rows[0].id;

    // 12. Créer le PAIEMENT (confirmé)
    await client.query(
      `INSERT INTO paiements
        (billet_id, voyageur_id, montant, operateur, reference_momo, statut, type, confirme_le)
       VALUES ($1,$2,$3,$4,$5,'confirme','paiement',NOW())`,
      [billetId, voyageurId, prixTotalClient, operateur, referenceMomo]
    );

    // 13. Créer l'ESCROW (argent retenu, pas versé)
    await client.query(
      `INSERT INTO escrow
        (billet_id, montant_total, montant_agence, montant_jego, frais_momo, statut)
       VALUES ($1,$2,$3,$4,$5,'retenu')`,
      [billetId, prixTotalClient, prixAgence, margeJego - fraisMomo, fraisMomo]
    );

    // 14. Supprimer le verrou (le siège est maintenant vendu)
    await client.query(
      `DELETE FROM soft_locks WHERE siege_id = $1 AND trajet_id = $2`,
      [siege_id, trajet_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Paiement réussi, billet confirmé',
      billet: {
        id: billetId,
        numero: billet.rows[0].numero,
        qr_code: billet.rows[0].qr_code,
        siege: info.siege_numero,
        prix_paye: prixTotalClient
      },
      detail_prix: {
        prix_agence: prixAgence,
        commission_jego: commission,
        supplements: suppSiege + suppBagage + suppFlexible,
        frais_momo: fraisMomo,
        total_client: prixTotalClient
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

module.exports = { planTrajet, verrouillerSiege, prolongerVerrou, payer };