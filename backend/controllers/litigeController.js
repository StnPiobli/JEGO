const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const { lireMultipart } = require('../utils/multipart');
const { creerNotification } = require('../services/notificationService');
const { journaliser } = require('../services/logService');
const { genererIdentifiant } = require('../utils/identifiant');
const { lireParametreEntier } = require('../services/parametreService');

const DOSSIER_PIECES = path.join(__dirname, '..', 'uploads', 'litiges');
const TYPES_MIME_AUTORISES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const TAILLE_MAX_OCTETS = 8 * 1024 * 1024; // 8 Mo

// ═══════════════════════════════════════════════════
// PIECES JOINTES D'UN LITIGE (agence)
//
// L'agence accusee doit pouvoir prouver sa version : documents et
// liens s'ajoutent a sa reponse ecrite, et restent consultables par
// l'admin avant comme apres sa decision. On accepte un fichier par
// appel (comme la messagerie agence-admin) ou un lien.
// ═══════════════════════════════════════════════════
async function ajouterPieceLitige(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const litigeId = req.params.id;
    const check = await pool.query(
      `SELECT id FROM litiges WHERE id = $1 AND agence_id = $2`,
      [litigeId, req.utilisateur.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Litige introuvable' });
    }

    const typeContenu = req.headers['content-type'] || '';

    // Cas 1 : un lien, envoye en JSON.
    if (!typeContenu.startsWith('multipart/form-data')) {
      const lien = (req.body?.lien || '').trim();
      if (!/^https?:\/\/\S+$/i.test(lien)) {
        return res.status(400).json({ error: 'Lien invalide (il doit commencer par http:// ou https://)' });
      }
      const nom = (req.body?.nom || '').trim() || lien;
      const ligne = await pool.query(
        `INSERT INTO pieces_litige (litige_id, auteur_type, genre, nom, url)
         VALUES ($1, 'agence', 'lien', $2, $3)
         RETURNING id, genre, nom, url, type, to_char(cree_le, 'DD/MM/YYYY HH24:MI') AS ajoute_le`,
        [litigeId, nom.slice(0, 255), lien]
      );
      return res.status(201).json({ piece: ligne.rows[0] });
    }

    // Cas 2 : un fichier.
    let resultat;
    try {
      resultat = await lireMultipart(req, TAILLE_MAX_OCTETS);
    } catch (err) {
      if (err.message === 'TAILLE_DEPASSEE') {
        return res.status(413).json({ error: 'Fichier trop lourd (8 Mo maximum)' });
      }
      throw err;
    }
    const fichier = resultat.fichier;
    if (!fichier || !fichier.donnees || fichier.donnees.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }
    if (!TYPES_MIME_AUTORISES.includes(fichier.type)) {
      return res.status(400).json({ error: 'Format non accepté. Envoie un PDF ou une image (JPEG, PNG, WebP).' });
    }
    fs.mkdirSync(DOSSIER_PIECES, { recursive: true });
    const nomSurDisque = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${fichier.nom.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    fs.writeFileSync(path.join(DOSSIER_PIECES, nomSurDisque), fichier.donnees);

    const ligne = await pool.query(
      `INSERT INTO pieces_litige (litige_id, auteur_type, genre, nom, url, type)
       VALUES ($1, 'agence', 'fichier', $2, $3, $4)
       RETURNING id, genre, nom, url, type, to_char(cree_le, 'DD/MM/YYYY HH24:MI') AS ajoute_le`,
      [litigeId, fichier.nom.slice(0, 255), `/uploads/litiges/${nomSurDisque}`, fichier.type]
    );
    res.status(201).json({ piece: ligne.rows[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Pieces d'un litige, lisibles par l'agence concernee et par l'admin.
async function piecesLitige(req, res) {
  try {
    const litigeId = req.params.id;
    const { id, type } = req.utilisateur;
    if (type === 'agence') {
      const check = await pool.query(
        `SELECT id FROM litiges WHERE id = $1 AND agence_id = $2`, [litigeId, id]
      );
      if (check.rows.length === 0) return res.status(404).json({ error: 'Litige introuvable' });
    } else if (type !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    const r = await pool.query(
      `SELECT id, auteur_type, genre, nom, url, type,
              to_char(cree_le, 'DD/MM/YYYY HH24:MI') AS ajoute_le
         FROM pieces_litige WHERE litige_id = $1 ORDER BY cree_le ASC`,
      [litigeId]
    );
    res.json({ pieces: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

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

    // Un client n'ouvre qu'UN litige par trajet : sans cela, le meme
    // voyage pourrait etre conteste autant de fois qu'il a de billets,
    // et l'agence devrait repondre plusieurs fois au meme reproche.
    const dejaOuvert = await pool.query(
      `SELECT numero FROM litiges
        WHERE trajet_id = $1 AND voyageur_id = $2`,
      [b.trajet_id, voyageurId]
    );
    if (dejaOuvert.rows.length > 0) {
      return res.status(409).json({
        error: `Vous avez déjà ouvert un litige sur ce trajet (${dejaOuvert.rows[0].numero}).`,
      });
    }

    const numero = genererIdentifiant('LIT');

    // Delai de reponse configurable par l'admin (parametres_systeme).
    const delaiHeures = await lireParametreEntier('delai_reponse_agence_heures', 48);

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
      contenu: `Un client a ouvert un litige (${motif}). Vous avez ${delaiHeures}h pour répondre.`,
      canal: 'email'
    });

    res.status(201).json({
      message: `Litige ouvert. L'agence a ${delaiHeures}h pour répondre.`,
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
      `SELECT id, billet_id, trajet_id, voyageur_id, agence_id, statut, collectif FROM litiges WHERE id = $1 FOR UPDATE`,
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

    // Litige COLLECTIF (fausse arrivee au seuil) : la decision vaut pour
    // tous ceux qui ont denonce. Rembourser le seul billet porteur
    // laisserait les autres victimes sans rien, alors que le seuil
    // suppose justement plusieurs voyageurs.
    if (l.collectif && l.trajet_id) {
      const billets = await client.query(
        `SELECT e.id, e.montant_total, e.montant_agence, b.id AS billet_id, b.voyageur_id
           FROM signalements s
           JOIN billets b ON b.trajet_id = s.trajet_id
                         AND b.voyageur_id = s.voyageur_id
                         AND b.statut IN ('confirme','utilise')
           JOIN escrow e ON e.billet_id = b.id
          WHERE s.trajet_id = $1 AND s.categorie = 'fausse_arrivee'
            AND e.statut = 'retenu'
          FOR UPDATE OF e`,
        [l.trajet_id]
      );
      const lignes = billets.rows;

      for (const e of lignes) {
        if (gagnant === 'agence') {
          await client.query(
            `UPDATE escrow SET statut = 'verse', verse_le = NOW() WHERE id = $1`, [e.id]
          );
          montantMouvemente += e.montant_agence;
        } else {
          await client.query(
            `UPDATE escrow SET statut = 'rembourse' WHERE id = $1`, [e.id]
          );
          await client.query(
            `INSERT INTO remboursements
              (billet_id, voyageur_id, montant, motif, pourcentage, statut, reference, traite_le)
             VALUES ($1, $2, $3, 'litige', 100, 'traite', $4, NOW())`,
            [e.billet_id, e.voyageur_id, e.montant_total, genererIdentifiant('RMB')]
          );
          montantMouvemente += e.montant_total;
        }
      }
    } else if (l.billet_id) {
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
            [l.billet_id, l.voyageur_id, e.montant_total, genererIdentifiant('RMB')]
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

    // Le gagnant apprend seulement qu'il a gagne. La raison ecrite par
    // l'admin s'adresse au perdant : elle explique un refus, elle n'a
    // rien a faire chez celui qui a obtenu gain de cause.
    await creerNotification({
      destinataire_type: 'voyageur', destinataire_id: l.voyageur_id,
      type: 'litige_decision',
      titre: gagnant === 'voyageur'
        ? 'Litige tranché en votre faveur'
        : 'Litige perdu',
      contenu: gagnant === 'voyageur'
        ? `JEGO a tranché en votre faveur. Remboursement de ${montantMouvemente} FCFA traité.`
        : decision,
      canal: 'email'
    });
    await creerNotification({
      destinataire_type: 'agence', destinataire_id: l.agence_id,
      type: 'litige_decision',
      titre: gagnant === 'agence'
        ? 'Litige tranché en votre faveur'
        : 'Litige perdu',
      contenu: gagnant === 'agence'
        ? `JEGO a tranché en votre faveur. Versement de ${montantMouvemente} FCFA effectué.`
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

    // Un litige collectif (fausse arrivee au seuil) concerne tous ceux
    // qui ont denonce, pas seulement celui dont le billet le porte :
    // le seuil suppose plusieurs voyageurs, les cacher serait injuste.
    // L'heure de réponse de l'agence ne concerne que l'agence (et
    // l'admin, servi par une autre route) : le voyageur n'a pas à savoir
    // à quelle minute son adversaire a répondu.
    const colonnesHeures = type === 'agence'
      ? `to_char(l.reponse_agence_le, 'DD/MM/YYYY') AS date_reponse,
              to_char(l.reponse_agence_le, 'HH24:MI') AS heure_reponse,`
      : '';

    const filtre = type === 'voyageur'
      ? `(l.voyageur_id = $1 OR (l.collectif = true AND EXISTS (
             SELECT 1 FROM signalements sg
              WHERE sg.trajet_id = l.trajet_id
                AND sg.voyageur_id = $1
                AND sg.categorie = 'fausse_arrivee')))`
      : `l.${colonne} = $1`;

    const resultat = await pool.query(
      `SELECT l.id, l.numero, l.motif, l.description, l.statut, l.niveau,
              l.reponse_agence, l.decision, l.gagnant, l.cree_le, l.escalade_le,
              l.decide_le,
              l.collectif, l.trajet_id,
              ${colonnesHeures}
              -- Litige collectif : le dossier ne porte pas une personne
              -- mais tous les denonciateurs. On renvoie leur nombre pour
              -- que les interfaces affichent « 3 clients » et non un nom.
              CASE WHEN l.collectif THEN (
                SELECT COUNT(DISTINCT sg.voyageur_id) FROM signalements sg
                 WHERE sg.trajet_id = l.trajet_id AND sg.categorie = 'fausse_arrivee'
              ) ELSE 1 END AS nb_clients,
              -- Et leurs noms, pour la liste des plaignants.
              CASE WHEN l.collectif THEN (
                SELECT JSON_AGG(x) FROM (
                  SELECT DISTINCT vv.prenom || ' ' || vv.nom AS nom,
                         vv.telephone, vv.email,
                         -- Les denonciateurs ne descendent pas tous au
                         -- meme endroit : chacun garde son troncon.
                         cvm.nom_affiche || ' → ' || cvd.nom_affiche AS troncon
                    FROM signalements sg
                    JOIN voyageurs vv ON vv.id = sg.voyageur_id
                    -- Un seul billet par plaignant : sur une reservation
                    -- de groupe le meme voyageur en porte plusieurs, et
                    -- il apparaitrait autant de fois dans la liste que
                    -- de billets — le compteur « N clients » ne colle
                    -- alors plus aux noms affiches.
                    LEFT JOIN LATERAL (
                      SELECT cbb.point_embarquement_ordre,
                             cbb.point_debarquement_ordre
                        FROM billets cbb
                       WHERE cbb.trajet_id = sg.trajet_id
                         AND cbb.voyageur_id = sg.voyageur_id
                         AND cbb.statut IN ('confirme', 'utilise')
                       ORDER BY cbb.point_embarquement_ordre ASC
                       LIMIT 1
                    ) cb ON true
                    LEFT JOIN ligne_points clm
                      ON clm.ligne_id = t.ligne_id AND clm.ordre = COALESCE(cb.point_embarquement_ordre, 0)
                    LEFT JOIN ligne_points cld
                      ON cld.ligne_id = t.ligne_id AND cld.ordre = cb.point_debarquement_ordre
                    LEFT JOIN villes cvm ON cvm.code = clm.ville
                    LEFT JOIN villes cvd ON cvd.code = cld.ville
                   WHERE sg.trajet_id = l.trajet_id
                     AND sg.categorie = 'fausse_arrivee'
                ) AS x
              ) ELSE NULL END AS clients,
              -- Dates formatees cote SQL (tz-safe) : le trajet concerne et
              -- le moment ou le litige a ete ouvert.
              to_char(t.date_depart, 'DD/MM/YYYY') AS date_trajet,
              to_char(t.heure_depart, 'HH24:MI') AS heure_trajet,
              to_char(l.cree_le, 'DD/MM/YYYY') AS date_ouverture,
              to_char(l.cree_le, 'HH24:MI') AS heure_ouverture,
              -- Date de la decision JEGO : sert a classer les dossiers
              -- tranches du plus recemment decide au plus ancien.
              to_char(l.decide_le, 'DD/MM/YYYY') AS date_decision,
              to_char(l.decide_le, 'HH24:MI') AS heure_decision,
              v.prenom || ' ' || v.nom AS client,
              -- Un litige collectif ne porte que le billet du premier
              -- denonciateur : afficher SON troncon pour tout le monde
              -- serait faux, on garde alors la ligne entiere et chaque
              -- plaignant montre son propre troncon dans la liste.
              CASE
                WHEN NOT COALESCE(l.collectif, false)
                     AND vm.nom_affiche IS NOT NULL AND vdd.nom_affiche IS NOT NULL
                  THEN vm.nom_affiche || ' → ' || vdd.nom_affiche
                WHEN vd.nom_affiche IS NOT NULL
                  THEN vd.nom_affiche || ' → ' || va.nom_affiche
                ELSE NULL END AS trajet,
              -- La ligne complete reste disponible pour situer le
              -- troncon dans le voyage, sans le remplacer.
              CASE WHEN vd.nom_affiche IS NOT NULL
                THEN vd.nom_affiche || ' → ' || va.nom_affiche
                ELSE NULL END AS ligne_complete,
              b.prix_total_client AS montant,
              t.numero AS numero_voyage,
              -- Pieces fournies par l'agence : consultables des qu'elles
              -- existent, avant comme apres la decision.
              COALESCE(p.liste, '[]'::json) AS pieces
       FROM litiges l
       LEFT JOIN voyageurs v ON v.id = l.voyageur_id
       LEFT JOIN trajets t ON t.id = l.trajet_id
       LEFT JOIN lignes li ON li.id = t.ligne_id
       LEFT JOIN villes vd ON vd.code = li.ville_depart
       LEFT JOIN villes va ON va.code = li.ville_arrivee
       LEFT JOIN billets b ON b.id = l.billet_id
       -- Troncon reellement achete par le plaignant. Sur une ligne
       -- Douala -> Bafoussam -> Yaounde, le client descendu a Bafoussam
       -- n'a pas voyage jusqu'a Yaounde : son litige ne doit pas
       -- s'annoncer « Douala -> Yaounde ».
       LEFT JOIN ligne_points lpm
         ON lpm.ligne_id = t.ligne_id AND lpm.ordre = COALESCE(b.point_embarquement_ordre, 0)
       LEFT JOIN ligne_points lpd
         ON lpd.ligne_id = t.ligne_id AND lpd.ordre = b.point_debarquement_ordre
       LEFT JOIN villes vm ON vm.code = lpm.ville
       LEFT JOIN villes vdd ON vdd.code = lpd.ville
       LEFT JOIN LATERAL (
         SELECT JSON_AGG(JSON_BUILD_OBJECT(
                  'id', pl.id, 'genre', pl.genre, 'nom', pl.nom,
                  'url', pl.url, 'type', pl.type,
                  'ajoute_le', to_char(pl.cree_le, 'DD/MM/YYYY HH24:MI')
                ) ORDER BY pl.cree_le) AS liste
         FROM pieces_litige pl WHERE pl.litige_id = l.id
       ) AS p ON true
       WHERE ${filtre}
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
              l.reponse_agence, l.cree_le, l.escalade_le, l.decide_le,
              -- Les litiges tranches restent dans la liste, grises : le
              -- dossier et sa decision doivent rester consultables.
              l.decision, l.gagnant, l.collectif, l.trajet_id,
              -- Litige collectif : le dossier ne porte pas une personne
              -- mais tous les denonciateurs. On renvoie leur nombre pour
              -- que les interfaces affichent « 3 clients » et non un nom.
              CASE WHEN l.collectif THEN (
                SELECT COUNT(DISTINCT sg.voyageur_id) FROM signalements sg
                 WHERE sg.trajet_id = l.trajet_id AND sg.categorie = 'fausse_arrivee'
              ) ELSE 1 END AS nb_clients,
              -- Et leurs noms, pour la liste des plaignants.
              CASE WHEN l.collectif THEN (
                SELECT JSON_AGG(x) FROM (
                  SELECT DISTINCT vv.prenom || ' ' || vv.nom AS nom,
                         vv.telephone, vv.email,
                         -- Les denonciateurs ne descendent pas tous au
                         -- meme endroit : chacun garde son troncon.
                         cvm.nom_affiche || ' → ' || cvd.nom_affiche AS troncon
                    FROM signalements sg
                    JOIN voyageurs vv ON vv.id = sg.voyageur_id
                    -- Un seul billet par plaignant : sur une reservation
                    -- de groupe le meme voyageur en porte plusieurs, et
                    -- il apparaitrait autant de fois dans la liste que
                    -- de billets — le compteur « N clients » ne colle
                    -- alors plus aux noms affiches.
                    LEFT JOIN LATERAL (
                      SELECT cbb.point_embarquement_ordre,
                             cbb.point_debarquement_ordre
                        FROM billets cbb
                       WHERE cbb.trajet_id = sg.trajet_id
                         AND cbb.voyageur_id = sg.voyageur_id
                         AND cbb.statut IN ('confirme', 'utilise')
                       ORDER BY cbb.point_embarquement_ordre ASC
                       LIMIT 1
                    ) cb ON true
                    LEFT JOIN ligne_points clm
                      ON clm.ligne_id = t.ligne_id AND clm.ordre = COALESCE(cb.point_embarquement_ordre, 0)
                    LEFT JOIN ligne_points cld
                      ON cld.ligne_id = t.ligne_id AND cld.ordre = cb.point_debarquement_ordre
                    LEFT JOIN villes cvm ON cvm.code = clm.ville
                    LEFT JOIN villes cvd ON cvd.code = cld.ville
                   WHERE sg.trajet_id = l.trajet_id
                     AND sg.categorie = 'fausse_arrivee'
                ) AS x
              ) ELSE NULL END AS clients,
              to_char(l.cree_le, 'DD/MM/YYYY') AS date_ouverture,
              to_char(l.cree_le, 'HH24:MI') AS heure_ouverture,
              to_char(l.reponse_agence_le, 'DD/MM/YYYY') AS date_reponse,
              to_char(l.reponse_agence_le, 'HH24:MI') AS heure_reponse,
              to_char(l.decide_le, 'DD/MM/YYYY') AS date_decision,
              to_char(l.decide_le, 'HH24:MI') AS heure_decision,
              to_char(t.date_depart, 'DD/MM/YYYY') AS date_trajet,
              to_char(t.heure_depart, 'HH24:MI') AS heure_trajet,
              -- Meme regle que cote agence et mobile : le troncon
              -- achete, pas la ligne entiere. Un litige collectif garde
              -- la ligne (il ne porte qu'un billet sur plusieurs).
              CASE
                WHEN NOT COALESCE(l.collectif, false)
                     AND vm.nom_affiche IS NOT NULL AND vdd.nom_affiche IS NOT NULL
                  THEN vm.nom_affiche || ' → ' || vdd.nom_affiche
                WHEN vd.nom_affiche IS NOT NULL
                  THEN vd.nom_affiche || ' → ' || va.nom_affiche
                ELSE NULL END AS trajet_nom,
              CASE WHEN vd.nom_affiche IS NOT NULL
                THEN vd.nom_affiche || ' → ' || va.nom_affiche
                ELSE NULL END AS ligne_complete,
              v.telephone AS telephone_voyageur, v.email AS email_voyageur,
              a.nom AS nom_agence, v.nom AS nom_voyageur, v.prenom AS prenom_voyageur,
              COALESCE(p.liste, '[]'::json) AS pieces
       FROM litiges l
       JOIN agences a ON a.id = l.agence_id
       JOIN voyageurs v ON v.id = l.voyageur_id
       LEFT JOIN trajets t ON t.id = l.trajet_id
       LEFT JOIN lignes li ON li.id = t.ligne_id
       LEFT JOIN villes vd ON vd.code = li.ville_depart
       LEFT JOIN villes va ON va.code = li.ville_arrivee
       LEFT JOIN billets b ON b.id = l.billet_id
       -- Troncon reellement achete par le plaignant. Sur une ligne
       -- Douala -> Bafoussam -> Yaounde, le client descendu a Bafoussam
       -- n'a pas voyage jusqu'a Yaounde : son litige ne doit pas
       -- s'annoncer « Douala -> Yaounde ».
       LEFT JOIN ligne_points lpm
         ON lpm.ligne_id = t.ligne_id AND lpm.ordre = COALESCE(b.point_embarquement_ordre, 0)
       LEFT JOIN ligne_points lpd
         ON lpd.ligne_id = t.ligne_id AND lpd.ordre = b.point_debarquement_ordre
       LEFT JOIN villes vm ON vm.code = lpm.ville
       LEFT JOIN villes vdd ON vdd.code = lpd.ville
       LEFT JOIN LATERAL (
         SELECT JSON_AGG(JSON_BUILD_OBJECT(
                  'id', pl.id, 'genre', pl.genre, 'nom', pl.nom,
                  'url', pl.url, 'type', pl.type,
                  'ajoute_le', to_char(pl.cree_le, 'DD/MM/YYYY HH24:MI')
                ) ORDER BY pl.cree_le) AS liste
         FROM pieces_litige pl WHERE pl.litige_id = l.id
       ) AS p ON true
       ORDER BY (l.statut IN ('resolu','cloture')) ASC,
                (l.escalade_le IS NOT NULL) DESC, l.cree_le ASC`
    );

    res.json({ nombre: resultat.rows.length, litiges: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { ouvrirLitige, repondreLitige, trancherLitige, mesLitiges, litigesAdmin, ajouterPieceLitige, piecesLitige };
