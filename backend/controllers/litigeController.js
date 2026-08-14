const pool = require('../config/database');
const { creerNotification } = require('../services/notificationService');
const { journaliser } = require('../services/logService');

// ═══════════════════════════════════════════════════
// OUVRIR UN LITIGE (voyageur, avec billet)
// ═══════════════════════════════════════════════════
async function ouvrirLitige(req, res) {
  try {
    const voyageurId = req.utilisateur.id;
    const { billet_id, motif, description } = req.body;

    if (!billet_id || !motif || !description) {
      return res.status(400).json({ error: 'Billet, motif et description sont obligatoires' });
    }

    const billet = await pool.query(
      `SELECT id, trajet_id, agence_id FROM billets WHERE id = $1 AND voyageur_id = $2`,
      [billet_id, voyageurId]
    );
    if (billet.rows.length === 0) {
      return res.status(403).json({ error: 'Ce billet ne vous appartient pas ou est introuvable' });
    }
    const b = billet.rows[0];

    const numero = `LIT-${Date.now()}`;

    const resultat = await pool.query(
      `INSERT INTO litiges
        (numero, billet_id, trajet_id, voyageur_id, agence_id, ouvert_par, niveau, motif, description, statut)
       VALUES ($1, $2, $3, $4, $5, 'voyageur', 1, $6, $7, 'ouvert')
       RETURNING id, numero, statut`,
      [numero, billet_id, b.trajet_id, voyageurId, b.agence_id, motif, description]
    );

    await creerNotification({
      destinataire_type: 'agence',
      destinataire_id: b.agence_id,
      type: 'litige_ouvert',
      titre: 'Nouveau litige ouvert',
      contenu: `Un client a ouvert un litige (${motif}). Vous avez 48h pour répondre.`,
      canal: 'email'
    });

    res.status(201).json({
      message: 'Litige ouvert. L\'agence a 48h pour répondre.',
      litige: resultat.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// L'AGENCE RÉPOND AU LITIGE (niveau 2)
// ═══════════════════════════════════════════════════
async function repondreLitige(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const litigeId = req.params.id;
    const { reponse } = req.body;

    if (!reponse || reponse.trim().length === 0) {
      return res.status(400).json({ error: 'La réponse est obligatoire' });
    }

    const check = await pool.query(
      `SELECT id, statut, voyageur_id FROM litiges WHERE id = $1 AND agence_id = $2`,
      [litigeId, agenceId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Litige introuvable' });
    }
    if (['resolu', 'cloture'].includes(check.rows[0].statut)) {
      return res.status(400).json({ error: 'Ce litige est déjà clos' });
    }

    await pool.query(
      `UPDATE litiges SET
        reponse_agence = $1, reponse_agence_le = NOW(),
        niveau = 2, statut = 'en_cours', mis_a_jour_le = NOW()
       WHERE id = $2`,
      [reponse, litigeId]
    );

    await creerNotification({
      destinataire_type: 'voyageur',
      destinataire_id: check.rows[0].voyageur_id,
      type: 'litige_reponse',
      titre: 'L\'agence a répondu à votre litige',
      contenu: reponse,
      canal: 'push'
    });

    res.json({ message: 'Réponse enregistrée', litige_id: litigeId, niveau: 2 });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// L'ADMIN TRANCHE (niveau 3) — effet automatique réel sur l'escrow
//
// gagnant = 'agence' : l'escrow du billet passe 'retenu' -> 'verse'.
// gagnant = 'voyageur' : l'escrow passe 'retenu' -> 'rembourse',
//   une ligne remboursements (motif='litige') est créée.
// ═══════════════════════════════════════════════════
async function trancherLitige(req, res) {
  const client = await pool.connect();
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const adminId = req.utilisateur.id;
    const litigeId = req.params.id;
    const { decision, gagnant } = req.body;

    if (!decision || decision.trim().length === 0) {
      return res.status(400).json({ error: 'La décision est obligatoire' });
    }
    if (!['voyageur', 'agence'].includes(gagnant)) {
      return res.status(400).json({ error: "Le champ gagnant doit valoir 'voyageur' ou 'agence'" });
    }

    await client.query('BEGIN');

    const check = await client.query(
      `SELECT id, billet_id, voyageur_id, agence_id, statut FROM litiges WHERE id = $1 FOR UPDATE`,
      [litigeId]
    );
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Litige introuvable' });
    }
    const l = check.rows[0];
    if (['resolu', 'cloture'].includes(l.statut)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce litige est déjà tranché' });
    }

    await client.query(
      `UPDATE litiges SET
        decision = $1, gagnant = $2, decide_par = $3, decide_le = NOW(),
        niveau = 3, statut = 'resolu', mis_a_jour_le = NOW()
       WHERE id = $4`,
      [decision, gagnant, adminId, litigeId]
    );

    let montantMouvemente = 0;

    if (l.billet_id) {
      const escrowRow = await client.query(
        `SELECT id, statut, montant_total, montant_agence FROM escrow WHERE billet_id = $1 FOR UPDATE`,
        [l.billet_id]
      );

      if (escrowRow.rows.length > 0 && escrowRow.rows[0].statut === 'retenu') {
        const e = escrowRow.rows[0];

        if (gagnant === 'agence') {
          await client.query(
            `UPDATE escrow SET statut = 'verse', verse_le = NOW() WHERE id = $1`,
            [e.id]
          );
          montantMouvemente = e.montant_agence;

        } else {
          await client.query(
            `UPDATE escrow SET statut = 'rembourse' WHERE id = $1`,
            [e.id]
          );
          await client.query(
            `INSERT INTO remboursements
              (billet_id, voyageur_id, montant, motif, pourcentage, statut, reference, traite_le)
             VALUES ($1, $2, $3, 'litige', 100, 'traite', $4, NOW())`,
            [l.billet_id, l.voyageur_id, e.montant_total, `REMB-LIT-${Date.now()}`]
          );
          montantMouvemente = e.montant_total;
        }
      }
    }

    await client.query('COMMIT');

    await journaliser({
      acteurType: 'membre_admin', acteurId: adminId,
      action: 'decision_litige',
      details: { litige_id: litigeId, gagnant, montant_mouvemente: montantMouvemente },
      ipAddress: req.ip, estUrgence: true,
    });

    await creerNotification({
      destinataire_type: 'voyageur', destinataire_id: l.voyageur_id,
      type: 'litige_decision', titre: 'Décision rendue sur votre litige',
      contenu: gagnant === 'voyageur'
        ? `${decision} Remboursement de ${montantMouvemente} FCFA traité.`
        : decision,
      canal: 'email'
    });
    await creerNotification({
      destinataire_type: 'agence', destinataire_id: l.agence_id,
      type: 'litige_decision', titre: 'Décision rendue sur un litige',
      contenu: gagnant === 'agence'
        ? `${decision} Versement de ${montantMouvemente} FCFA effectué.`
        : decision,
      canal: 'email'
    });

    res.json({
      message: 'Décision enregistrée et appliquée',
      litige_id: litigeId,
      gagnant,
      montant_mouvemente: montantMouvemente
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// LISTER SES LITIGES (voyageur ou agence, selon le token)
// ═══════════════════════════════════════════════════
async function mesLitiges(req, res) {
  try {
    const { id, type } = req.utilisateur;
    let colonne;
    if (type === 'voyageur') colonne = 'voyageur_id';
    else if (type === 'agence') colonne = 'agence_id';
    else return res.status(403).json({ error: 'Accès non autorisé' });

    const resultat = await pool.query(
      `SELECT l.id, l.numero, l.motif, l.description, l.statut, l.niveau,
              l.reponse_agence, l.decision, l.gagnant, l.cree_le,
              v.prenom || ' ' || v.nom AS client,
              CASE WHEN vd.nom_affiche IS NOT NULL
                THEN vd.nom_affiche || ' → ' || va.nom_affiche
                ELSE NULL END AS trajet,
              b.prix_total_client AS montant
       FROM litiges l
       LEFT JOIN voyageurs v ON v.id = l.voyageur_id
       LEFT JOIN trajets t ON t.id = l.trajet_id
       LEFT JOIN lignes li ON li.id = t.ligne_id
       LEFT JOIN villes vd ON vd.code = li.ville_depart
       LEFT JOIN villes va ON va.code = li.ville_arrivee
       LEFT JOIN billets b ON b.id = l.billet_id
       WHERE l.${colonne} = $1
       ORDER BY l.cree_le DESC`,
      [id]
    );

    res.json({ nombre: resultat.rows.length, litiges: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// LISTER TOUS LES LITIGES OUVERTS (admin)
// ═══════════════════════════════════════════════════
async function litigesAdmin(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const resultat = await pool.query(
      `SELECT l.id, l.numero, l.motif, l.description, l.statut, l.niveau,
              l.reponse_agence, l.cree_le,
              a.nom AS nom_agence, v.nom AS nom_voyageur, v.prenom AS prenom_voyageur
       FROM litiges l
       JOIN agences a ON a.id = l.agence_id
       JOIN voyageurs v ON v.id = l.voyageur_id
       WHERE l.statut NOT IN ('resolu', 'cloture')
       ORDER BY l.cree_le ASC`
    );

    res.json({ nombre: resultat.rows.length, litiges: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { ouvrirLitige, repondreLitige, trancherLitige, mesLitiges, litigesAdmin };
