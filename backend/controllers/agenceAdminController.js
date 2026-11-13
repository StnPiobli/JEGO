const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/database');
const { typeDepuisNom } = require('../utils/fichierSur');
const { creerNotification } = require('../services/notificationService');
const { rembourserBillet } = require('../services/portefeuilleService');
const { rendrePointsDepenses } = require('../services/pointsService');
const { journaliser } = require('../services/logService');
const { erreurServeur } = require('../utils/erreurServeur');

const DOSSIER_UPLOADS = path.join(__dirname, '..', 'uploads', 'agences');

// Types acceptés : documents administratifs uniquement. Pas d'exécutable,
// pas d'archive — un fichier téléversé par un tiers ne doit jamais pouvoir
// être exécuté côté serveur.
const TYPES_MIME_AUTORISES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const TAILLE_MAX_OCTETS = 8 * 1024 * 1024; // 8 Mo

// ═══════════════════════════════════════════════════
// LISTER LES AGENCES PAR STATUT, AVEC L'ÉTAT DE LEUR PROGRAMME
// "à jour" = programme publié couvrant au moins les 14 prochains jours,
// même critère que la carte de Billets & trajets.
// ═══════════════════════════════════════════════════
async function listerAgencesAdmin(req, res) {
  try {
    const { statut } = req.query;
    const params = [];
    let filtre = '';
    if (statut) {
      params.push(statut);
      filtre = 'WHERE a.statut = $1';
    }

    // Seuil d'alerte configurable (ecran Reglages). Il etait ecrit en dur
    // a 14 jours ici : une agence pouvait etre signalee « pas a jour »
    // alors que le seuil regle valait tout autre chose.
    const p = await pool.query(
      `SELECT valeur FROM parametres_systeme WHERE cle = 'programmation_seuil_alerte_jours'`
    );
    const seuilAlerte = Number.isInteger(parseInt(p.rows[0]?.valeur))
      ? parseInt(p.rows[0].valeur)
      : 14;
    params.push(seuilAlerte);
    const positionSeuil = params.length;

    const resultat = await pool.query(
      `SELECT a.id, a.numero, a.nom, a.email, a.telephone, a.adresse, a.ville,
              a.registre_commerce, a.statut, a.cree_le,
              a.desactivee_le, a.motif_desactivation, a.refuse_le,
              TO_CHAR(COALESCE(a.refuse_le, a.desactivee_le), 'DD/MM/YYYY') AS date_fin,
              MAX(t.date_depart) AS dernier_trajet,
              (MAX(t.date_depart) >= CURRENT_DATE + ($${positionSeuil} || ' days')::interval) AS a_jour,
              $${positionSeuil}::int AS seuil_alerte_jours,
              (SELECT COUNT(*) FROM documents_agence d WHERE d.agence_id = a.id) AS nb_documents,
              (SELECT COUNT(*) FROM demandes_pieces dp
                WHERE dp.agence_id = a.id AND dp.statut = 'ouverte') AS demandes_ouvertes
       FROM agences a
       LEFT JOIN trajets t ON t.agence_id = a.id AND t.statut != 'annule'
       ${filtre}
       GROUP BY a.id
       ORDER BY a.nom ASC`,
      params
    );

    res.json({ nombre: resultat.rows.length, agences: resultat.rows });

  } catch (err) {
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// DOCUMENTS D'UNE AGENCE (admin)
// ═══════════════════════════════════════════════════
async function documentsAgence(req, res) {
  try {
    const resultat = await pool.query(
      `SELECT id, type_document, nom_fichier, taille_octets, type_mime,
              statut, televerse_le, verifie_le
       FROM documents_agence
       WHERE agence_id = $1
       ORDER BY televerse_le DESC`,
      [req.params.id]
    );
    res.json({ documents: resultat.rows });
  } catch (err) {
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// TÉLÉCHARGER UN DOCUMENT
// Le nom réel du fichier sur le disque est aléatoire et n'est jamais
// exposé : on passe par l'id du document, et le chemin est reconstruit
// côté serveur pour empêcher toute remontée d'arborescence.
// ═══════════════════════════════════════════════════
async function telechargerDocument(req, res) {
  try {
    const doc = await pool.query(
      `SELECT nom_fichier, fichier_stocke, type_mime FROM documents_agence WHERE id = $1`,
      [req.params.docId]
    );
    if (doc.rows.length === 0) {
      return res.status(404).json({ error: 'Document introuvable' });
    }

    const { nom_fichier, fichier_stocke, type_mime } = doc.rows[0];
    const chemin = path.join(DOSSIER_UPLOADS, path.basename(fichier_stocke));

    if (!fs.existsSync(chemin)) {
      return res.status(404).json({ error: 'Fichier absent du serveur' });
    }

    // Type déduit du nom stocké (extension choisie par le serveur), pas
    // de ce que le navigateur avait annoncé à l'envoi.
    res.setHeader('Content-Type', typeDepuisNom(fichier_stocke) || type_mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(nom_fichier)}"`);
    fs.createReadStream(chemin).pipe(res);

  } catch (err) {
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// MARQUER UN DOCUMENT VÉRIFIÉ / REFUSÉ (admin)
// ═══════════════════════════════════════════════════
async function statuerDocument(req, res) {
  try {
    const { statut } = req.body;
    if (!['verifie', 'refuse', 'en_attente'].includes(statut)) {
      return res.status(400).json({ error: "Statut invalide : 'verifie', 'refuse' ou 'en_attente'" });
    }
    const resultat = await pool.query(
      `UPDATE documents_agence
       SET statut = $1, verifie_par = $2, verifie_le = NOW()
       WHERE id = $3 RETURNING id, statut`,
      [statut, req.utilisateur.id, req.params.docId]
    );
    if (resultat.rows.length === 0) {
      return res.status(404).json({ error: 'Document introuvable' });
    }
    res.json({ message: 'Document mis à jour', document: resultat.rows[0] });
  } catch (err) {
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// DEMANDER DES PIÈCES À UNE AGENCE
// Crée la demande, notifie par email ET dans l'espace agence.
// ═══════════════════════════════════════════════════
async function demanderPieces(req, res) {
  try {
    const { pieces } = req.body;
    const agenceId = req.params.id;

    if (!pieces || pieces.trim().length === 0) {
      return res.status(400).json({ error: 'Précise les pièces demandées' });
    }

    const agence = await pool.query(`SELECT id, nom FROM agences WHERE id = $1`, [agenceId]);
    if (agence.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    const demande = await pool.query(
      `INSERT INTO demandes_pieces (agence_id, pieces, demande_par)
       VALUES ($1, $2, $3) RETURNING id, pieces, statut, cree_le`,
      [agenceId, pieces.trim(), req.utilisateur.id]
    );

    await creerNotification({
      destinataire_type: 'agence',
      destinataire_id: agenceId,
      type: 'demande_pieces',
      titre: 'JEGO vous demande des documents',
      contenu: `Merci de téléverser depuis votre espace : ${pieces.trim()}`,
      canal: 'email'
    });

    res.status(201).json({ message: 'Demande envoyée', demande: demande.rows[0] });

  } catch (err) {
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// DEMANDES DE PIÈCES D'UNE AGENCE
// ═══════════════════════════════════════════════════
async function listerDemandesPieces(req, res) {
  try {
    const resultat = await pool.query(
      `SELECT id, pieces, statut, cree_le, close_le
       FROM demandes_pieces WHERE agence_id = $1 ORDER BY cree_le DESC`,
      [req.params.id]
    );
    res.json({ demandes: resultat.rows });
  } catch (err) {
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// CLORE UNE DEMANDE DE PIÈCES
// ═══════════════════════════════════════════════════
async function cloreDemandePieces(req, res) {
  try {
    const resultat = await pool.query(
      `UPDATE demandes_pieces SET statut = 'close', close_le = NOW()
       WHERE id = $1 AND statut = 'ouverte' RETURNING id`,
      [req.params.demandeId]
    );
    if (resultat.rows.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable ou déjà close' });
    }
    res.json({ message: 'Demande close' });
  } catch (err) {
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// ENVOYER UN MESSAGE À UNE AGENCE
// ═══════════════════════════════════════════════════
async function envoyerMessageAgence(req, res) {
  try {
    const { texte } = req.body;
    if (!texte || texte.trim().length === 0) {
      return res.status(400).json({ error: 'Le message est vide' });
    }

    const agence = await pool.query(`SELECT id, nom FROM agences WHERE id = $1`, [req.params.id]);
    if (agence.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    await creerNotification({
      destinataire_type: 'agence',
      destinataire_id: req.params.id,
      type: 'message_admin',
      titre: 'Message de JEGO',
      contenu: texte.trim(),
      canal: 'email'
    });

    res.json({ message: 'Message envoyé' });

  } catch (err) {
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// RAPPEL DE PROGRAMMATION
// Prévient l'agence, par mail et dans son espace, que son programme ne
// couvre pas les 2 prochaines semaines.
// ═══════════════════════════════════════════════════
async function rappelProgrammation(req, res) {
  try {
    const agence = await pool.query(
      `SELECT a.id, a.nom, MAX(t.date_depart) AS dernier
       FROM agences a
       LEFT JOIN trajets t ON t.agence_id = a.id AND t.statut != 'annule'
       WHERE a.id = $1 GROUP BY a.id, a.nom`,
      [req.params.id]
    );
    if (agence.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    const dernier = agence.rows[0].dernier;
    const texte = dernier
      ? `Votre programme s'arrête au ${new Date(dernier).toLocaleDateString('fr-FR')}. Il doit couvrir au moins les 2 prochaines semaines.`
      : `Aucun trajet n'est publié sur votre espace. Votre programme doit couvrir au moins les 2 prochaines semaines.`;

    await creerNotification({
      destinataire_type: 'agence',
      destinataire_id: req.params.id,
      type: 'rappel_programmation',
      titre: 'Votre programme doit être mis à jour',
      contenu: texte,
      canal: 'email'
    });

    res.json({ message: `Rappel envoyé à ${agence.rows[0].nom}` });

  } catch (err) {
    erreurServeur(res, err);
  }
}

// ═══════════════════════════════════════════════════
// DÉSACTIVER UNE AGENCE
//
// Règles décidées avec Stéphane :
//   - trajet PAS ENCORE EFFECTUÉ  -> remboursement intégral du client,
//     frais JEGO compris, et l'escrow correspondant passe en 'rembourse'
//   - trajet DÉJÀ EFFECTUÉ         -> l'agence a fait son travail, elle
//     garde son argent, l'escrow suit son cours normal
//   - trajet EN COURS              -> traité comme effectué : le passager
//     est dans le bus, le rembourser n'aurait pas de sens
//
// Les trajets restent en base mais disparaissent de l'app voyageur, qui
// filtre déjà sur agences.statut = 'actif'.
// ═══════════════════════════════════════════════════
async function desactiverAgence(req, res) {
  const client = await pool.connect();
  try {
    const agenceId = req.params.id;
    const { motif } = req.body;

    await client.query('BEGIN');

    const agence = await client.query(
      `SELECT id, nom, statut FROM agences WHERE id = $1 FOR UPDATE`,
      [agenceId]
    );
    if (agence.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Agence introuvable' });
    }
    if (agence.rows[0].statut === 'suspendu') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cette agence est déjà désactivée' });
    }

    await client.query(
      `UPDATE agences
       SET statut = 'suspendu', desactivee_le = NOW(),
           motif_desactivation = $1, desactivee_par = $2, mis_a_jour_le = NOW()
       WHERE id = $3`,
      [motif || null, req.utilisateur.id, agenceId]
    );

    // Billets à rembourser : uniquement ceux dont le trajet n'a pas encore
    // commencé. Un trajet 'en_cours' ou 'termine' a été honoré.
    const aRembourser = await client.query(
      `SELECT b.id, b.numero, b.voyageur_id, b.prix_total_client, e.id AS escrow_id
       FROM billets b
       JOIN trajets t ON t.id = b.trajet_id
       LEFT JOIN escrow e ON e.billet_id = b.id
       WHERE b.agence_id = $1
         AND b.statut = 'confirme'
         AND t.statut = 'programme'`,
      [agenceId]
    );

    let totalRembourse = 0;
    let totalGuichet = 0;
    for (const billet of aRembourser.rows) {
      await rendrePointsDepenses(billet.id, client);
      // 100 % sur le solde JEGO de l'acheteur ; un billet du guichet a
      // été payé en espèces et se rembourse en espèces.
      const remb = await rembourserBillet(billet.id, { motif: 'agence_desactivee', pourcentage: 100 }, client);
      billet.beneficiaire = remb.beneficiaire;
      billet.montantRembourse = remb.montant;
      if (remb.guichet) totalGuichet += remb.montantGuichet;
      else totalRembourse += remb.montant;

      await client.query(
        `UPDATE billets SET statut = 'annule', mis_a_jour_le = NOW() WHERE id = $1`,
        [billet.id]
      );
    }

    // Les trajets à venir sont annulés : ils restent en base pour l'historique
    // mais ne peuvent plus être ni vendus ni honorés.
    const trajetsAnnules = await client.query(
      `UPDATE trajets SET statut = 'annule', mis_a_jour_le = NOW()
       WHERE agence_id = $1 AND statut = 'programme' RETURNING id`,
      [agenceId]
    );

    await client.query('COMMIT');

    await journaliser({
      acteurType: 'membre_admin', acteurId: req.utilisateur.id,
      action: 'desactivation_agence',
      details: { agence_id: agenceId, nom: agence.rows[0].nom, motif, billets_rembourses: aRembourser.rows.length },
      ipAddress: req.ip, estUrgence: true,
    });

    // Notifications hors transaction : un échec d'envoi ne doit pas
    // annuler une désactivation déjà décidée.
    await creerNotification({
      destinataire_type: 'agence',
      destinataire_id: agenceId,
      type: 'compte_desactive',
      titre: 'Votre compte JEGO a été désactivé',
      contenu: motif
        ? `Votre compte a été désactivé par JEGO. Motif : ${motif}`
        : 'Votre compte a été désactivé par JEGO.',
      canal: 'email'
    });

    for (const billet of aRembourser.rows) {
      await creerNotification({
        destinataire_type: 'voyageur',
        destinataire_id: billet.beneficiaire || billet.voyageur_id,
        type: 'remboursement',
        titre: 'Votre trajet a été annulé',
        contenu: billet.beneficiaire
          ? `L'agence n'est plus active sur JEGO. Votre billet ${billet.numero} est intégralement remboursé : ${billet.montantRembourse} FCFA crédités sur votre solde JEGO, utilisable sur votre prochain billet.`
          : `L'agence n'est plus active sur JEGO. Votre billet ${billet.numero}, acheté au guichet, est annulé : son remboursement en espèces (${billet.prix_total_client} FCFA) se fait auprès de l'agence.`,
        canal: 'email'
      });
    }

    res.json({
      message: `${agence.rows[0].nom} désactivée`,
      billets_rembourses: aRembourser.rows.length,
      montant_rembourse: totalRembourse,
      montant_guichet_especes: totalGuichet,
      trajets_annules: trajetsAnnules.rows.length,
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    erreurServeur(res, err);
  } finally {
    client.release();
  }
}

module.exports = {
  listerAgencesAdmin, documentsAgence, telechargerDocument, statuerDocument,
  demanderPieces, listerDemandesPieces, cloreDemandePieces,
  envoyerMessageAgence, rappelProgrammation, desactiverAgence,
  DOSSIER_UPLOADS, TYPES_MIME_AUTORISES, TAILLE_MAX_OCTETS,
};
