const pool = require('../config/database');
const { verserEscrowTrajet } = require('../services/escrowService');
const { appliquerBaremeRetard } = require('../services/retardService');
const { creerNotification } = require('../services/notificationService');
const { rembourserBillet } = require('../services/portefeuilleService');
const { rendrePointsDepenses } = require('../services/pointsService');
const { verifierBorne } = require('../utils/bornes');
const { erreurServeur } = require('../utils/erreurServeur');

// ═══════════════════════════════════════════════════
// CRÉER UN TRAJET
// ═══════════════════════════════════════════════════
async function creerTrajet(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const {
      ligne_id, bus_id, date_depart, heure_depart,
      heure_arrivee_estimee, prix_base, prix_bagage_supplementaire,
      distribution_nourriture
    } = req.body;

    if (!ligne_id || !bus_id || !date_depart || !heure_depart || !prix_base) {
      return res.status(400).json({
        error: 'Ligne, bus, date, heure de départ et prix sont obligatoires'
      });
    }
    const erreurPrix = verifierBorne('prix_base', prix_base)
      || verifierBorne('prix_bagage_supplementaire', prix_bagage_supplementaire, true);
    if (erreurPrix) return res.status(400).json({ error: erreurPrix });

    const ligneCheck = await pool.query(
      'SELECT id FROM lignes WHERE id = $1 AND agence_id = $2',
      [ligne_id, agenceId]
    );
    if (ligneCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ligne introuvable ou n\'appartient pas à votre agence' });
    }

    const busCheck = await pool.query(
      'SELECT id, type_bus FROM bus WHERE id = $1 AND agence_id = $2',
      [bus_id, agenceId]
    );
    if (busCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bus introuvable ou n\'appartient pas à votre agence' });
    }

    // La catégorie n'est plus un choix manuel : elle suit toujours le bus
    // réellement assigné (standard/mixte/vip). "Nuit" et "Express" ne sont
    // plus stockés du tout — badges calculés à l'affichage (heure de
    // départ / absence d'arrêts), jamais liés au prix.
    const categorieValide = busCheck.rows[0].type_bus;
    const bagageSupp = prix_bagage_supplementaire !== undefined ? Number(prix_bagage_supplementaire) : 1000;

    // Le numéro public du trajet EST l'identifiant de voyage lisible
    // « TRA-AAMMJJ-HHMM-XXXX » (date + heure de départ + 4 car. de l'UUID),
    // stocké une bonne fois (source de vérité unique). On insère (le DEFAULT
    // pose un TRJ- transitoire), puis on le remplace par le vrai numéro.
    const insere = await pool.query(
      `INSERT INTO trajets
        (agence_id, ligne_id, bus_id, date_depart, heure_depart,
         heure_arrivee_estimee, heure_arrivee_initiale, prix_base, categorie,
         prix_bagage_supplementaire, distribution_nourriture, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, 'programme')
       RETURNING id`,
      [agenceId, ligne_id, bus_id, date_depart, heure_depart,
       heure_arrivee_estimee || null, prix_base, categorieValide, bagageSupp, distribution_nourriture === true]
    );

    const resultat = await pool.query(
      `UPDATE trajets
          SET numero = 'TRA-' || to_char(date_depart, 'YYMMDD') || '-' ||
                       to_char(heure_depart, 'HH24MI') || '-' ||
                       UPPER(SUBSTRING(id::text, 1, 4))
        WHERE id = $1
       RETURNING id, numero, date_depart, heure_depart, heure_arrivee_estimee, prix_base, categorie, prix_bagage_supplementaire, distribution_nourriture, statut`,
      [insere.rows[0].id]
    );

    res.status(201).json({
      message: 'Trajet créé avec succès',
      trajet: resultat.rows[0]
    });

  } catch (err) {
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// LISTER LES TRAJETS DE L'AGENCE
// ═══════════════════════════════════════════════════
async function listerTrajets(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const { chauffeur_id } = req.query;

    const params = [agenceId];
    let filtreChauffeur = '';
    if (chauffeur_id) {
      params.push(chauffeur_id);
      filtreChauffeur = `AND t.chauffeur_id = $2`;
    }

    const resultat = await pool.query(
      `SELECT t.id, t.numero, TO_CHAR(t.date_depart, 'YYYY-MM-DD') AS date_depart, t.heure_depart, t.heure_arrivee_estimee,
              t.prix_base, t.categorie, t.statut, t.retard_minutes, t.prix_bagage_supplementaire,
              t.distribution_nourriture, b.supplement_premium,
              vd.nom_affiche AS ville_depart, va.nom_affiche AS ville_arrivee,
              l.ville_depart AS code_ville_depart, l.ville_arrivee AS code_ville_arrivee,
              t.bus_id, t.chauffeur_id,
              b.nom AS nom_bus, b.disposition, b.type_bus,
              c.prenom || ' ' || c.nom AS chauffeur,
              COALESCE(arrets.villes, ARRAY[]::text[]) AS arrets,
              COALESCE(pointsDetail.points, '[]'::json) AS points_detail,
              COALESCE(prixSections.troncons, '[]'::json) AS prix_sections,
              -- Signalements des voyageurs sur ce trajet : qui, quoi,
              -- quand, et si le seuil collectif est atteint. C'est ce
              -- que l'agence voit dans « informations du trajet ».
              COALESCE(sig.liste, '[]'::json) AS signalements,
              -- Litiges ouverts sur ce trajet : une fausse arrivee au
              -- seuil en ouvre un automatiquement.
              COALESCE(lit.nombre, 0) AS nb_litiges,
              -- Note du trajet et nombre d'avis : l'agence voit d'un
              -- coup d'oeil comment le voyage a ete juge.
              COALESCE(avisTrajet.nombre, 0) AS nb_avis,
              COALESCE(avisTrajet.commentaires, 0) AS nb_commentaires,
              avisTrajet.moyenne AS note_moyenne
       FROM trajets t
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       JOIN bus b ON b.id = t.bus_id
       LEFT JOIN chauffeurs c ON c.id = t.chauffeur_id
       LEFT JOIN LATERAL (
         SELECT ARRAY_AGG(v2.nom_affiche ORDER BY lp2.ordre) AS villes
         FROM ligne_points lp2
         JOIN villes v2 ON v2.code = lp2.ville
         WHERE lp2.ligne_id = t.ligne_id
           AND lp2.ordre > (SELECT MIN(ordre) FROM ligne_points WHERE ligne_id = t.ligne_id)
           AND lp2.ordre < (SELECT MAX(ordre) FROM ligne_points WHERE ligne_id = t.ligne_id)
       ) AS arrets ON true
       LEFT JOIN LATERAL (
         SELECT JSON_AGG(JSON_BUILD_OBJECT('ville', v3.nom_affiche, 'lieu', lp3.lieu_prise_en_charge, 'heure', lp3.heure_arrivee_estimee) ORDER BY lp3.ordre) AS points
         FROM ligne_points lp3
         JOIN villes v3 ON v3.code = lp3.ville
         WHERE lp3.ligne_id = t.ligne_id
       ) AS pointsDetail ON true
       LEFT JOIN LATERAL (
         SELECT JSON_AGG(JSON_BUILD_OBJECT(
                  'depart', vd2.nom_affiche, 'arrivee', va2.nom_affiche, 'prix', ltp.prix
                ) ORDER BY ltp.ordre_depart, ltp.ordre_arrivee) AS troncons
         FROM ligne_troncon_prix ltp
         JOIN ligne_points lpd ON lpd.ligne_id = ltp.ligne_id AND lpd.ordre = ltp.ordre_depart
         JOIN ligne_points lpa ON lpa.ligne_id = ltp.ligne_id AND lpa.ordre = ltp.ordre_arrivee
         JOIN villes vd2 ON vd2.code = lpd.ville
         JOIN villes va2 ON va2.code = lpa.ville
         WHERE ltp.ligne_id = t.ligne_id
       ) AS prixSections ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS nombre FROM litiges lt WHERE lt.trajet_id = t.id
       ) AS lit ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS nombre,
                ROUND(AVG(av.note_globale)::numeric, 1) AS moyenne,
                COUNT(*) FILTER (WHERE av.commentaire IS NOT NULL AND av.commentaire <> '')::int AS commentaires
           FROM avis av
          WHERE av.trajet_id = t.id AND av.statut <> 'supprime'
       ) AS avisTrajet ON true
       LEFT JOIN LATERAL (
         SELECT JSON_AGG(JSON_BUILD_OBJECT(
                  'passager', v4.prenom || ' ' || v4.nom,
                  'categorie', sg.categorie,
                  'commentaire', sg.commentaire,
                  'seuil_atteint', sg.seuil_atteint,
                  'heure', TO_CHAR(sg.cree_le, 'DD/MM HH24:MI')
                ) ORDER BY sg.cree_le DESC) AS liste
         FROM signalements sg
         JOIN voyageurs v4 ON v4.id = sg.voyageur_id
         WHERE sg.trajet_id = t.id
       ) AS sig ON true
       WHERE t.agence_id = $1 ${filtreChauffeur}
       ORDER BY t.date_depart, t.heure_depart`,
      params
    );

    res.json({ trajets: resultat.rows });

  } catch (err) {
    erreurServeur(res, err);
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

    const trajetCheck = await client.query(
      `SELECT id, statut FROM trajets WHERE id = $1 AND agence_id = $2 FOR UPDATE`,
      [trajetId, agenceId]
    );
    if (trajetCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trajet introuvable' });
    }

    const trajet = trajetCheck.rows[0];

    if (trajet.statut === 'termine') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce trajet est déjà déclaré arrivé' });
    }
    if (trajet.statut === 'annule') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce trajet a été annulé' });
    }
    // Arrivée seulement après un départ déclaré par le chauffeur. Sans
    // cette règle, une agence pouvait cliquer « Arrivé » à 6 h pour un
    // départ prévu à 8 h : tous les billets passaient « utilisés » et le
    // versement de l'escrow partait 6 h plus tard.
    if (trajet.statut !== 'en_cours') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Le bus n\'est pas encore parti : le chauffeur doit d\'abord déclarer le départ.' });
    }

    await client.query(
      `UPDATE trajets
       SET statut = 'termine',
           heure_arrivee_reelle = NOW(),
           versement_escrow_le = NOW() + INTERVAL '6 hours',
           mis_a_jour_le = NOW()
       WHERE id = $1`,
      [trajetId]
    );

    const billetsResult = await client.query(
      `UPDATE billets SET statut = 'utilise', mis_a_jour_le = NOW()
       WHERE trajet_id = $1 AND statut = 'confirme'
       RETURNING id`,
      [trajetId]
    );

    const retard = await appliquerBaremeRetard(client, trajetId);

    await client.query('COMMIT');

    res.json({
      message: 'Arrivée déclarée. Le versement à l\'agence interviendra dans 6h sauf signalement.',
      trajet_id: trajetId,
      billets_concernes: billetsResult.rows.length,
      versement_prevu: 'dans 6 heures (sous réserve d\'absence de signalement de fraude)'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    erreurServeur(res, err);
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
    erreurServeur(res, err);
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

    const trajetCheck = await pool.query(
      `SELECT id, statut, TO_CHAR(date_depart, 'YYYY-MM-DD') AS date_depart, heure_depart
       FROM trajets WHERE id = $1 AND agence_id = $2`,
      [trajetId, agenceId]
    );
    if (trajetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trajet introuvable' });
    }
    const trajetInfo = trajetCheck.rows[0];
    if (new Date() > new Date(`${trajetInfo.date_depart}T${trajetInfo.heure_depart}`)) {
      return res.status(400).json({ error: 'L\'heure de départ de ce trajet est déjà passée — le chauffeur ne peut plus être changé.' });
    }

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
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// REMBOURSER TOUS LES BILLETS CONFIRMÉS D'UN TRAJET (100%)
// Partagée par annulerTrajet et supprimerTrajet.
// ═══════════════════════════════════════════════════
async function rembourserBilletsDuTrajet(client, trajetId, motifCode, texteNotification) {
  const billets = await client.query(
    `SELECT id, voyageur_id, prix_total_client FROM billets
     WHERE trajet_id = $1 AND statut = 'confirme'`,
    [trajetId]
  );

  let totalRembourse = 0;
  let nombreRembourses = 0;
  // Billets vendus au guichet : payés en espèces, l'agence rembourse
  // ces clients en espèces. Ils sont comptés à part pour le lui dire.
  let guichet = 0;
  let totalGuichet = 0;
  for (const billet of billets.rows) {
    await client.query(
      `UPDATE billets SET statut = 'annule', mis_a_jour_le = NOW() WHERE id = $1`,
      [billet.id]
    );

    await rendrePointsDepenses(billet.id, client);

    // 100 % à l'acheteur (CDC §16) ; l'agence n'est pas versée et JEGO
    // perd sa commission.
    const remb = await rembourserBillet(billet.id, { motif: motifCode, pourcentage: 100 }, client);
    if (remb.guichet) {
      guichet++;
      totalGuichet += remb.montantGuichet;
      continue;
    }

    totalRembourse += remb.montant;
    nombreRembourses++;

    await creerNotification({
      destinataire_type: 'voyageur',
      destinataire_id: remb.beneficiaire,
      type: 'remboursement',
      titre: 'Remboursement intégral',
      contenu: `${texteNotification} ${remb.montant} FCFA ont été crédités sur votre solde JEGO, utilisable sur votre prochain billet.`,
      canal: 'push'
    });
  }

  // Le chauffeur assigné ne doit pas se présenter pour un trajet qui
  // n'aura pas lieu.
  const trajet = await client.query(
    `SELECT t.chauffeur_id, t.numero, TO_CHAR(t.date_depart, 'DD/MM/YYYY') AS date,
            TO_CHAR(t.heure_depart, 'HH24:MI') AS heure
       FROM trajets t WHERE t.id = $1`,
    [trajetId]
  );
  const t = trajet.rows[0];
  if (t?.chauffeur_id) {
    await creerNotification({
      destinataire_type: 'chauffeur',
      destinataire_id: t.chauffeur_id,
      type: 'trajet_annule',
      titre: 'Trajet annulé',
      contenu: `Le trajet ${t.numero} du ${t.date} à ${t.heure} est annulé par l'agence. Vous n'avez pas à vous présenter.`,
      canal: 'push'
    });
  }

  return { nombre: nombreRembourses, total: totalRembourse, guichet, totalGuichet };
}

// Phrase ajoutée à la réponse de l'agence quand des billets du guichet
// sont annulés : personne d'autre qu'elle ne peut rembourser ces clients.
function avertissementGuichet(guichet, totalGuichet) {
  return guichet > 0
    ? ` ${guichet} billet(s) vendu(s) au guichet : remboursez ces clients en espèces (${totalGuichet} FCFA au total).`
    : '';
}

async function annulerTrajet(req, res) {
  const client = await pool.connect();
  try {
    const agenceId = req.utilisateur.id;
    const trajetId = req.params.id;
    // Le motif d'annulation etait exige puis simplement renvoye dans la
    // reponse : il n'etait ni stocke, ni transmis a personne. Champ
    // retire cote agence, exigence retiree ici.



    await client.query('BEGIN');

    const trajetCheck = await client.query(
      `SELECT id, statut FROM trajets WHERE id = $1 AND agence_id = $2`,
      [trajetId, agenceId]
    );
    if (trajetCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trajet introuvable' });
    }

    const trajet = trajetCheck.rows[0];

    if (trajet.statut === 'termine') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Impossible d\'annuler un trajet déjà terminé' });
    }
    if (trajet.statut === 'annule') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce trajet est déjà annulé' });
    }

    const { nombre, total, guichet, totalGuichet } = await rembourserBilletsDuTrajet(
      client, trajetId, 'annulation_agence',
      "Votre trajet a été annulé par l'agence."
    );

    await client.query(
      `UPDATE trajets SET statut = 'annule', mis_a_jour_le = NOW() WHERE id = $1`,
      [trajetId]
    );

    await client.query(`DELETE FROM soft_locks WHERE trajet_id = $1`, [trajetId]);

    await client.query('COMMIT');

    res.json({
      message: 'Trajet annulé. Les voyageurs sont remboursés à 100 % sur leur solde JEGO.'
        + avertissementGuichet(guichet, totalGuichet),
      billets_rembourses: nombre,
      total_rembourse: total,
      billets_guichet: guichet,
      total_guichet_especes: totalGuichet
    });

  } catch (err) {
    await client.query('ROLLBACK');
    erreurServeur(res, err);
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// DÉCLARER UN RETARD (agence)
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
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// LISTER LES PASSAGERS D'UN TRAJET (agence)
// ═══════════════════════════════════════════════════
async function passagersTrajet(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const trajetId = req.params.id;

    const trajet = await pool.query(
      `SELECT t.id, t.date_depart, t.heure_depart, t.statut,
              t.numero,
              vd.nom_affiche AS depart, va.nom_affiche AS arrivee,
              b.nom AS nom_bus,
              (SELECT COUNT(*) FROM sieges s WHERE s.bus_id = b.id AND s.statut = 'disponible') AS capacite
       FROM trajets t
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       JOIN bus b ON b.id = t.bus_id
       WHERE t.id = $1 AND t.agence_id = $2`,
      [trajetId, req.utilisateur.id]
    );
    if (trajet.rows.length === 0) {
      return res.status(404).json({ error: 'Trajet introuvable dans votre agence' });
    }

    const passagers = await pool.query(
      `SELECT b.id, b.numero, b.statut, b.source_vente, b.qr_scanne,
              b.prix_total_client, b.supplement_bagage, b.quantite_bagages, b.est_flexible,
              b.point_embarquement_ordre, b.point_debarquement_ordre,
              s.numero AS siege,
              v.nom, v.prenom, v.telephone, v.email,
              pe.ville AS ville_embarquement, pd.ville AS ville_debarquement
       FROM billets b
       JOIN sieges s ON s.id = b.siege_id
       JOIN voyageurs v ON v.id = b.voyageur_id
       JOIN trajets t ON t.id = b.trajet_id
       LEFT JOIN ligne_points pe ON pe.ligne_id = t.ligne_id AND pe.ordre = b.point_embarquement_ordre
       LEFT JOIN ligne_points pd ON pd.ligne_id = t.ligne_id AND pd.ordre = b.point_debarquement_ordre
       WHERE b.trajet_id = $1 AND b.statut IN ('confirme', 'utilise')
       ORDER BY s.numero`,
      [trajetId]
    );

    res.json({
      trajet: trajet.rows[0],
      nombre_passagers: passagers.rows.length,
      passagers: passagers.rows
    });

  } catch (err) {
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// VERSEMENTS REÇUS PAR L'AGENCE (escrow)
// ═══════════════════════════════════════════════════
async function versementsAgence(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const agenceId = req.utilisateur.id;

    const resume = await pool.query(
      `SELECT
         COALESCE(SUM(e.montant_agence) FILTER (WHERE e.statut = 'verse'), 0)     AS deja_verse,
         COALESCE(SUM(e.montant_agence) FILTER (WHERE e.statut = 'retenu'), 0)    AS en_attente,
         COALESCE(SUM(e.montant_agence) FILTER (WHERE e.statut = 'rembourse'), 0) AS rembourse,
         COALESCE(SUM(e.montant_jego), 0)                                         AS commission_jego,
         COUNT(*)                                                                 AS nombre_billets
       FROM escrow e
       JOIN billets b ON b.id = e.billet_id
       WHERE b.agence_id = $1`,
      [agenceId]
    );

    // Regroupement par JOUR DE VENTE, pas par date de départ. Un billet
    // vendu au guichet aujourd'hui pour un voyage dans trois jours est un
    // encaissement d'aujourd'hui : le chercher à la date du voyage
    // faisait apparaître la journée en cours comme vide.
    //
    // Un même trajet vendu sur plusieurs jours donne donc plusieurs
    // lignes, une par journée de vente.
    const parVente = await pool.query(
      `SELECT t.id AS trajet_id,
              t.numero,
              TO_CHAR(b.cree_le, 'YYYY-MM-DD')   AS date_vente,
              TO_CHAR(t.date_depart, 'YYYY-MM-DD') AS date_depart,
              t.heure_depart,
              t.versement_escrow_le,
              vd.nom_affiche AS depart, va.nom_affiche AS arrivee,
              COUNT(e.id) AS nombre_billets,
              COALESCE(SUM(e.montant_agence), 0) AS montant_agence,
              COALESCE(SUM(e.montant_jego), 0)   AS commission_jego,
              COALESCE(SUM(e.frais_momo), 0)     AS frais_momo,
              BOOL_AND(e.statut = 'verse')       AS entierement_verse,
              MAX(e.verse_le)                    AS verse_le
       FROM escrow e
       JOIN billets b ON b.id = e.billet_id
       JOIN trajets t ON t.id = b.trajet_id
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       WHERE b.agence_id = $1
       GROUP BY t.id, t.numero, TO_CHAR(b.cree_le, 'YYYY-MM-DD'),
                t.date_depart, t.heure_depart,
                t.versement_escrow_le, vd.nom_affiche, va.nom_affiche
       ORDER BY date_vente DESC, t.heure_depart DESC
       LIMIT 200`,
      [agenceId]
    );

    res.json({ resume: resume.rows[0], versements: parVente.rows });

  } catch (err) {
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// SUPPRIMER UN TRAJET
// Bloqué si déjà débuté (en_cours), déjà terminé, ou déjà annulé.
// Sans billet réel : suppression SQL réelle, rien à préserver.
// Avec billets réels : remboursement 100% + notification de chaque
// voyageur, puis le trajet est marqué "annulé" plutôt que réellement
// supprimé — l'historique financier doit être conservé pour l'audit et
// les litiges éventuels. Il disparaît de la liste active côté agence.
// ═══════════════════════════════════════════════════
async function supprimerTrajet(req, res) {
  const client = await pool.connect();
  try {
    const agenceId = req.utilisateur.id;
    const trajetId = req.params.id;

    await client.query('BEGIN');
    const trajetCheck = await client.query(
      `SELECT id, statut, TO_CHAR(date_depart, 'YYYY-MM-DD') AS date_depart, heure_depart FROM trajets WHERE id = $1 AND agence_id = $2`,
      [trajetId, agenceId]
    );
    if (trajetCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trajet introuvable' });
    }
    const trajet = trajetCheck.rows[0];

    if (trajet.statut === 'en_cours') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce trajet est en cours — impossible de le supprimer. Utilise "Arrêter le trajet" si besoin.' });
    }
    if (trajet.statut === 'termine') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce trajet est déjà terminé — suppression impossible, l\'historique est conservé.' });
    }
    if (new Date() > new Date(`${trajet.date_depart}T${trajet.heure_depart}`)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'L\'heure de départ de ce trajet est déjà passée — suppression impossible.' });
    }
    if (trajet.statut === 'annule') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce trajet est déjà annulé.' });
    }
    if (trajet.statut === 'supprime') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce trajet est déjà supprimé.' });
    }

    const { nombre, total, guichet, totalGuichet } = await rembourserBilletsDuTrajet(
      client, trajetId, 'annulation_agence',
      "Votre trajet a été supprimé par l'agence."
    );

    // Toujours un soft-delete : le trajet reste visible (grisé) plutôt
    // que de disparaître, qu'il y ait eu des billets ou non.
    await client.query(
      `UPDATE trajets SET statut = 'supprime', mis_a_jour_le = NOW() WHERE id = $1`,
      [trajetId]
    );
    await client.query(`DELETE FROM soft_locks WHERE trajet_id = $1`, [trajetId]);
    await client.query('COMMIT');

    res.json({
      message: (nombre > 0
        ? `Trajet supprimé. ${nombre} voyageur(s) remboursé(s) à 100 % sur leur solde JEGO (${total} FCFA au total) et notifié(s).`
        : 'Trajet supprimé.') + avertissementGuichet(guichet, totalGuichet),
      billets_rembourses: nombre,
      total_rembourse: total,
      billets_guichet: guichet,
      total_guichet_especes: totalGuichet
    });

  } catch (err) {
    await client.query('ROLLBACK');
    erreurServeur(res, err);
  } finally {
    client.release();
  }
}

module.exports = { creerTrajet, listerTrajets, declarerArrivee, verserEscrow, assignerChauffeur, annulerTrajet, declarerRetard, passagersTrajet, versementsAgence, supprimerTrajet };
