const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// CRÉER UN TRAJET
// ═══════════════════════════════════════════════════
async function creerTrajet(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const {
      ligne_id, bus_id, date_depart, heure_depart,
      heure_arrivee_estimee, prix_base, categorie
    } = req.body;

    // Vérifier les champs obligatoires
    if (!ligne_id || !bus_id || !date_depart || !heure_depart || !prix_base) {
      return res.status(400).json({
        error: 'Ligne, bus, date, heure de départ et prix sont obligatoires'
      });
    }

    // Vérifier que la ligne appartient à l'agence
    const ligneCheck = await pool.query(
      'SELECT id FROM lignes WHERE id = $1 AND agence_id = $2',
      [ligne_id, agenceId]
    );
    if (ligneCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ligne introuvable ou n\'appartient pas à votre agence' });
    }

    // Vérifier que le bus appartient à l'agence
    const busCheck = await pool.query(
      'SELECT id FROM bus WHERE id = $1 AND agence_id = $2',
      [bus_id, agenceId]
    );
    if (busCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bus introuvable ou n\'appartient pas à votre agence' });
    }

    // Vérifier la catégorie
    const categorieValide = categorie || 'standard';
    if (!['standard', 'vip', 'express', 'nuit'].includes(categorieValide)) {
      return res.status(400).json({ error: 'Catégorie invalide : standard, vip, express ou nuit' });
    }

    // Créer le trajet
    const resultat = await pool.query(
      `INSERT INTO trajets
        (agence_id, ligne_id, bus_id, date_depart, heure_depart,
         heure_arrivee_estimee, prix_base, categorie, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'programme')
       RETURNING id, date_depart, heure_depart, heure_arrivee_estimee, prix_base, categorie, statut`,
      [agenceId, ligne_id, bus_id, date_depart, heure_depart,
       heure_arrivee_estimee || null, prix_base, categorieValide]
    );

    res.status(201).json({
      message: 'Trajet créé avec succès',
      trajet: resultat.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// LISTER LES TRAJETS DE L'AGENCE
// ═══════════════════════════════════════════════════
async function listerTrajets(req, res) {
  try {
    const agenceId = req.utilisateur.id;

    const resultat = await pool.query(
      `SELECT t.id, t.date_depart, t.heure_depart, t.heure_arrivee_estimee,
              t.prix_base, t.categorie, t.statut,
              l.ville_depart, l.ville_arrivee,
              b.nom AS nom_bus, b.disposition
       FROM trajets t
       JOIN lignes l ON l.id = t.ligne_id
       JOIN bus b ON b.id = t.bus_id
       WHERE t.agence_id = $1
       ORDER BY t.date_depart, t.heure_depart`,
      [agenceId]
    );

    res.json({ trajets: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// DÉCLARER L'ARRIVÉE D'UN TRAJET (agence)
// Passe le trajet en "termine", programme le versement
// de l'escrow 6h plus tard (délai anti-fraude)
// ═══════════════════════════════════════════════════
async function declarerArrivee(req, res) {
  const client = await pool.connect();
  try {
    const agenceId = req.utilisateur.id;
    const trajetId = req.params.id;

    await client.query('BEGIN');

    // 1. Vérifier que le trajet appartient à l'agence
    const trajetCheck = await client.query(
      `SELECT id, statut FROM trajets WHERE id = $1 AND agence_id = $2`,
      [trajetId, agenceId]
    );
    if (trajetCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trajet introuvable' });
    }

    const trajet = trajetCheck.rows[0];

    // 2. Vérifier qu'il n'est pas déjà terminé ou annulé
    if (trajet.statut === 'termine') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce trajet est déjà déclaré arrivé' });
    }
    if (trajet.statut === 'annule') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce trajet a été annulé' });
    }

    // 3. Passer le trajet en "termine", enregistrer l'heure d'arrivée
    //    et programmer le versement de l'escrow dans 6h
    await client.query(
      `UPDATE trajets
       SET statut = 'termine',
           heure_arrivee_reelle = NOW(),
           versement_escrow_le = NOW() + INTERVAL '6 hours',
           mis_a_jour_le = NOW()
       WHERE id = $1`,
      [trajetId]
    );

    // 4. Marquer les billets confirmés comme "utilise"
    const billetsResult = await client.query(
      `UPDATE billets SET statut = 'utilise', mis_a_jour_le = NOW()
       WHERE trajet_id = $1 AND statut = 'confirme'
       RETURNING id`,
      [trajetId]
    );

    // 5. Notifier les passagers (simulation pour l'instant)
    //    Plus tard : push "Arrivée déclarée, c'était comment ?"

    await client.query('COMMIT');

    res.json({
      message: 'Arrivée déclarée. Le versement à l\'agence interviendra dans 6h sauf signalement.',
      trajet_id: trajetId,
      billets_concernes: billetsResult.rows.length,
      versement_prevu: 'dans 6 heures (sous réserve d\'absence de signalement de fraude)'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// VERSER L'ESCROW À L'AGENCE (après délai 6h, si pas de fraude)
// Sera appelée par un job automatique. Vérifie le seuil
// de signalements "fausse_arrivee" avant de verser.
// ═══════════════════════════════════════════════════
async function verserEscrow(req, res) {
  const client = await pool.connect();
  try {
    const trajetId = req.params.id;

    await client.query('BEGIN');

    // 1. Récupérer le trajet et vérifier qu'il est terminé
    const trajetResult = await client.query(
      `SELECT id, statut, versement_escrow_le FROM trajets WHERE id = $1`,
      [trajetId]
    );
    if (trajetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trajet introuvable' });
    }
    const trajet = trajetResult.rows[0];

    if (trajet.statut !== 'termine') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Le trajet n\'est pas terminé' });
    }

    // 2. Vérifier que le délai de 6h est passé
    if (new Date(trajet.versement_escrow_le) > new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Le délai de sécurité de 6h n\'est pas encore écoulé',
        versement_possible_a: trajet.versement_escrow_le
      });
    }

    // 3. Compter les passagers (billets utilisés) pour ce trajet
    const passagersResult = await client.query(
      `SELECT COUNT(*) AS nb FROM billets WHERE trajet_id = $1 AND statut = 'utilise'`,
      [trajetId]
    );
    const nbPassagers = parseInt(passagersResult.rows[0].nb);

    // 4. Déterminer le seuil collectif selon le nombre de passagers
    let seuil;
    if (nbPassagers <= 20) seuil = 3;
    else if (nbPassagers <= 40) seuil = 4;
    else seuil = 5;

    // 5. Compter les signalements "fausse_arrivee" pour ce trajet
    const signalementsResult = await client.query(
      `SELECT COUNT(*) AS nb FROM signalements
       WHERE trajet_id = $1 AND categorie = 'fausse_arrivee'`,
      [trajetId]
    );
    const nbSignalements = parseInt(signalementsResult.rows[0].nb);

    // 6. Décision : verser ou suspendre
    if (nbSignalements >= seuil) {
      // Seuil atteint → suspendre le versement, créer un litige
      await client.query(
        `UPDATE trajets SET statut = 'incident', mis_a_jour_le = NOW() WHERE id = $1`,
        [trajetId]
      );
      await client.query('COMMIT');
      return res.status(200).json({
        message: 'Versement SUSPENDU : seuil de signalements de fausse arrivée atteint. Investigation requise.',
        nb_passagers: nbPassagers,
        seuil: seuil,
        nb_signalements: nbSignalements
      });
    }

    // 7. Pas de fraude → verser tous les escrows "retenu" de ce trajet
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

    const totalVerse = escrowResult.rows.reduce((somme, e) => somme + e.montant_agence, 0);

    await client.query('COMMIT');

    res.json({
      message: 'Escrow versé à l\'agence',
      nb_passagers: nbPassagers,
      seuil: seuil,
      nb_signalements: nbSignalements,
      billets_verses: escrowResult.rows.length,
      total_verse_agence: totalVerse
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// ASSIGNER UN CHAUFFEUR À UN TRAJET (agence)
// ═══════════════════════════════════════════════════
async function assignerChauffeur(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const trajetId = req.params.id;
    const { chauffeur_id } = req.body;

    if (!chauffeur_id) {
      return res.status(400).json({ error: 'L\'identifiant du chauffeur est obligatoire' });
    }

    // 1. Vérifier que le trajet appartient à l'agence
    const trajetCheck = await pool.query(
      'SELECT id, statut FROM trajets WHERE id = $1 AND agence_id = $2',
      [trajetId, agenceId]
    );
    if (trajetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trajet introuvable' });
    }

    // 2. Vérifier que le chauffeur appartient à la même agence et est actif
    const chauffeurCheck = await pool.query(
      'SELECT id, nom, prenom, desactive_urgence FROM chauffeurs WHERE id = $1 AND agence_id = $2',
      [chauffeur_id, agenceId]
    );
    if (chauffeurCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chauffeur introuvable dans votre agence' });
    }
    if (chauffeurCheck.rows[0].desactive_urgence) {
      return res.status(400).json({ error: 'Ce chauffeur est désactivé, impossible de l\'assigner' });
    }

    // 3. Assigner le chauffeur au trajet
    await pool.query(
      'UPDATE trajets SET chauffeur_id = $1, mis_a_jour_le = NOW() WHERE id = $2',
      [chauffeur_id, trajetId]
    );

    const ch = chauffeurCheck.rows[0];
    res.json({
      message: `Chauffeur ${ch.prenom} ${ch.nom} assigné au trajet`,
      trajet_id: trajetId,
      chauffeur_id: chauffeur_id
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { creerTrajet, listerTrajets, declarerArrivee, verserEscrow, assignerChauffeur };