const pool = require('../config/database');
const { verserEscrowTrajet } = require('../services/escrowService');
const { appliquerBaremeRetard } = require('../services/retardService');
const { creerNotification } = require('../services/notificationService');

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
         heure_arrivee_estimee, heure_arrivee_initiale, prix_base, categorie, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, 'programme')
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

    const retard = await appliquerBaremeRetard(client, trajetId);

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
// VERSER L'ESCROW (route) — délègue au service
// ═══════════════════════════════════════════════════
async function verserEscrow(req, res) {
  try {
    const trajetId = req.params.id;
    const resultat = await verserEscrowTrajet(trajetId);

    if (resultat.suspendu) {
      return res.status(200).json({
        message: 'Versement SUSPENDU : seuil de signalements de fausse arrivée atteint.',
        ...resultat
      });
    }
    if (!resultat.ok) {
      return res.status(400).json({ error: resultat.raison });
    }

    res.json({
      message: 'Escrow versé à l\'agence',
      ...resultat
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// ═══════════════════════════════════════════════════
// ANNULER UN TRAJET (agence) — rembourse 100% tous les billets
// ═══════════════════════════════════════════════════
async function annulerTrajet(req, res) {
  const client = await pool.connect();
  try {
    const agenceId = req.utilisateur.id;
    const trajetId = req.params.id;
    const { motif } = req.body;

    // Motif obligatoire
    if (!motif || motif.trim().length === 0) {
      return res.status(400).json({ error: 'Le motif d\'annulation est obligatoire' });
    }

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

    // 2. Interdire l'annulation d'un trajet déjà terminé ou déjà annulé
    if (trajet.statut === 'termine') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Impossible d\'annuler un trajet déjà terminé' });
    }
    if (trajet.statut === 'annule') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce trajet est déjà annulé' });
    }

    // 3. Récupérer tous les billets confirmés du trajet
    const billets = await client.query(
      `SELECT id, voyageur_id, prix_total_client FROM billets
       WHERE trajet_id = $1 AND statut = 'confirme'`,
      [trajetId]
    );

    // 4. Pour chaque billet : rembourser 100%, escrow remboursé, ligne de remboursement
    let totalRembourse = 0;
    for (const billet of billets.rows) {
      // Passer le billet en annulé
      await client.query(
        `UPDATE billets SET statut = 'annule', mis_a_jour_le = NOW() WHERE id = $1`,
        [billet.id]
      );

      // Escrow → remboursé (l'agence ne touche rien, JEGO rembourse le client)
      await client.query(
        `UPDATE escrow SET statut = 'rembourse' WHERE billet_id = $1`,
        [billet.id]
      );

      // Créer la ligne de remboursement (100%)
      const reference = `REMB-${Date.now()}-${billet.id.slice(0,4)}`;
      await client.query(
        `INSERT INTO remboursements
          (billet_id, voyageur_id, montant, motif, pourcentage, statut, reference, traite_le)
         VALUES ($1, $2, $3, 'annulation_agence', 100, 'traite', $4, NOW())`,
        [billet.id, billet.voyageur_id, billet.prix_total_client, reference]
      );

      totalRembourse += billet.prix_total_client;
      // [SIMULATION] Remboursement Mobile Money + notification voyageur
    }

    await creerNotification({
        destinataire_type: 'voyageur',
        destinataire_id: billet.voyageur_id,
        type: 'remboursement',
        titre: 'Trajet annulé — remboursement intégral',
        contenu: `Votre trajet a été annulé par l'agence. Vous êtes remboursé à 100% (${billet.prix_total_client} FCFA).`,
        canal: 'push'
      });

    // 5. Passer le trajet en "annule"
    await client.query(
      `UPDATE trajets SET statut = 'annule', mis_a_jour_le = NOW() WHERE id = $1`,
      [trajetId]
    );

    // 6. Nettoyer les verrous éventuels sur ce trajet
    await client.query(`DELETE FROM soft_locks WHERE trajet_id = $1`, [trajetId]);

    await client.query('COMMIT');

    res.json({
      message: 'Trajet annulé. Tous les voyageurs seront remboursés à 100%.',
      motif: motif,
      billets_rembourses: billets.rows.length,
      total_rembourse: totalRembourse
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// DÉCLARER UN RETARD (agence)
// Met à jour les horaires ANNONCÉS, mais la référence
// du barème (heure_arrivee_initiale) reste intouchable.
// ═══════════════════════════════════════════════════

   async function declarerRetard(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const trajetId = req.params.id;
    const { retard_minutes, nouvelle_heure_depart, nouvelle_heure_arrivee } = req.body;

    if (!retard_minutes || retard_minutes <= 0) {
      return res.status(400).json({ error: 'Le retard en minutes est obligatoire et doit être positif' });
    }

    const check = await pool.query(
      `SELECT id, statut FROM trajets WHERE id = $1 AND agence_id = $2`,
      [trajetId, agenceId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Trajet introuvable' });
    }
    const statut = check.rows[0].statut;

    if (['termine', 'annule'].includes(statut)) {
      return res.status(400).json({ error: 'Impossible de déclarer un retard sur un trajet terminé ou annulé' });
    }

    await pool.query(
      `UPDATE trajets SET
        statut = CASE WHEN statut = 'en_cours' THEN 'en_cours' ELSE 'retard' END,
        retard_minutes = $1,
        heure_depart = COALESCE($2, heure_depart),
        heure_arrivee_estimee = COALESCE($3, heure_arrivee_estimee),
        mis_a_jour_le = NOW()
       WHERE id = $4`,
      [retard_minutes, nouvelle_heure_depart || null, nouvelle_heure_arrivee || null, trajetId]
    );

    const passagers = await pool.query(
      `SELECT voyageur_id FROM billets WHERE trajet_id = $1 AND statut = 'confirme'`,
      [trajetId]
    );
    for (const p of passagers.rows) {
      await creerNotification({
        destinataire_type: 'voyageur',
        destinataire_id: p.voyageur_id,
        type: 'retard',
        titre: 'Retard sur votre trajet',
        contenu: `Votre trajet a ${retard_minutes} min de retard. Nouveau départ : ${nouvelle_heure_depart || 'inchangé'}, nouvelle arrivée estimée : ${nouvelle_heure_arrivee || 'inchangée'}.`,
        canal: 'push'
      });
    }

    res.json({
      message: `Retard de ${retard_minutes} min déclaré. Les passagers seront notifiés.`,
      trajet_id: trajetId,
      nouveaux_horaires: {
        depart: nouvelle_heure_depart || 'inchangé',
        arrivee_estimee: nouvelle_heure_arrivee || 'inchangée'
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { creerTrajet, listerTrajets, declarerArrivee, verserEscrow, assignerChauffeur, annulerTrajet, declarerRetard };