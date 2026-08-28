const pool = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { genererQR, verifierQR } = require('../utils/qr');
const { creerNotification, envoyerEmailDirect } = require('../services/notificationService');
const { genererPdfBillet } = require('../services/pdfBilletService');
const { crediterPoints, debiterPoints, calculerPointsGagnes, recupererPaliers } = require('../services/pointsService');
const { normaliserTelephone } = require('../utils/telephone');
const { genererIdentifiant } = require('../utils/identifiant');

// ═══════════════════════════════════════════════════
// VOIR LE PLAN DU BUS POUR UN TRAJET (route publique)
// ═══════════════════════════════════════════════════
async function planTrajet(req, res) {
  try {
    const trajetId = req.params.id;
    // Tronçon souhaité par le client, choisi en amont côté agence.
    // Sans tronçon précisé (rétrocompatibilité), on se rabat sur le
    // trajet complet (comportement historique).
    let { ordre_depart, ordre_arrivee } = req.query;

    const trajetResult = await pool.query(
      `SELECT
          t.id, TO_CHAR(t.date_depart, 'YYYY-MM-DD') AS date_depart, t.heure_depart, t.heure_arrivee_estimee,
          t.prix_base, t.categorie, t.bus_id, t.ligne_id, t.prix_bagage_supplementaire,
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

    if (ordre_depart === undefined || ordre_arrivee === undefined) {
      const bornes = await pool.query(
        `SELECT MIN(ordre) AS mini, MAX(ordre) AS maxi FROM ligne_points WHERE ligne_id = $1`,
        [trajet.ligne_id]
      );
      ordre_depart = bornes.rows[0].mini ?? 0;
      ordre_arrivee = bornes.rows[0].maxi ?? 1;
    }
    const a = parseInt(ordre_depart);
    const b = parseInt(ordre_arrivee);

    // Un siège n'est "pris" pour ce tronçon (a,b) que s'il existe une
    // réservation confirmée (c,d) dessus dont l'intervalle chevauche
    // réellement : NOT (a>=d OR c>=b). Un même siège reste donc
    // vendable sur des tronçons non chevauchants du même trajet.
    const siegesResult = await pool.query(
      `SELECT
          s.id, s.numero, s.rangee, s.position, s.type_position,
          s.est_premium, s.statut AS statut_siege,
          bil.source_vente,
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
         AND NOT (
           $3 >= COALESCE(bil.point_debarquement_ordre, 1)
           OR COALESCE(bil.point_embarquement_ordre, 0) >= $4
         )
       WHERE s.bus_id = $2
       ORDER BY s.rangee, s.position`,
      [trajetId, trajet.bus_id, a, b]
    );

    res.json({
      trajet: {
        id: trajet.id,
        // Nécessaire au portail agence pour retrouver les tronçons
        // vendables et leurs prix.
        ligne_id: trajet.ligne_id,
        depart: trajet.depart_affiche,
        arrivee: trajet.arrivee_affiche,
        date_depart: trajet.date_depart,
        heure_depart: trajet.heure_depart,
        prix_base: trajet.prix_base,
        categorie: trajet.categorie,
        nom_bus: trajet.nom_bus,
        disposition: trajet.disposition,
        type_bus: trajet.type_bus,
        supplement_premium: trajet.supplement_premium,
        prix_bagage_supplementaire: trajet.prix_bagage_supplementaire
      },
      sieges: siegesResult.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// VERROUILLER UN SIÈGE (soft lock — 5 min)
// Accepte désormais point_embarquement_ordre / point_debarquement_ordre
// optionnels (lignes à arrêts). Si absents : comportement identique
// à avant (réservation du trajet entier, 0 -> 1).
// ═══════════════════════════════════════════════════
async function verrouillerSiege(req, res) {
  const client = await pool.connect();
  try {
    const voyageurId = req.utilisateur.id;
    const { trajet_id, siege_id, point_embarquement_ordre, point_debarquement_ordre } = req.body;

    if (!trajet_id || !siege_id) {
      return res.status(400).json({ error: 'Trajet et siège sont obligatoires' });
    }

    const a = point_embarquement_ordre !== undefined ? parseInt(point_embarquement_ordre) : 0;
    const b = point_debarquement_ordre !== undefined ? parseInt(point_debarquement_ordre) : 1;
    if (b <= a) {
      return res.status(400).json({ error: 'Le point de débarquement doit être après le point d\'embarquement' });
    }

    await client.query('BEGIN');

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

    if (siege.statut === 'supprime_toilettes') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce siège n\'est pas disponible (emplacement toilettes)' });
    }
    if (siege.statut === 'desactive') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce siège est indisponible (hors service)' });
    }

    // La vente se ferme arrêt par arrêt, pas d'un coup au départ de la
    // ligne : tant que le bus n'est pas reparti du point de montée
    // demandé, la place y reste réservable. Même règle que la
    // recherche — sans quoi le voyageur verrait l'offre puis se ferait
    // refuser au choix du siège.
    const trajetInfo = await client.query(
      `SELECT TO_CHAR(t.date_depart, 'YYYY-MM-DD') AS date_depart,
              t.heure_depart, t.statut,
              COALESCE(lp.heure_arrivee_estimee, t.heure_depart) AS heure_montee,
              EXISTS (
                SELECT 1 FROM arrivees_arrets aa
                WHERE aa.trajet_id = t.id AND aa.ordre = $2
                  AND aa.heure_depart_reelle IS NOT NULL
              ) AS arret_quitte
       FROM trajets t
       LEFT JOIN ligne_points lp ON lp.ligne_id = t.ligne_id AND lp.ordre = $2
       WHERE t.id = $1`,
      [trajet_id, a]
    );
    if (trajetInfo.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trajet introuvable' });
    }
    const infoTrajet = trajetInfo.rows[0];

    if (['termine', 'annule'].includes(infoTrajet.statut)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La vente est fermée pour ce trajet (terminé ou annulé)' });
    }
    if (a === 0 && infoTrajet.statut === 'en_cours') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce bus est déjà parti : la vente est fermée à ce point de montée.' });
    }
    if (infoTrajet.arret_quitte) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Le bus est déjà reparti de ce point de montée.' });
    }
    // Garde-fou indépendant du chauffeur : passé l'heure prévue à ce
    // point, on ne vend plus, même si le départ n'a pas été déclaré.
    const heureMontee = new Date(`${infoTrajet.date_depart}T${infoTrajet.heure_montee}`);
    if (new Date() > heureMontee) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'L\'heure de passage à ce point est dépassée : la vente est fermée.' });
    }

    // Chevauchement : le siège est pris pour (a,b) si un billet confirmé
    // existant (c,d) sur ce siège+trajet vérifie NOT(a>=d OR c>=b).
    // Les billets sans point_embarquement/debarquement (lignes simples,
    // anciens billets) sont traités comme occupant tout le trajet (0,1).
    const billetCheck = await client.query(
      `SELECT id FROM billets
       WHERE siege_id = $1 AND trajet_id = $2 AND statut = 'confirme'
         AND NOT (
           $3 >= COALESCE(point_debarquement_ordre, 1)
           OR COALESCE(point_embarquement_ordre, 0) >= $4
         )`,
      [siege_id, trajet_id, a, b]
    );
    if (billetCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ce siège est déjà vendu sur ce segment' });
    }

    await client.query(
      `DELETE FROM soft_locks
       WHERE siege_id = $1 AND trajet_id = $2 AND expire_le < NOW()`,
      [siege_id, trajet_id]
    );

    // Même logique de chevauchement que pour les billets confirmés : un
    // verrou existant sur un segment DIFFÉRENT et non superposé du même
    // siège n'empêche pas ce nouveau verrou (multi-arrêts). En revanche,
    // si le chevauchement trouvé est un verrou du MÊME voyageur mais sur
    // un segment DIFFÉRENT de celui demandé, ce n'est pas "déjà verrouillé"
    // -- c'est un vrai conflit s'il chevauche le verrou d'un autre voyageur.
    const verrouExistant = await client.query(
      `SELECT id, voyageur_id,
              COALESCE(point_embarquement_ordre, 0) AS a_existant,
              COALESCE(point_debarquement_ordre, 1) AS b_existant
       FROM soft_locks
       WHERE siege_id = $1 AND trajet_id = $2 AND expire_le > NOW()
         AND NOT (
           $3 >= COALESCE(point_debarquement_ordre, 1)
           OR COALESCE(point_embarquement_ordre, 0) >= $4
         )`,
      [siege_id, trajet_id, a, b]
    );
    if (verrouExistant.rows.length > 0) {
      const memeSegmentMemeVoyageur = verrouExistant.rows.some(
        r => r.voyageur_id === voyageurId && r.a_existant === a && r.b_existant === b
      );
      if (memeSegmentMemeVoyageur) {
        await client.query('ROLLBACK');
        return res.status(200).json({ message: 'Vous avez déjà ce siège verrouillé sur ce segment' });
      }
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ce siège est en cours de réservation par un autre voyageur sur ce segment' });
    }

    const verrou = await client.query(
      `INSERT INTO soft_locks (siege_id, trajet_id, voyageur_id, expire_le, prolongations, point_embarquement_ordre, point_debarquement_ordre)
       VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes', 0, $4, $5)
       RETURNING id, expire_le`,
      [siege_id, trajet_id, voyageurId, a, b]
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

    if (new Date(v.expire_le) < new Date()) {
      return res.status(410).json({ error: 'Ce verrou a déjà expiré' });
    }

    if (v.prolongations >= 2) {
      return res.status(403).json({
        error: 'Limite de prolongations atteinte (2 maximum). Veuillez finaliser le paiement.'
      });
    }

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
//
// Idempotence : le client envoie un header Idempotency-Key (généré une
// fois côté app au moment où le voyageur appuie sur "Payer", réutilisé
// tel quel pour tout retry). Un double-clic ou un retry réseau avec la
// même clé renvoie la réponse déjà produite au lieu de créer un 2e billet.
// ═══════════════════════════════════════════════════
async function payer(req, res) {
  const client = await pool.connect();
  const cleIdempotence = req.headers['idempotency-key'] || null;
  try {
    const voyageurId = req.utilisateur.id;
    const {
      trajet_id, siege_id, operateur,
      est_premium_choisi, supplement_bagage, est_flexible,
      est_cadeau, destinataire_tel, destinataire_email,
      utiliser_reduction, utiliser_gratuit,
      point_embarquement_ordre, point_debarquement_ordre
    } = req.body;

    if (!trajet_id || !siege_id || !operateur) {
      return res.status(400).json({ error: 'Trajet, siège et opérateur sont obligatoires' });
    }
    if (!['mtn_momo', 'orange_money'].includes(operateur)) {
      return res.status(400).json({ error: 'Opérateur invalide : mtn_momo ou orange_money' });
    }
    if (est_cadeau && (!destinataire_tel || !destinataire_email)) {
      return res.status(400).json({ error: 'Pour un billet cadeau, le téléphone et l\'email du destinataire sont obligatoires' });
    }
    if (utiliser_reduction && utiliser_gratuit) {
      return res.status(400).json({ error: 'Choisissez soit la réduction, soit la gratuité, pas les deux' });
    }
    if (utiliser_gratuit && (est_premium_choisi || est_flexible)) {
      return res.status(400).json({ error: 'La gratuité par points ne s\'applique qu\'aux billets standard' });
    }

    const a = point_embarquement_ordre !== undefined ? parseInt(point_embarquement_ordre) : 0;
    const b = point_debarquement_ordre !== undefined ? parseInt(point_debarquement_ordre) : 1;

    await client.query('BEGIN');

    if (cleIdempotence) {
      const reservation = await client.query(
        `INSERT INTO requetes_idempotentes (cle, voyageur_id, statut)
         VALUES ($1, $2, 'en_cours')
         ON CONFLICT (cle) DO NOTHING
         RETURNING id`,
        [cleIdempotence, voyageurId]
      );
      if (reservation.rows.length === 0) {
        const existante = await client.query(
          `SELECT statut, reponse FROM requetes_idempotentes WHERE cle = $1`,
          [cleIdempotence]
        );
        await client.query('ROLLBACK');
        if (existante.rows[0].statut === 'termine') {
          return res.status(200).json(existante.rows[0].reponse);
        }
        return res.status(409).json({ error: 'Ce paiement est déjà en cours de traitement, patientez.' });
      }
    }

    const verrou = await client.query(
      `SELECT id FROM soft_locks
       WHERE siege_id = $1 AND trajet_id = $2 AND voyageur_id = $3 AND expire_le > NOW()
         AND COALESCE(point_embarquement_ordre, 0) = $4
         AND COALESCE(point_debarquement_ordre, 1) = $5`,
      [siege_id, trajet_id, voyageurId, a, b]
    );
    if (verrou.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Aucun verrou valide pour ce segment. Sélectionnez à nouveau le siège.' });
    }

    const dejaVendu = await client.query(
      `SELECT id FROM billets
       WHERE siege_id = $1 AND trajet_id = $2 AND statut = 'confirme'
         AND NOT (
           $3 >= COALESCE(point_debarquement_ordre, 1)
           OR COALESCE(point_embarquement_ordre, 0) >= $4
         )`,
      [siege_id, trajet_id, a, b]
    );
    if (dejaVendu.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ce siège vient d\'être vendu sur ce segment' });
    }

    const infos = await client.query(
      `SELECT t.prix_base, t.agence_id, TO_CHAR(t.date_depart, 'YYYY-MM-DD') AS date_depart, t.ligne_id,
              b.supplement_premium,
              s.numero AS siege_numero, s.est_premium
       FROM trajets t
       JOIN bus b ON b.id = t.bus_id
       JOIN sieges s ON s.id = $1
       WHERE t.id = $2`,
      [siege_id, trajet_id]
    );
    const info = infos.rows[0];

    if (info.est_premium && utiliser_gratuit) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La gratuité par points ne s\'applique pas aux sièges premium' });
    }

    let prixAgence = info.prix_base;
    const troncon = await client.query(
      `SELECT prix FROM ligne_troncon_prix
       WHERE ligne_id = $1 AND ordre_depart = $2 AND ordre_arrivee = $3`,
      [info.ligne_id, a, b]
    );
    if (troncon.rows.length > 0) {
      prixAgence = troncon.rows[0].prix;
    }
    if (info.est_premium) {
      prixAgence += info.supplement_premium;
    }

    const suppSiege = est_premium_choisi ? 500 : 0;
    const suppBagage = supplement_bagage ? parseInt(supplement_bagage) : 0;
    const suppFlexible = est_flexible ? Math.round(prixAgence * 0.10) : 0;

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

    const margeJego = commission + suppSiege + suppFlexible;
    const prixAgenceFinal = prixAgence + suppBagage;
    let prixTotalClient = prixAgenceFinal + margeJego;

    const paliers = await recupererPaliers();
    let pointsUtilises = 0;
    let reductionAppliquee = 0;

    if (utiliser_gratuit) {
      const soldeCheck = await client.query(`SELECT points_fidelite FROM voyageurs WHERE id = $1`, [voyageurId]);
      if (soldeCheck.rows[0].points_fidelite < paliers.gratuitPoints) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Solde insuffisant : ${paliers.gratuitPoints} points requis pour un billet gratuit` });
      }
      pointsUtilises = paliers.gratuitPoints;
      reductionAppliquee = prixTotalClient;
      prixTotalClient = 0;
    } else if (utiliser_reduction) {
      const soldeCheck = await client.query(`SELECT points_fidelite FROM voyageurs WHERE id = $1`, [voyageurId]);
      if (soldeCheck.rows[0].points_fidelite < paliers.reductionPoints) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Solde insuffisant : ${paliers.reductionPoints} points requis pour cette réduction` });
      }
      pointsUtilises = paliers.reductionPoints;
      reductionAppliquee = Math.min(paliers.reductionFcfa, prixTotalClient);
      prixTotalClient -= reductionAppliquee;
    }

    const fraisMomo = prixTotalClient > 0 ? Math.round(prixTotalClient * 0.015) : 0;
    const referenceMomo = prixTotalClient > 0 ? `SIM-${operateur.toUpperCase()}-${Date.now()}` : 'GRATUIT-POINTS';

    const numeroBillet = genererIdentifiant('BIL');
    const qrCode = genererQR(numeroBillet, trajet_id, siege_id);

    let voyageurProprietaire = voyageurId;
    if (est_cadeau) {
      const telNormalise = normaliserTelephone(destinataire_tel);
      const destinataireCompte = await client.query(
        `SELECT id FROM voyageurs WHERE telephone = $1`,
        [telNormalise]
      );
      if (destinataireCompte.rows.length > 0) {
        voyageurProprietaire = destinataireCompte.rows[0].id;
      }
    }

    const billet = await client.query(
      `INSERT INTO billets
        (numero, trajet_id, voyageur_id, siege_id, agence_id,
         type_billet, statut, est_flexible, supplement_flexible,
         supplement_bagage, supplement_siege,
         prix_total_client, prix_agence, marge_jego, frais_momo,
         qr_code, source_vente, est_cadeau, destinataire_tel, destinataire_email,
         point_embarquement_ordre, point_debarquement_ordre)
       VALUES ($1,$2,$3,$4,$5,$6,'confirme',$7,$8,$9,$10,$11,$12,$13,$14,$15,'en_ligne',$16,$17,$18,$19,$20)
       RETURNING id, numero, qr_code, prix_total_client`,
      [numeroBillet, trajet_id, voyageurProprietaire, siege_id, info.agence_id,
       est_cadeau ? 'cadeau' : (est_flexible ? 'flexible' : 'standard'), est_flexible || false, suppFlexible,
       suppBagage, suppSiege, prixTotalClient, prixAgenceFinal, margeJego, fraisMomo,
       qrCode, est_cadeau || false, destinataire_tel || null, destinataire_email || null,
       a, b]
    );
    const billetId = billet.rows[0].id;

    await client.query(
      `INSERT INTO paiements
        (billet_id, voyageur_id, montant, operateur, reference_momo, statut, type, confirme_le)
       VALUES ($1,$2,$3,$4,$5,'confirme','paiement',NOW())`,
      [billetId, voyageurId, prixTotalClient, operateur, referenceMomo]
    );

    const montantJegoNet = margeJego - fraisMomo - reductionAppliquee;
    await client.query(
      `INSERT INTO escrow
        (billet_id, montant_total, montant_agence, montant_jego, frais_momo, statut)
       VALUES ($1,$2,$3,$4,$5,'retenu')`,
      [billetId, prixAgenceFinal + margeJego, prixAgenceFinal, montantJegoNet, fraisMomo]
    );

    await client.query(
      `DELETE FROM soft_locks
       WHERE siege_id = $1 AND trajet_id = $2
         AND COALESCE(point_embarquement_ordre, 0) = $3
         AND COALESCE(point_debarquement_ordre, 1) = $4`,
      [siege_id, trajet_id, a, b]
    );

    if (pointsUtilises > 0) {
      await debiterPoints(voyageurId, pointsUtilises, utiliser_gratuit ? 'Billet gratuit (points)' : 'Réduction (points)', billetId, client);
    }

    const pointsGagnes = calculerPointsGagnes(prixTotalClient);
    if (pointsGagnes > 0) {
      await crediterPoints(voyageurId, pointsGagnes, est_cadeau ? 'Achat de billet cadeau' : 'Achat de billet', billetId, client);
    }

    const reponse = {
      message: est_cadeau ? 'Paiement réussi, billet cadeau envoyé' : 'Paiement réussi, billet confirmé',
      billet: {
        id: billetId,
        numero: billet.rows[0].numero,
        qr_code: billet.rows[0].qr_code,
        siege: info.siege_numero,
        prix_paye: prixTotalClient,
        points_utilises: pointsUtilises,
        reduction_appliquee: reductionAppliquee,
        proprietaire_a_un_compte: voyageurProprietaire !== voyageurId
      },
      detail_prix: {
        prix_agence: prixAgenceFinal,
        commission_jego: commission,
        supplements: suppSiege + suppBagage + suppFlexible,
        frais_momo: fraisMomo,
        total_client: prixTotalClient
      }
    };

    if (cleIdempotence) {
      await client.query(
        `UPDATE requetes_idempotentes SET statut = 'termine', reponse = $1 WHERE cle = $2`,
        [JSON.stringify(reponse), cleIdempotence]
      );
    }

    await client.query('COMMIT');

    await creerNotification({
      destinataire_type: 'voyageur',
      destinataire_id: voyageurId,
      type: 'confirmation_billet',
      titre: est_cadeau ? 'Billet cadeau envoyé' : 'Billet confirmé',
      contenu: est_cadeau
        ? `Votre billet cadeau ${numeroBillet} a été envoyé au ${destinataire_tel}.`
        : `Votre billet ${numeroBillet} pour le siège ${info.siege_numero} est confirmé.`,
      canal: 'push'
    });

    if (est_cadeau) {
      await creerNotification({
        destinataire_type: 'voyageur',
        destinataire_id: voyageurProprietaire,
        type: 'billet_cadeau_recu',
        titre: 'Vous avez reçu un billet cadeau !',
        contenu: `Vous avez reçu un billet pour le siège ${info.siege_numero}. Numéro : ${numeroBillet}. Votre QR code est joint.`,
        canal: 'email'
      });
    }

    res.status(201).json(reponse);

  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ce siège vient d\'être pris par un autre voyageur' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// VENTE AU GUICHET (agence connectée, paiement espèces)
// Contourne le flux voyageur+verrou : l'agence encaisse en direct
// et crée le billet pour un client physique sans compte JEGO.
// ═══════════════════════════════════════════════════
async function venteGuichet(req, res) {
  const client = await pool.connect();
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const agenceId = req.utilisateur.id;
    const trajetId = req.params.id;
    const {
      siege_id, nom_client, telephone_client, email_client,
      supplement_bagage, est_premium_choisi, quantite_bagages,
      point_embarquement_ordre, point_debarquement_ordre
    } = req.body;

    if (!siege_id || !nom_client || !telephone_client) {
      return res.status(400).json({ error: 'Siège, nom client et téléphone sont obligatoires' });
    }

    const a = point_embarquement_ordre !== undefined ? parseInt(point_embarquement_ordre) : 0;
    const b = point_debarquement_ordre !== undefined ? parseInt(point_debarquement_ordre) : 1;

    await client.query('BEGIN');

   const trajetCheck = await client.query(
      `SELECT t.id, t.agence_id, t.prix_base, TO_CHAR(t.date_depart, 'YYYY-MM-DD') AS date_depart, t.heure_depart, t.statut, t.ligne_id,
              b.supplement_premium
       FROM trajets t JOIN bus b ON b.id = t.bus_id
       WHERE t.id = $1`,
      [trajetId]
    );
    if (trajetCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trajet introuvable' });
    }
    const trajet = trajetCheck.rows[0];
    if (trajet.agence_id !== agenceId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Ce trajet n\'appartient pas à votre agence' });
    }
    if (['en_cours', 'termine', 'annule'].includes(trajet.statut)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La vente est fermée pour ce trajet' });
    }
    // Sécurité supplémentaire, indépendante du statut : même si le
    // trajet est toujours formellement "programme" (départ pas encore
    // déclaré), on refuse toute vente après l'heure de départ prévue.
    const dateHeureDepart = new Date(`${trajet.date_depart}T${trajet.heure_depart}`);
    if (new Date() > dateHeureDepart) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'L\'heure de départ de ce trajet est déjà passée — la vente au guichet est fermée.' });
    }

    const siegeCheck = await client.query(
      `SELECT numero, est_premium, statut FROM sieges WHERE id = $1`,
      [siege_id]
    );
    if (siegeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Siège introuvable' });
    }
    const siege = siegeCheck.rows[0];
    if (['supprime_toilettes', 'desactive'].includes(siege.statut)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce siège n\'est pas vendable' });
    }

    const occupe = await client.query(
      `SELECT id FROM billets
       WHERE siege_id = $1 AND trajet_id = $2 AND statut = 'confirme'
         AND NOT (
           $3 >= COALESCE(point_debarquement_ordre, 1)
           OR COALESCE(point_embarquement_ordre, 0) >= $4
         )`,
      [siege_id, trajetId, a, b]
    );
    if (occupe.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ce siège est déjà vendu sur ce segment' });
    }

    let prixAgence = trajet.prix_base;
    const troncon = await client.query(
      `SELECT prix FROM ligne_troncon_prix WHERE ligne_id = $1 AND ordre_depart = $2 AND ordre_arrivee = $3`,
      [trajet.ligne_id, a, b]
    );
    if (troncon.rows.length > 0) prixAgence = troncon.rows[0].prix;
    if (siege.est_premium) prixAgence += trajet.supplement_premium;

    const suppSiege = est_premium_choisi ? 500 : 0;
    const suppBagage = supplement_bagage ? parseInt(supplement_bagage) : 0;
    const prixAgenceFinal = prixAgence + suppBagage + suppSiege;

    // Vente au guichet = encaissement cash direct par l'agence : aucune
    // commission JEGO, aucun frais.
    const margeJego = 0;
    const prixTotalClient = prixAgenceFinal;

    const telNormalise = normaliserTelephone(telephone_client);
    const [prenomSaisi, ...resteSaisi] = nom_client.trim().split(' ');
    const nomSaisi = resteSaisi.join(' ') || prenomSaisi;

    let voyageurId;
    // Recherche sur les 9 chiffres finaux : les numéros ont été
    // enregistrés dans des écritures variées, et un guichetier ne peut
    // pas deviner laquelle.
    const existant = await client.query(
      `SELECT id, cree_par_guichet FROM voyageurs
       WHERE RIGHT(REGEXP_REPLACE(telephone, '[^0-9]', '', 'g'), 9) = RIGHT($1, 9)`,
      [telNormalise]
    );
    if (existant.rows.length > 0) {
      voyageurId = existant.rows[0].id;

      // Le nom et l'email saisis au guichet mettent à jour le compte —
      // mais UNIQUEMENT s'il a été créé au guichet. Sur un vrai compte,
      // le voyageur seul décide de son nom : un guichetier ne doit pas
      // pouvoir le renommer en vendant un billet.
      if (existant.rows[0].cree_par_guichet) {
        await client.query(
          `UPDATE voyageurs
           SET nom = $1, prenom = $2,
               email = COALESCE(NULLIF($3, ''), email),
               mis_a_jour_le = NOW()
           WHERE id = $4`,
          [nomSaisi, prenomSaisi, (email_client || '').trim().toLowerCase(), voyageurId]
        );
      } else if (email_client) {
        // Compte réel sans email connu : on complète, sans jamais
        // écraser une adresse déjà renseignée.
        await client.query(
          `UPDATE voyageurs SET email = COALESCE(email, $1), mis_a_jour_le = NOW()
           WHERE id = $2`,
          [email_client.trim().toLowerCase(), voyageurId]
        );
      }
    } else {
      // Compte "fantôme" : le guichet ne collecte ni email ni date/lieu de
      // naissance (colonnes rendues nullables en migration pour ce cas
      // précis). Le mot de passe est un hash bcrypt d'une valeur aléatoire
      // inutilisable -- ce compte ne pourra jamais se connecter par
      // mot de passe tant que le voyageur ne complète pas son profil.
      const motDePasseInutilisable = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const nouveau = await client.query(
        `INSERT INTO voyageurs (nom, prenom, telephone, email, mot_de_passe, cree_par_guichet)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id`,
        [nomSaisi, prenomSaisi, telNormalise,
         (email_client || '').trim().toLowerCase() || null, motDePasseInutilisable]
      );
      voyageurId = nouveau.rows[0].id;
    }

    const numeroBillet = genererIdentifiant('BIL');
    const qrCode = genererQR(numeroBillet, trajetId, siege_id);

    const billet = await client.query(
      `INSERT INTO billets
        (numero, trajet_id, voyageur_id, siege_id, agence_id,
         type_billet, statut, supplement_bagage, quantite_bagages, supplement_siege,
         prix_total_client, prix_agence, marge_jego, frais_momo,
         qr_code, source_vente, point_embarquement_ordre, point_debarquement_ordre)
       VALUES ($1,$2,$3,$4,$5,'standard','confirme',$6,$7,$8,$9,$10,$11,0,$12,'physique',$13,$14)
       RETURNING id, numero, qr_code`,
      [numeroBillet, trajetId, voyageurId, siege_id, agenceId,
       suppBagage, quantite_bagages ? parseInt(quantite_bagages) : 0, suppSiege, prixTotalClient, prixAgenceFinal, margeJego,
       qrCode, a, b]
    );
    const billetId = billet.rows[0].id;

    await client.query(
      `INSERT INTO paiements
        (billet_id, voyageur_id, montant, operateur, reference_momo, statut, type, confirme_le)
       VALUES ($1,$2,$3,'especes',$4,'confirme','paiement',NOW())`,
      [billetId, voyageurId, prixTotalClient, `GUICHET-${Date.now()}`]
    );

   await client.query(
      `INSERT INTO escrow
        (billet_id, montant_total, montant_agence, montant_jego, frais_momo, statut, verse_le)
       VALUES ($1,$2,$3,$4,0,'verse',NOW())`,
      [billetId, prixTotalClient, prixAgenceFinal, margeJego]
    );

    await client.query('COMMIT');

    // Vrai tant qu'aucun email n'a été demandé ; passe à false si
    // l'envoi échoue, pour que le guichetier le sache au lieu de croire
    // le billet parti.
    let emailEnvoye = true;

    if (email_client) {
      const trajetInfo = await pool.query(
        `SELECT vd.nom_affiche AS depart, va.nom_affiche AS arrivee, t.date_depart, t.heure_depart, t.ligne_id
         FROM trajets t
         JOIN lignes l ON l.id = t.ligne_id
         JOIN villes vd ON vd.code = l.ville_depart
         JOIN villes va ON va.code = l.ville_arrivee
         WHERE t.id = $1`,
        [trajetId]
      );
      const ti = trajetInfo.rows[0];
      const dateFr = ti ? new Date(ti.date_depart).toLocaleDateString('fr-FR') : '';
      const heureFr = ti ? String(ti.heure_depart).slice(0, 5) : '';

      let arretsIntermediaires = [];
      if (ti) {
        const arretsResult = await pool.query(
          `SELECT v.nom_affiche AS ville
           FROM ligne_points lp
           JOIN villes v ON v.code = lp.ville
           WHERE lp.ligne_id = $1 AND lp.ordre > $2 AND lp.ordre < $3
           ORDER BY lp.ordre`,
          [ti.ligne_id, a, b]
        );
        arretsIntermediaires = arretsResult.rows.map((r) => r.ville);
      }

      let pieceJointe;
      try {
        const pdfBuffer = await genererPdfBillet({
          numeroBillet: billet.rows[0].numero,
          contenuQR: billet.rows[0].qr_code,
          nomClient: nom_client,
          depart: ti ? ti.depart : '',
          arrivee: ti ? ti.arrivee : '',
          arrets: arretsIntermediaires,
          dateDepart: dateFr,
          heureDepart: heureFr,
          siegeNumero: siege.numero,
          siegePremium: siege.est_premium === true,
          bagageQuantite: quantite_bagages ? parseInt(quantite_bagages) : 0,
          prixTotal: prixTotalClient
        });
        pieceJointe = { nom: `billet-${billet.rows[0].numero}.pdf`, contenu: pdfBuffer };
      } catch (err) {
        console.error('⚠️ [PDF billet] Échec de génération :', err.message);
      }

      emailEnvoye = await envoyerEmailDirect(
        email_client,
        `Confirmation de billet — ${billet.rows[0].numero}`,
        `Bonjour ${nom_client},\n\nVotre billet est confirmé, vous le trouverez en pièce jointe (PDF avec QR code à présenter au chauffeur).\n\nTrajet : ${ti ? `${ti.depart} → ${ti.arrivee}` : ''}\nDate : ${dateFr}${ti ? ` à ${heureFr}` : ''}\nSiège : ${siege.numero}\nMontant payé : ${prixTotalClient} FCFA\nNuméro de billet : ${billet.rows[0].numero}\n\nBon voyage avec JEGO !`,
        pieceJointe
      ).catch(() => false);
    }

    res.status(201).json({
      message: 'Vente au guichet enregistrée',
      email_envoye: emailEnvoye,
      billet: {
        id: billetId,
        numero: billet.rows[0].numero,
        qr_code: billet.rows[0].qr_code,
        siege: siege.numero,
        prix_total: prixTotalClient
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
// SCANNER UN BILLET (chauffeur connecté) — inchangé,
// déjà signé/vérifiable hors-ligne via utils/qr.js
// ═══════════════════════════════════════════════════
async function scannerBillet(req, res) {
  try {
    if (req.utilisateur.type !== 'chauffeur') {
      return res.status(403).json({ error: 'Seul un chauffeur peut scanner les billets' });
    }
    const chauffeurId = req.utilisateur.id;

    const { contenu_qr } = req.body;
    if (!contenu_qr) {
      return res.status(400).json({ error: 'Contenu du QR manquant' });
    }

    const verification = verifierQR(contenu_qr);
    if (!verification.valide) {
      return res.status(400).json({
        valide: false,
        message: 'Billet REFUSÉ',
        raison: verification.raison
      });
    }

    const billet = await pool.query(
      `SELECT b.id, b.numero, b.statut, b.qr_scanne, b.qr_scanne_le,
              b.point_embarquement_ordre,
              s.numero AS siege_numero,
              v.nom, v.prenom,
              t.id AS trajet_id, t.chauffeur_id, t.statut AS trajet_statut,
              TO_CHAR(t.date_depart, 'YYYY-MM-DD') AS date_depart, t.heure_depart,
              -- Arrêt où le bus se trouve en ce moment : le dernier dont
              -- l'arrivée est déclarée et le départ ne l'est pas encore.
              (SELECT aa.ordre FROM arrivees_arrets aa
                WHERE aa.trajet_id = t.id AND aa.heure_depart_reelle IS NULL
                ORDER BY aa.ordre DESC LIMIT 1) AS arret_en_cours
       FROM billets b
       JOIN sieges s ON s.id = b.siege_id
       JOIN voyageurs v ON v.id = b.voyageur_id
       JOIN trajets t ON t.id = b.trajet_id
       WHERE b.numero = $1`,
      [verification.numero]
    );

    if (billet.rows.length === 0) {
      return res.status(404).json({
        valide: false,
        message: 'Billet REFUSÉ',
        raison: 'Billet introuvable'
      });
    }

    const b = billet.rows[0];

    if (b.chauffeur_id !== chauffeurId) {
      return res.status(403).json({
        valide: false,
        message: 'Billet REFUSÉ',
        raison: 'Ce billet n\'est pas pour votre trajet'
      });
    }

    // ── Fenêtre d'embarquement ────────────────────────────────────
    // Elle s'ouvre 1 h avant le départ, se ferme quand le bus part, et
    // se rouvre à chaque arrêt tant que le chauffeur n'en a pas déclaré
    // le départ. Cette règle vivait uniquement dans l'application :
    // n'importe quel appel direct au serveur pouvait scanner un billet
    // trois jours avant le voyage.
    const OUVERTURE_AVANT_DEPART_MS = 60 * 60 * 1000;
    let pointEmbarquement = null; // arrêt où l'on peut monter maintenant

    if (b.trajet_statut === 'programme') {
      const depart = new Date(`${b.date_depart}T${b.heure_depart}`);
      if (new Date() < new Date(depart.getTime() - OUVERTURE_AVANT_DEPART_MS)) {
        return res.status(400).json({
          valide: false,
          message: 'Billet REFUSÉ',
          raison: `L'embarquement ouvre une heure avant le départ (${String(b.heure_depart).slice(0, 5)}).`
        });
      }
      pointEmbarquement = 0;
    } else if (b.trajet_statut === 'en_cours') {
      if (b.arret_en_cours === null) {
        return res.status(400).json({
          valide: false,
          message: 'Billet REFUSÉ',
          raison: 'Le bus est en route entre deux arrêts : l\'embarquement est fermé.'
        });
      }
      pointEmbarquement = parseInt(b.arret_en_cours);
    } else {
      return res.status(400).json({
        valide: false,
        message: 'Billet REFUSÉ',
        raison: 'Ce trajet est terminé ou annulé.'
      });
    }

    // Un voyageur qui monte plus loin ne peut pas être à bord ici. Un
    // voyageur monté plus tôt et oublié au scan reste acceptable : on
    // rattrape, on ne punit pas le passager pour un oubli du chauffeur.
    const ordreMontee = parseInt(b.point_embarquement_ordre ?? 0);
    if (ordreMontee > pointEmbarquement) {
      return res.status(400).json({
        valide: false,
        message: 'Billet REFUSÉ',
        raison: 'Ce passager monte à un arrêt que le bus n\'a pas encore atteint.'
      });
    }

    if (b.statut === 'annule') {
      return res.status(400).json({
        valide: false,
        message: 'Billet REFUSÉ',
        raison: 'Ce billet a été annulé'
      });
    }

    if (b.qr_scanne) {
      return res.status(409).json({
        valide: false,
        message: 'Billet DÉJÀ UTILISÉ',
        raison: `Ce passager est déjà monté (scanné à ${new Date(b.qr_scanne_le).toLocaleTimeString('fr-FR')})`,
        passager: `${b.prenom} ${b.nom}`,
        siege: b.siege_numero
      });
    }

    await pool.query(
      `UPDATE billets SET qr_scanne = true, qr_scanne_le = NOW() WHERE id = $1`,
      [b.id]
    );

    res.json({
      valide: true,
      message: 'Billet VALIDE — embarquement autorisé',
      passager: `${b.prenom} ${b.nom}`,
      siege: b.siege_numero,
      numero: b.numero
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { planTrajet, verrouillerSiege, prolongerVerrou, payer, venteGuichet, scannerBillet };
