const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { genererToken } = require('../utils/jwt');
const { creerNotification } = require('../services/notificationService');
const { journaliser } = require('../services/logService');

// ═══════════════════════════════════════════════════
// CONNEXION ADMIN
// ═══════════════════════════════════════════════════
async function connexion(req, res) {
  try {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const resultat = await pool.query('SELECT * FROM membres_admin WHERE email = $1', [email]);
    if (resultat.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const membre = resultat.rows[0];
    if (membre.statut !== 'actif') {
      return res.status(403).json({ error: 'Ce compte admin est désactivé' });
    }

    const motDePasseValide = await bcrypt.compare(mot_de_passe, membre.mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    await pool.query('UPDATE membres_admin SET derniere_connexion = NOW() WHERE id = $1', [membre.id]);

    const token = genererToken({ id: membre.id, type: 'admin' });

    res.json({
      message: 'Connexion réussie',
      membre: { id: membre.id, nom: membre.nom, prenom: membre.prenom, niveau: membre.niveau },
      token
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// LISTER LES AGENCES EN ATTENTE DE VALIDATION
// ═══════════════════════════════════════════════════
async function agencesEnAttente(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const resultat = await pool.query(
      `SELECT id, nom, email, telephone, adresse, ville, registre_commerce, cree_le
       FROM agences WHERE statut = 'en_attente'
       ORDER BY cree_le ASC`
    );

    res.json({ nombre: resultat.rows.length, agences: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// VALIDER UNE AGENCE
// ═══════════════════════════════════════════════════
async function validerAgence(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const agenceId = req.params.id;

    const check = await pool.query('SELECT id, nom, statut FROM agences WHERE id = $1', [agenceId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }
    if (check.rows[0].statut === 'actif') {
      return res.status(400).json({ error: 'Cette agence est déjà validée' });
    }

    await pool.query('UPDATE agences SET statut = $1, mis_a_jour_le = NOW() WHERE id = $2', ['actif', agenceId]);

    await creerNotification({
      destinataire_type: 'agence',
      destinataire_id: agenceId,
      type: 'agence_validee',
      titre: 'Agence validée',
      contenu: 'Votre agence a été validée par JEGO. Vous êtes désormais visible auprès des voyageurs.',
      canal: 'email'
    });

    await journaliser({
      acteurType: 'membre_admin', acteurId: req.utilisateur.id,
      action: 'validation_agence', details: { agence_id: agenceId, nom: check.rows[0].nom },
      ipAddress: req.ip,
    });

    res.json({ message: `Agence ${check.rows[0].nom} validée avec succès`, agence_id: agenceId });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// REFUSER UNE AGENCE (motif obligatoire)
// ═══════════════════════════════════════════════════
async function refuserAgence(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const agenceId = req.params.id;
    const { motif } = req.body;

    if (!motif || motif.trim().length === 0) {
      return res.status(400).json({ error: 'Le motif de refus est obligatoire' });
    }

    const check = await pool.query('SELECT id, nom FROM agences WHERE id = $1', [agenceId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    await pool.query('UPDATE agences SET statut = $1, mis_a_jour_le = NOW() WHERE id = $2', ['refuse', agenceId]);

    await creerNotification({
      destinataire_type: 'agence',
      destinataire_id: agenceId,
      type: 'agence_refusee',
      titre: 'Inscription refusée',
      contenu: `Votre inscription n'a pas été validée. Motif : ${motif}`,
      canal: 'email'
    });

    await journaliser({
      acteurType: 'membre_admin', acteurId: req.utilisateur.id,
      action: 'refus_agence', details: { agence_id: agenceId, nom: check.rows[0].nom, motif },
      ipAddress: req.ip,
    });

    res.json({ message: `Agence ${check.rows[0].nom} refusée`, motif });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// LISTER TOUS LES PARAMÈTRES SYSTÈME (admin)
// ═══════════════════════════════════════════════════
async function listerParametres(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const { categorie } = req.query;

    let requete = `SELECT cle, valeur, type_valeur, categorie, description, mis_a_jour_le FROM parametres_systeme`;
    const params = [];
    if (categorie) {
      requete += ` WHERE categorie = $1`;
      params.push(categorie);
    }
    requete += ` ORDER BY categorie, cle`;

    const resultat = await pool.query(requete, params);
    res.json({ parametres: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// MODIFIER UN PARAMÈTRE SYSTÈME (admin) — traçabilité incluse
// ═══════════════════════════════════════════════════
async function modifierParametre(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const adminId = req.utilisateur.id;
    const { cle } = req.params;
    const { valeur } = req.body;

    if (valeur === undefined || valeur === null || valeur === '') {
      return res.status(400).json({ error: 'La nouvelle valeur est obligatoire' });
    }

    const check = await pool.query(`SELECT cle FROM parametres_systeme WHERE cle = $1`, [cle]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Paramètre introuvable' });
    }

    await pool.query(
      `UPDATE parametres_systeme SET valeur = $1, modifie_par = $2, mis_a_jour_le = NOW() WHERE cle = $3`,
      [String(valeur), adminId, cle]
    );

    await journaliser({
      acteurType: 'membre_admin', acteurId: adminId,
      action: 'modification_parametre', details: { cle, nouvelle_valeur: valeur },
      ipAddress: req.ip, estUrgence: true,
    });

    res.json({ message: `Paramètre ${cle} mis à jour`, cle, nouvelle_valeur: valeur });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// LISTER LES VOYAGEURS (avec compteurs voyages/litiges)
// ═══════════════════════════════════════════════════
async function listerVoyageurs(req, res) {
  try {
    const { recherche } = req.query;

    const parametres = [];
    let filtre = '';
    if (recherche && recherche.trim().length > 0) {
      parametres.push(`%${recherche.trim()}%`);
      filtre = `WHERE v.nom ILIKE $1 OR v.prenom ILIKE $1 OR v.telephone ILIKE $1 OR v.email ILIKE $1`;
    }

    const resultat = await pool.query(
      `SELECT v.id, v.nom, v.prenom, v.telephone, v.email, v.statut, v.cree_le,
              COUNT(DISTINCT b.id) FILTER (WHERE b.statut = 'utilise') AS nombre_voyages,
              COUNT(DISTINCT l.id) AS nombre_litiges
       FROM voyageurs v
       LEFT JOIN billets b ON b.voyageur_id = v.id
       LEFT JOIN litiges l ON l.voyageur_id = v.id
       ${filtre}
       GROUP BY v.id
       ORDER BY v.cree_le DESC`,
      parametres
    );

    res.json({ nombre: resultat.rows.length, voyageurs: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// CHANGER LE STATUT D'UN VOYAGEUR (bannir/réactiver les commentaires)
// ═══════════════════════════════════════════════════
async function modifierStatutVoyageur(req, res) {
  try {
    const voyageurId = req.params.id;
    const { statut } = req.body;

    if (!['actif', 'banni_commentaires'].includes(statut)) {
      return res.status(400).json({ error: "Statut invalide : 'actif' ou 'banni_commentaires'" });
    }

    const resultat = await pool.query(
      `UPDATE voyageurs SET statut = $1, mis_a_jour_le = NOW() WHERE id = $2
       RETURNING id, nom, prenom, statut`,
      [statut, voyageurId]
    );
    if (resultat.rows.length === 0) {
      return res.status(404).json({ error: 'Voyageur introuvable' });
    }

    res.json({ message: 'Statut mis à jour', voyageur: resultat.rows[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// CONFIGURATION DES FRAIS — lecture
// Grille globale = lignes sans agence_id. Dérogations = lignes avec agence_id
// (elles remplacent TOUTE la grille pour cette agence, voir ORDER BY
// agence_id NULLS LAST dans reservationController).
// ═══════════════════════════════════════════════════
async function listerFrais(req, res) {
  try {
    const grille = await pool.query(
      `SELECT id, tranche_min, tranche_max, pourcentage
       FROM configuration_frais
       WHERE type_frais = 'commission' AND agence_id IS NULL AND actif = true
       ORDER BY tranche_min ASC`
    );

    const derogations = await pool.query(
      `SELECT cf.id, cf.agence_id, cf.pourcentage, cf.motif, a.nom AS agence
       FROM configuration_frais cf
       JOIN agences a ON a.id = cf.agence_id
       WHERE cf.type_frais = 'commission' AND cf.actif = true
       ORDER BY a.nom ASC`
    );

    res.json({
      grille: grille.rows,
      derogations: derogations.rows,
      // Les frais annexes (supplément siège premium, majoration flexible)
      // sont encore codés en dur dans reservationController.js — aucune
      // ligne en base tant qu'ils n'auront pas été migrés.
      fraisAnnexes: []
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// CONFIGURATION DES FRAIS — enregistrer la grille globale
// Reçoit la grille complète : les lignes avec id sont mises à jour, celles
// sans id sont créées, et celles qui ont disparu sont désactivées.
// ═══════════════════════════════════════════════════
async function modifierGrilleFrais(req, res) {
  const client = await pool.connect();
  try {
    const adminId = req.utilisateur.id;
    const { grille } = req.body;

    if (!Array.isArray(grille) || grille.length === 0) {
      return res.status(400).json({ error: 'La grille doit contenir au moins une tranche' });
    }

    for (const t of grille) {
      const min = parseInt(t.tranche_min);
      const max = t.tranche_max === null || t.tranche_max === undefined || t.tranche_max === ''
        ? null : parseInt(t.tranche_max);
      const pct = parseFloat(t.pourcentage);

      if (Number.isNaN(min) || min < 0) {
        return res.status(400).json({ error: `Tranche invalide : minimum incorrect (${t.tranche_min})` });
      }
      if (max !== null && max <= min) {
        return res.status(400).json({ error: `Tranche invalide : le maximum doit être supérieur au minimum (${min} → ${max})` });
      }
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        return res.status(400).json({ error: `Commission invalide : ${t.pourcentage} (attendu entre 0 et 100)` });
      }
    }

    // Une seule tranche peut être ouverte (tranche_max NULL), sinon le
    // ORDER BY ... LIMIT 1 du calcul de commission devient ambigu.
    const ouvertes = grille.filter((t) => t.tranche_max === null || t.tranche_max === undefined || t.tranche_max === '');
    if (ouvertes.length > 1) {
      return res.status(400).json({ error: 'Une seule tranche peut être sans maximum' });
    }

    await client.query('BEGIN');

    const idsConserves = [];
    for (const t of grille) {
      const min = parseInt(t.tranche_min);
      const max = t.tranche_max === null || t.tranche_max === undefined || t.tranche_max === ''
        ? null : parseInt(t.tranche_max);
      const pct = parseFloat(t.pourcentage);

      if (t.id) {
        await client.query(
          `UPDATE configuration_frais
           SET tranche_min = $1, tranche_max = $2, pourcentage = $3,
               modifie_par = $4, mis_a_jour_le = NOW()
           WHERE id = $5 AND agence_id IS NULL AND type_frais = 'commission'`,
          [min, max, pct, adminId, t.id]
        );
        idsConserves.push(t.id);
      } else {
        const cree = await client.query(
          `INSERT INTO configuration_frais
            (agence_id, tranche_min, tranche_max, pourcentage, type_frais, actif, modifie_par)
           VALUES (NULL, $1, $2, $3, 'commission', true, $4)
           RETURNING id`,
          [min, max, pct, adminId]
        );
        idsConserves.push(cree.rows[0].id);
      }
    }

    // Les tranches globales retirées de l'écran sont désactivées, pas
    // supprimées : on garde la trace de ce qui s'appliquait avant.
    await client.query(
      `UPDATE configuration_frais
       SET actif = false, modifie_par = $1, mis_a_jour_le = NOW()
       WHERE type_frais = 'commission' AND agence_id IS NULL AND actif = true
         AND NOT (id = ANY($2::uuid[]))`,
      [adminId, idsConserves]
    );

    await client.query('COMMIT');

    const relecture = await client.query(
      `SELECT id, tranche_min, tranche_max, pourcentage
       FROM configuration_frais
       WHERE type_frais = 'commission' AND agence_id IS NULL AND actif = true
       ORDER BY tranche_min ASC`
    );

    res.json({ message: 'Grille globale enregistrée', grille: relecture.rows });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// CONFIGURATION DES FRAIS — créer une dérogation agence
// ═══════════════════════════════════════════════════
async function creerDerogationFrais(req, res) {
  try {
    const adminId = req.utilisateur.id;
    const { agence_id, pourcentage, motif } = req.body;

    if (!agence_id) {
      return res.status(400).json({ error: "L'agence est obligatoire" });
    }
    const pct = parseFloat(pourcentage);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ error: 'Commission invalide (attendu entre 0 et 100)' });
    }

    const agence = await pool.query(`SELECT id, nom FROM agences WHERE id = $1`, [agence_id]);
    if (agence.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    const existante = await pool.query(
      `SELECT id FROM configuration_frais
       WHERE agence_id = $1 AND type_frais = 'commission' AND actif = true`,
      [agence_id]
    );
    if (existante.rows.length > 0) {
      return res.status(409).json({ error: 'Cette agence a déjà une dérogation active' });
    }

    // Une dérogation couvre toute l'échelle de prix (0 → sans maximum) :
    // elle remplace la grille entière pour cette agence, pas une tranche.
    const cree = await pool.query(
      `INSERT INTO configuration_frais
        (agence_id, tranche_min, tranche_max, pourcentage, type_frais, actif, motif, modifie_par)
       VALUES ($1, 0, NULL, $2, 'commission', true, $3, $4)
       RETURNING id, agence_id, pourcentage, motif`,
      [agence_id, pct, motif || null, adminId]
    );

    res.status(201).json({
      message: 'Dérogation créée',
      derogation: { ...cree.rows[0], agence: agence.rows[0].nom }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// CONFIGURATION DES FRAIS — retirer une dérogation
// ═══════════════════════════════════════════════════
async function supprimerDerogationFrais(req, res) {
  try {
    const adminId = req.utilisateur.id;
    const resultat = await pool.query(
      `UPDATE configuration_frais
       SET actif = false, modifie_par = $1, mis_a_jour_le = NOW()
       WHERE id = $2 AND agence_id IS NOT NULL AND type_frais = 'commission' AND actif = true
       RETURNING id`,
      [adminId, req.params.id]
    );
    if (resultat.rows.length === 0) {
      return res.status(404).json({ error: 'Dérogation introuvable' });
    }
    res.json({ message: "Dérogation retirée — l'agence revient sur la grille globale" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// LISTER LES AGENCES (filtrable par statut)
// ═══════════════════════════════════════════════════
async function listerAgences(req, res) {
  try {
    const { statut } = req.query;
    const params = [];
    let filtre = '';
    if (statut) {
      params.push(statut);
      filtre = 'WHERE statut = $1';
    }
    const resultat = await pool.query(
      `SELECT id, nom, email, telephone, adresse, ville, registre_commerce, statut, cree_le
       FROM agences ${filtre} ORDER BY nom ASC`,
      params
    );
    res.json({ nombre: resultat.rows.length, agences: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// BILLETS & TRAJETS — liste du jour, toutes agences
// Un trajet, ses passagers (avec le tronçon réellement réservé) et ses
// signalements. Le "trajet associé" d'un passager n'est pas forcément la
// ligne entière : sur une ligne à arrêts, chacun réserve son segment.
// ═══════════════════════════════════════════════════
async function listerTrajetsAdmin(req, res) {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'La date est obligatoire' });
    }

    const trajets = await pool.query(
      `SELECT
          t.id, t.date_depart, t.heure_depart, t.heure_arrivee_estimee,
          t.statut, t.retard_minutes, t.categorie, t.prix_base,
          t.prix_bagage_supplementaire, t.distribution_nourriture,
          a.nom AS agence,
          vd.nom_affiche AS depart_affiche,
          va.nom_affiche AS arrivee_affiche,
          l.id AS ligne_id,
          b.nom AS nom_bus, b.supplement_premium,
          c.prenom || ' ' || c.nom AS chauffeur,
          (SELECT COUNT(*) FROM sieges s
            WHERE s.bus_id = t.bus_id
              AND s.statut NOT IN ('supprime_toilettes', 'desactive')) AS places_totales,
          (SELECT COUNT(*) FROM billets b2
            WHERE b2.trajet_id = t.id AND b2.statut IN ('confirme', 'utilise')) AS places_vendues,
          (SELECT COUNT(*) FROM billets b2
            WHERE b2.trajet_id = t.id AND b2.statut IN ('confirme', 'utilise')
              AND b2.source_vente = 'en_ligne') AS vendus_app,
          (SELECT COUNT(*) FROM billets b2
            WHERE b2.trajet_id = t.id AND b2.statut IN ('confirme', 'utilise')
              AND b2.source_vente = 'physique') AS vendus_guichet,
          COALESCE(pointsDetail.points, '[]'::json) AS points_detail,
          COALESCE(prixSections.troncons, '[]'::json) AS prix_sections
       FROM trajets t
       JOIN agences a ON a.id = t.agence_id
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       JOIN bus b ON b.id = t.bus_id
       LEFT JOIN chauffeurs c ON c.id = t.chauffeur_id
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
       WHERE t.date_depart = $1
       ORDER BY t.heure_depart ASC`,
      [date]
    );

    if (trajets.rows.length === 0) {
      return res.json({ trajets: [] });
    }

    const ids = trajets.rows.map((t) => t.id);

    const passagers = await pool.query(
      `SELECT
          b.trajet_id, b.numero, b.source_vente, b.est_cadeau,
          b.point_embarquement_ordre, b.point_debarquement_ordre,
          v.nom, v.prenom, v.telephone,
          s.numero AS siege,
          p.operateur,
          vd.nom_affiche AS troncon_depart,
          va.nom_affiche AS troncon_arrivee
       FROM billets b
       JOIN voyageurs v ON v.id = b.voyageur_id
       JOIN sieges s ON s.id = b.siege_id
       JOIN trajets t ON t.id = b.trajet_id
       LEFT JOIN paiements p ON p.billet_id = b.id AND p.type = 'paiement'
       LEFT JOIN ligne_points lpd
         ON lpd.ligne_id = t.ligne_id AND lpd.ordre = COALESCE(b.point_embarquement_ordre, 0)
       LEFT JOIN ligne_points lpa
         ON lpa.ligne_id = t.ligne_id AND lpa.ordre = b.point_debarquement_ordre
       LEFT JOIN villes vd ON vd.code = lpd.ville
       LEFT JOIN villes va ON va.code = lpa.ville
       WHERE b.trajet_id = ANY($1) AND b.statut IN ('confirme', 'utilise')
       ORDER BY s.numero ASC`,
      [ids]
    );

    const signalements = await pool.query(
      `SELECT sg.trajet_id, sg.categorie, sg.commentaire, sg.cree_le,
              v.nom, v.prenom
       FROM signalements sg
       JOIN voyageurs v ON v.id = sg.voyageur_id
       WHERE sg.trajet_id = ANY($1)
       ORDER BY sg.cree_le DESC`,
      [ids]
    );

    const libellesStatut = {
      programme: 'Programmé', en_cours: 'En cours', termine: 'Terminé',
      annule: 'Annulé', retard: 'Retard déclaré', incident: 'Incident'
    };
    const couleursStatut = {
      programme: 'grey', en_cours: 'green', termine: 'grey',
      annule: 'red', retard: 'amber', incident: 'red'
    };

    const resultat = trajets.rows.map((t) => {
      const sesPassagers = passagers.rows
        .filter((p) => p.trajet_id === t.id)
        .map((p) => ({
          nom: `${p.prenom} ${p.nom}`,
          tel: p.telephone,
          siege: p.siege,
          vente: p.source_vente === 'en_ligne' ? 'app' : 'site',
          paiement: p.source_vente === 'physique'
            ? 'Espèces (guichet)'
            : p.operateur === 'mtn_momo' ? 'MTN Mobile Money'
            : p.operateur === 'orange_money' ? 'Orange Money'
            : null,
          origine: p.est_cadeau ? 'Billet cadeau' : 'Acheté',
          // Si la ligne n'a pas de points intermédiaires, le tronçon
          // réservé est la ligne entière.
          trajetAssocie: (p.troncon_depart && p.troncon_arrivee)
            ? `${p.troncon_depart} → ${p.troncon_arrivee}`
            : `${t.depart_affiche} → ${t.arrivee_affiche}`,
        }));

      const sesSignalements = signalements.rows
        .filter((sg) => sg.trajet_id === t.id)
        .map((sg) => ({
          passager: `${sg.prenom} ${sg.nom}`,
          motif: sg.commentaire || sg.categorie.replace(/_/g, ' '),
          heure: new Date(sg.cree_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        }));

      const totales = parseInt(t.places_totales) || 0;
      const vendues = parseInt(t.places_vendues) || 0;

      return {
        id: t.id,
        trajet: `${t.depart_affiche} → ${t.arrivee_affiche}`,
        ville_depart: t.depart_affiche,
        ville_arrivee: t.arrivee_affiche,
        agence: t.agence,
        depart: String(t.heure_depart).slice(0, 5),
        arrivee: String(t.heure_arrivee_estimee).slice(0, 5),
        occ: totales > 0 ? `${vendues}/${totales}` : '—',
        statut: t.retard_minutes > 0
          ? `Retard déclaré +${t.retard_minutes}min`
          : (libellesStatut[t.statut] || t.statut),
        color: t.retard_minutes > 0 ? 'amber' : (couleursStatut[t.statut] || 'grey'),
        app: parseInt(t.vendus_app) || 0,
        site: parseInt(t.vendus_guichet) || 0,
        categorie: t.categorie,
        nom_bus: t.nom_bus,
        chauffeur: t.chauffeur,
        prix_base: t.prix_base,
        prix_bagage_supplementaire: t.prix_bagage_supplementaire,
        distribution_nourriture: t.distribution_nourriture,
        supplement_premium: t.supplement_premium,
        points_detail: t.points_detail,
        prix_sections: t.prix_sections,
        signalements: sesSignalements,
        passagers: sesPassagers,
      };
    });

    res.json({ trajets: resultat });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// BILLETS & TRAJETS — les 4 cartes de résumé
// ═══════════════════════════════════════════════════
async function resumeTrajetsAdmin(req, res) {
  try {
    const { date } = req.query;
    const jour = date || new Date().toISOString().slice(0, 10);

    // 1. Trajets programmés sur les 7 prochains jours
    const programmes = await pool.query(
      `SELECT COUNT(*) AS nb FROM trajets
       WHERE date_depart >= CURRENT_DATE
         AND date_depart < CURRENT_DATE + INTERVAL '7 days'
         AND statut != 'annule'`
    );
    const detailProgrammes = await pool.query(
      `SELECT vd.nom_affiche || ' → ' || va.nom_affiche AS label,
              COUNT(*) || ' trajets' AS valeur
       FROM trajets t
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       WHERE t.date_depart >= CURRENT_DATE
         AND t.date_depart < CURRENT_DATE + INTERVAL '7 days'
         AND t.statut != 'annule'
       GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 5`
    );

    // 2. Taux de remplissage moyen sur les 7 derniers jours
    const remplissage = await pool.query(
      `SELECT
          COALESCE(SUM(vendus), 0) AS vendus,
          COALESCE(SUM(places), 0) AS places,
          COALESCE(SUM(vendus_app), 0) AS vendus_app,
          COALESCE(SUM(vendus_guichet), 0) AS vendus_guichet
       FROM (
         SELECT
           (SELECT COUNT(*) FROM billets b WHERE b.trajet_id = t.id AND b.statut IN ('confirme','utilise')) AS vendus,
           (SELECT COUNT(*) FROM billets b WHERE b.trajet_id = t.id AND b.statut IN ('confirme','utilise') AND b.source_vente = 'en_ligne') AS vendus_app,
           (SELECT COUNT(*) FROM billets b WHERE b.trajet_id = t.id AND b.statut IN ('confirme','utilise') AND b.source_vente = 'physique') AS vendus_guichet,
           (SELECT COUNT(*) FROM sieges s WHERE s.bus_id = t.bus_id AND s.statut NOT IN ('supprime_toilettes','desactive')) AS places
         FROM trajets t
         WHERE t.date_depart >= CURRENT_DATE - INTERVAL '7 days'
           AND t.date_depart <= CURRENT_DATE
           AND t.statut != 'annule'
       ) AS q`
    );
    const r = remplissage.rows[0];
    const taux = parseInt(r.places) > 0
      ? Math.round((parseInt(r.vendus) / parseInt(r.places)) * 100) + '%'
      : '—';

    // 3. Agences dont le programme ne couvre pas les 2 prochaines semaines.
    //    Trois cas distincts, sinon l'écran affiche un nombre négatif qui
    //    ne veut rien dire :
    //      - aucun trajet publié du tout
    //      - dernier trajet déjà passé -> programme épuisé depuis X jours
    //      - programme qui court encore, mais moins de 14 jours
    const programmeCourt = await pool.query(
      `SELECT a.nom AS label,
              CASE
                WHEN MAX(t.date_depart) IS NULL THEN 'aucun trajet publié'
                WHEN MAX(t.date_depart) < CURRENT_DATE
                  THEN 'épuisé depuis ' || (CURRENT_DATE - MAX(t.date_depart)) || ' j'
                WHEN MAX(t.date_depart) = CURRENT_DATE
                  THEN 'plus rien après aujourd''hui'
                ELSE (MAX(t.date_depart) - CURRENT_DATE) || ' jours restants'
              END AS valeur
       FROM agences a
       LEFT JOIN trajets t ON t.agence_id = a.id AND t.statut != 'annule'
       WHERE a.statut = 'actif'
       GROUP BY a.id, a.nom
       HAVING COALESCE(MAX(t.date_depart), CURRENT_DATE - 1) < CURRENT_DATE + INTERVAL '14 days'
       ORDER BY COALESCE(MAX(t.date_depart), '1900-01-01'::date) ASC`
    );

    // 4. Trajets retardés à la date consultée
    const retardes = await pool.query(
      `SELECT a.nom || ' — ' || vd.nom_affiche || '→' || va.nom_affiche AS label,
              '+' || t.retard_minutes || ' min' AS valeur
       FROM trajets t
       JOIN agences a ON a.id = t.agence_id
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       WHERE t.date_depart = $1 AND t.retard_minutes > 0
       ORDER BY t.retard_minutes DESC`,
      [jour]
    );

    res.json({
      programmes7j: String(programmes.rows[0].nb),
      tauxRemplissage: taux,
      agencesProgrammeCourt: String(programmeCourt.rows.length),
      trajetsRetardes: String(retardes.rows.length),
      detailProgrammes: detailProgrammes.rows,
      detailRemplissage: [
        { label: "Vendus via l'app JEGO", valeur: String(r.vendus_app) },
        { label: 'Vendus au guichet', valeur: String(r.vendus_guichet) },
      ],
      detailProgrammeCourt: programmeCourt.rows,
      detailRetardes: retardes.rows,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// FINANCES — cartes de résumé
// Le revenu JEGO vient de escrow.montant_jego (déjà net des frais MoMo et
// des réductions points au moment du paiement). Un billet vendu au guichet
// ne rapporte rien à JEGO tant qu'aucune commission n'est prélevée dessus.
// ═══════════════════════════════════════════════════
async function resumeFinances(req, res) {
  try {
    const jour = req.query.date || new Date().toISOString().slice(0, 10);
    // Le mois peut être choisi indépendamment du jour consulté (format
    // YYYY-MM). Sans paramètre, on prend le mois du jour affiché.
    const moisRef = req.query.mois ? `${req.query.mois}-01` : jour;

    const mois = await pool.query(
      `SELECT COALESCE(SUM(e.montant_jego), 0) AS revenu,
              COUNT(*) AS billets
       FROM escrow e
       JOIN billets b ON b.id = e.billet_id
       WHERE DATE_TRUNC('month', b.cree_le) = DATE_TRUNC('month', $1::date)
         AND b.statut IN ('confirme', 'utilise')`,
      [moisRef]
    );

    const detailMois = await pool.query(
      `SELECT a.nom AS label, SUM(e.montant_jego)::text || ' F' AS valeur
       FROM escrow e
       JOIN billets b ON b.id = e.billet_id
       JOIN agences a ON a.id = b.agence_id
       WHERE DATE_TRUNC('month', b.cree_le) = DATE_TRUNC('month', $1::date)
         AND b.statut IN ('confirme', 'utilise')
       GROUP BY a.nom ORDER BY SUM(e.montant_jego) DESC LIMIT 5`,
      [moisRef]
    );

    const dujour = await pool.query(
      `SELECT COALESCE(SUM(e.montant_jego), 0) AS revenu,
              COUNT(*) AS billets,
              COALESCE(SUM(e.montant_agence), 0) AS verse_agences
       FROM escrow e
       JOIN billets b ON b.id = e.billet_id
       WHERE b.cree_le::date = $1::date
         AND b.statut IN ('confirme', 'utilise')`,
      [jour]
    );

    // Commission moyenne réellement constatée : marge JEGO rapportée au
    // prix agence, pas le taux théorique de la grille.
    const commission = await pool.query(
      `SELECT COALESCE(ROUND(AVG(b.marge_jego::numeric / NULLIF(b.prix_agence, 0) * 100), 1), 0) AS taux
       FROM billets b
       WHERE b.statut IN ('confirme', 'utilise')
         AND b.cree_le >= $1::date - INTERVAL '30 days'`,
      [jour]
    );

    const remboursements = await pool.query(
      `SELECT COALESCE(SUM(montant), 0) AS total, COUNT(*) AS nb
       FROM remboursements WHERE statut = 'en_attente'`
    );

    const detailRemboursements = await pool.query(
      `SELECT motif AS label,
              SUM(montant)::text || ' F (' || COUNT(*) || ')' AS valeur
       FROM remboursements WHERE statut = 'en_attente'
       GROUP BY motif ORDER BY SUM(montant) DESC`
    );

    const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' F';

    res.json({
      revenuMois: fmt(mois.rows[0].revenu),
      revenuJour: fmt(dujour.rows[0].revenu),
      commissionMoyenne: commission.rows[0].taux + '%',
      remboursementsEnCours: fmt(remboursements.rows[0].total),
      billetsMois: String(mois.rows[0].billets),
      detailRevenuMois: detailMois.rows,
      detailRevenuJour: [
        { label: 'Billets vendus', valeur: String(dujour.rows[0].billets) },
        { label: 'Versé aux agences', valeur: fmt(dujour.rows[0].verse_agences) },
      ],
      detailRemboursements: detailRemboursements.rows,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// FINANCES — série pour le graphe (revenu net par jour)
// Génère TOUS les jours de la période, même ceux sans vente, sinon le
// graphe saute les jours vides et devient trompeur.
// ═══════════════════════════════════════════════════
async function serieFinances(req, res) {
  try {
    const jours = Math.min(parseInt(req.query.jours) || 7, 90);
    // La série se termine à la date consultée, pas à aujourd'hui : sinon le
    // graphe reste figé pendant que le reste de la page suit la navigation.
    const fin = req.query.date || new Date().toISOString().slice(0, 10);

    const resultat = await pool.query(
      `SELECT
          j.jour,
          EXTRACT(DOW FROM j.jour)::int AS num_jour,
          COALESCE(SUM(e.montant_jego), 0)::int AS valeur
       FROM GENERATE_SERIES($2::date - ($1::int - 1), $2::date, '1 day') AS j(jour)
       LEFT JOIN billets b ON b.cree_le::date = j.jour AND b.statut IN ('confirme', 'utilise')
       LEFT JOIN escrow e ON e.billet_id = b.id
       GROUP BY j.jour ORDER BY j.jour ASC`,
      [jours, fin]
    );

    // Libellés en français : TO_CHAR suit la locale du serveur PostgreSQL
    // (souvent en anglais), ce qui donnait "Sat/Sun" sur une interface FR.
    const joursFr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    res.json({
      serie: resultat.rows.map((r) => ({
        jour: joursFr[r.num_jour],
        date: r.jour,
        valeur: r.valeur,
      }))
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// FINANCES — transactions du jour
// ═══════════════════════════════════════════════════
async function transactionsFinances(req, res) {
  try {
    const jour = req.query.date || new Date().toISOString().slice(0, 10);

    const resultat = await pool.query(
      `SELECT
          b.id, b.numero,
          v.prenom || ' ' || v.nom AS client,
          a.nom AS agence,
          e.montant_total AS paye,
          e.montant_agence AS verse,
          e.frais_momo AS frais,
          e.montant_jego AS marge,
          COALESCE(p.reference_momo, b.numero) AS ref
       FROM billets b
       JOIN escrow e ON e.billet_id = b.id
       JOIN voyageurs v ON v.id = b.voyageur_id
       JOIN agences a ON a.id = b.agence_id
       LEFT JOIN paiements p ON p.billet_id = b.id AND p.type = 'paiement'
       WHERE b.cree_le::date = $1::date
         AND b.statut IN ('confirme', 'utilise')
       ORDER BY b.cree_le DESC`,
      [jour]
    );

    res.json({ transactions: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// DERNIÈRE TRANSACTION (toutes agences, sans filtre de date)
// Utilisé par le tableau de bord — indépendant de la date consultée
// ailleurs dans l'admin.
// ═══════════════════════════════════════════════════
async function derniereTransaction(req, res) {
  try {
    const resultat = await pool.query(
      `SELECT
          v.prenom || ' ' || v.nom AS client,
          a.nom AS agence,
          e.montant_total AS paye,
          e.montant_agence AS verse,
          e.montant_jego AS marge
       FROM billets b
       JOIN escrow e ON e.billet_id = b.id
       JOIN voyageurs v ON v.id = b.voyageur_id
       JOIN agences a ON a.id = b.agence_id
       WHERE b.statut IN ('confirme', 'utilise')
       ORDER BY b.cree_le DESC
       LIMIT 1`
    );

    if (resultat.rows.length === 0) {
      return res.json({ transaction: null });
    }

    const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' F';
    const t = resultat.rows[0];
    res.json({
      transaction: {
        client: t.client,
        agence: t.agence,
        paye: fmt(t.paye),
        verse: fmt(t.verse),
        marge: fmt(t.marge),
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// TABLEAU DE BORD — journal du jour (calcul en direct, pas de cache)
// La table journal_bord existe dans le schéma mais n'est écrite nulle
// part dans le code : on calcule ici en direct, comme le reste de
// l'admin (resumeFinances, resumeTrajetsAdmin...), pour éviter un
// système de génération à part qui peut se désynchroniser.
// ═══════════════════════════════════════════════════
async function resumeJournal(req, res) {
  try {
    const aujourdhui = new Date().toISOString().slice(0, 10);

    const billets = await pool.query(
      `SELECT COUNT(*) AS nb, COALESCE(SUM(e.montant_jego), 0) AS revenu
       FROM billets b
       JOIN escrow e ON e.billet_id = b.id
       WHERE b.cree_le::date = $1::date AND b.statut IN ('confirme', 'utilise')`,
      [aujourdhui]
    );

    const clients = await pool.query(
      `SELECT COUNT(*) AS nb FROM voyageurs WHERE cree_le::date = $1::date`,
      [aujourdhui]
    );

    const litiges = await pool.query(
      `SELECT COUNT(*) AS nb FROM litiges WHERE decide_le::date = $1::date`,
      [aujourdhui]
    );

    const remb = await pool.query(
      `SELECT COUNT(*) AS nb FROM remboursements WHERE statut = 'traite' AND traite_le::date = $1::date`,
      [aujourdhui]
    );

    const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' F';

    res.json({
      billetsVendus: String(billets.rows[0].nb),
      nouveauxClients: String(clients.rows[0].nb),
      litigesTraites: String(litiges.rows[0].nb),
      remboursements: String(remb.rows[0].nb),
      revenuNet: fmt(billets.rows[0].revenu),
      genereLe: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// TABLEAU DE BORD — à traiter (calcul en direct sur l'état réel)
//
// Urgent   : litiges en attente de décision admin (agence a répondu),
//            ou litige ouvert dont le délai de réponse de 48h de
//            l'agence est dépassé sans réponse.
// Important: agence en attente de validation depuis >48h,
//            demande de pièces ouverte depuis >5 jours.
// En attente: mêmes catégories, encore dans leur délai normal —
//            visibles mais pas encore à relancer.
// ═══════════════════════════════════════════════════
async function tachesATraiter(req, res) {
  try {
    const litigesEnCours = await pool.query(
      `SELECT l.id, l.numero, l.motif, a.nom AS nom_agence,
              v.prenom AS prenom_voyageur, v.nom AS nom_voyageur,
              EXTRACT(EPOCH FROM (NOW() - l.reponse_agence_le)) / 3600 AS heures
       FROM litiges l
       JOIN agences a ON a.id = l.agence_id
       JOIN voyageurs v ON v.id = l.voyageur_id
       WHERE l.statut = 'en_cours'
       ORDER BY l.reponse_agence_le ASC`
    );

    const litigesEnAttenteReponse = await pool.query(
      `SELECT l.id, l.numero, l.motif, a.nom AS nom_agence,
              EXTRACT(EPOCH FROM (NOW() - l.cree_le)) / 3600 AS heures
       FROM litiges l
       JOIN agences a ON a.id = l.agence_id
       WHERE l.statut = 'ouvert'
       ORDER BY l.cree_le ASC`
    );

    const agencesAttente = await pool.query(
      `SELECT id, nom, ville, cree_le,
              EXTRACT(EPOCH FROM (NOW() - cree_le)) / 3600 AS heures
       FROM agences WHERE statut = 'en_attente'
       ORDER BY cree_le ASC`
    );

    const piecesOuvertes = await pool.query(
      `SELECT dp.id, dp.pieces, dp.cree_le, a.nom AS nom_agence,
              EXTRACT(EPOCH FROM (NOW() - dp.cree_le)) / 3600 AS heures
       FROM demandes_pieces dp
       JOIN agences a ON a.id = dp.agence_id
       WHERE dp.statut = 'ouverte'
       ORDER BY dp.cree_le ASC`
    );

    const delai = (heures) => {
      if (heures < 1) return "à l'instant";
      if (heures < 24) return `depuis ${Math.floor(heures)} h`;
      return `depuis ${Math.floor(heures / 24)} j`;
    };

    const urgent = [
      ...litigesEnCours.rows.map((l) => ({
        id: `litige-${l.id}`, reference: l.numero,
        titre: `Décision attendue — ${l.motif}`,
        sousTitre: `${l.nom_agence} vs ${l.prenom_voyageur} ${l.nom_voyageur}`,
        delai: delai(Number(l.heures)), lien: '/litiges',
      })),
      ...litigesEnAttenteReponse.rows.filter((l) => Number(l.heures) >= 48).map((l) => ({
        id: `litige-retard-${l.id}`, reference: l.numero,
        titre: `Agence n'a pas répondu (délai 48h dépassé)`,
        sousTitre: l.nom_agence, delai: delai(Number(l.heures)), lien: '/litiges',
      })),
    ];

    const important = [
      ...agencesAttente.rows.filter((a) => Number(a.heures) >= 48).map((a) => ({
        id: `agence-${a.id}`, reference: a.ville,
        titre: `Validation en attente — ${a.nom}`,
        sousTitre: 'Délai normal dépassé', delai: delai(Number(a.heures)), lien: '/agences',
      })),
      ...piecesOuvertes.rows.filter((p) => Number(p.heures) >= 120).map((p) => ({
        id: `piece-${p.id}`, reference: p.nom_agence,
        titre: `Pièces manquantes toujours non reçues`,
        sousTitre: p.pieces, delai: delai(Number(p.heures)), lien: '/agences',
      })),
    ];

    const enAttente = [
      ...litigesEnAttenteReponse.rows.filter((l) => Number(l.heures) < 48).map((l) => ({
        id: `litige-attente-${l.id}`, reference: l.numero,
        titre: `En attente de réponse agence — ${l.motif}`,
        sousTitre: l.nom_agence, delai: delai(Number(l.heures)), lien: '/litiges',
      })),
      ...agencesAttente.rows.filter((a) => Number(a.heures) < 48).map((a) => ({
        id: `agence-attente-${a.id}`, reference: a.ville,
        titre: `Nouvelle inscription — ${a.nom}`,
        sousTitre: 'Dans le délai normal', delai: delai(Number(a.heures)), lien: '/agences',
      })),
      ...piecesOuvertes.rows.filter((p) => Number(p.heures) < 120).map((p) => ({
        id: `piece-attente-${p.id}`, reference: p.nom_agence,
        titre: `Pièces demandées`,
        sousTitre: p.pieces, delai: delai(Number(p.heures)), lien: '/agences',
      })),
    ];

    res.json({ urgent, important, enAttente });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// POINTS JEGO — résumé (écran admin)
// ═══════════════════════════════════════════════════
async function resumePoints(req, res) {
  try {
    const circulation = await pool.query(
      `SELECT COALESCE(SUM(points_fidelite), 0) AS total FROM voyageurs`
    );

    const gagnes = await pool.query(
      `SELECT COALESCE(SUM(points), 0) AS total FROM jego_points
       WHERE type = 'gain' AND cree_le >= NOW() - INTERVAL '7 days'`
    );

    const reconvertis = await pool.query(
      `SELECT COALESCE(SUM(ABS(points)), 0) AS total FROM jego_points
       WHERE type = 'depense' AND cree_le >= NOW() - INTERVAL '7 days'`
    );

    const paliers = await pool.query(
      `SELECT cle, valeur FROM parametres_systeme
       WHERE cle IN ('points_palier_reduction_points', 'points_palier_reduction_fcfa', 'points_palier_gratuit_points')`
    );
    const p = {};
    paliers.rows.forEach((r) => { p[r.cle] = r.valeur; });
    const reductionPoints = p['points_palier_reduction_points'] || 500;
    const reductionFcfa = p['points_palier_reduction_fcfa'] || 500;
    const gratuitPoints = p['points_palier_gratuit_points'] || 1000;

    res.json({
      totalCirculation: `${Number(circulation.rows[0].total).toLocaleString('fr-FR')} pts`,
      gagnes7j: `+${Number(gagnes.rows[0].total).toLocaleString('fr-FR')} pts`,
      reconvertis7j: `${Number(reconvertis.rows[0].total).toLocaleString('fr-FR')} pts`,
      paliers: `${reductionPoints}pts=${reductionFcfa}F · ${gratuitPoints}pts=gratuit`,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// POINTS JEGO — liste par voyageur, avec recherche
// ═══════════════════════════════════════════════════
async function pointsParVoyageur(req, res) {
  try {
    const { recherche } = req.query;
    const params = [];
    let filtre = '';
    if (recherche && recherche.trim().length > 0) {
      params.push(`%${recherche.trim()}%`);
      filtre = `WHERE v.nom ILIKE $1 OR v.prenom ILIKE $1 OR v.telephone ILIKE $1`;
    }

    const resultat = await pool.query(
      `SELECT v.id, v.nom, v.prenom, v.telephone, v.points_fidelite AS solde,
              COALESCE(SUM(jp.points) FILTER (WHERE jp.type = 'gain'), 0) AS gagnes,
              COALESCE(SUM(ABS(jp.points)) FILTER (WHERE jp.type = 'depense'), 0) AS utilises
       FROM voyageurs v
       LEFT JOIN jego_points jp ON jp.voyageur_id = v.id
       ${filtre}
       GROUP BY v.id, v.nom, v.prenom, v.telephone, v.points_fidelite
       ORDER BY v.points_fidelite DESC
       LIMIT 50`,
      params
    );

    res.json({
      voyageurs: resultat.rows.map((v) => ({
        id: v.id, nom: v.nom, prenom: v.prenom, telephone: v.telephone,
        solde: parseInt(v.solde), gagnes: parseInt(v.gagnes), utilises: parseInt(v.utilises),
      })),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// POINTS JEGO — derniers usages (gains et dépenses réels)
// ═══════════════════════════════════════════════════
async function usagesPoints(req, res) {
  try {
    const resultat = await pool.query(
      `SELECT jp.id, jp.motif, jp.type, jp.points, jp.cree_le,
              v.prenom || ' ' || v.nom AS voyageur
       FROM jego_points jp
       JOIN voyageurs v ON v.id = jp.voyageur_id
       ORDER BY jp.cree_le DESC
       LIMIT 30`
    );

    res.json({
      usages: resultat.rows.map((u) => {
        let type = 'Réduction';
        if (u.type === 'gain') type = 'Gain';
        else if ((u.motif || '').toLowerCase().includes('gratuit')) type = 'Billet gratuit';
        return {
          id: u.id,
          voyageur: u.voyageur,
          action: u.motif || (u.type === 'gain' ? 'Gain de points' : 'Utilisation de points'),
          type,
          points: parseInt(u.points),
          date: new Date(u.cree_le).toLocaleDateString('fr-FR'),
        };
      }),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// MODÉRATION — avis signalés par des voyageurs
// Motif générique pour l'instant : la table avis n'a pas de colonne pour
// stocker la raison du signalement, seulement qui a signalé et quand.
// ═══════════════════════════════════════════════════
async function moderationListe(req, res) {
  try {
    const jour = req.query.date || new Date().toISOString().slice(0, 10);

    const resultat = await pool.query(
      `SELECT av.id, av.commentaire, av.signale_le,
              v.prenom || ' ' || v.nom AS auteur,
              a.nom AS agence
       FROM avis av
       JOIN voyageurs v ON v.id = av.voyageur_id
       JOIN agences a ON a.id = av.agence_id
       WHERE av.statut = 'signale' AND av.signale_le::date = $1::date
       ORDER BY av.signale_le ASC`,
      [jour]
    );

    res.json({
      commentaires: resultat.rows.map((c) => ({
        id: c.id,
        texte: c.commentaire || '(sans commentaire écrit)',
        auteur: c.auteur,
        agence: c.agence,
        motif: 'Signalé par un voyageur',
        color: 'amber',
        primaryDanger: false,
      })),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// MODÉRATION — traiter un commentaire signalé
// La table avis n'a que 3 statuts possibles (visible / signale / supprime),
// donc "conserver" et "ignorer" ont le même effet réel : le commentaire
// redevient visible et sort de la file de modération.
// ═══════════════════════════════════════════════════
async function moderationTraiter(req, res) {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!['supprimer', 'conserver', 'ignorer'].includes(action)) {
      return res.status(400).json({ error: "Action invalide (supprimer, conserver ou ignorer attendu)" });
    }

    const check = await pool.query(`SELECT id FROM avis WHERE id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Commentaire introuvable' });
    }

    const nouveauStatut = action === 'supprimer' ? 'supprime' : 'visible';
    await pool.query(`UPDATE avis SET statut = $1 WHERE id = $2`, [nouveauStatut, id]);

    await journaliser({
      acteurType: 'membre_admin', acteurId: req.utilisateur.id,
      action: 'moderation_avis', details: { avis_id: id, decision: action },
      ipAddress: req.ip,
    });

    res.json({ message: `Commentaire ${action}`, id, statut: nouveauStatut });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// SÉCURITÉ — journal des actions sensibles (logs_systeme)
// ═══════════════════════════════════════════════════
async function listerLogs(req, res) {
  try {
    const jour = req.query.date || new Date().toISOString().slice(0, 10);

    const resultat = await pool.query(
      `SELECT ls.id, ls.action, ls.ip_address, ls.cree_le, ls.est_urgence,
              COALESCE(ma.prenom || ' ' || ma.nom, ag.nom, 'Système') AS auteur
       FROM logs_systeme ls
       LEFT JOIN membres_admin ma ON ls.acteur_type = 'membre_admin' AND ma.id = ls.acteur_id
       LEFT JOIN agences ag ON ls.acteur_type = 'agence' AND ag.id = ls.acteur_id
       WHERE ls.cree_le::date = $1::date
       ORDER BY ls.cree_le DESC`,
      [jour]
    );

    res.json({
      logs: resultat.rows.map((l) => ({
        horodatage: new Date(l.cree_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        action: l.action,
        auteur: l.auteur,
        ip: l.ip_address || '—',
      })),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  connexion, agencesEnAttente, validerAgence, refuserAgence,
  listerParametres, modifierParametre,
  listerVoyageurs, modifierStatutVoyageur,
  listerFrais, modifierGrilleFrais, creerDerogationFrais, supprimerDerogationFrais,
  listerAgences,
  listerTrajetsAdmin, resumeTrajetsAdmin,
  resumeFinances, serieFinances, transactionsFinances,
  derniereTransaction, resumeJournal, tachesATraiter,
  resumePoints, pointsParVoyageur, usagesPoints,
  moderationListe, moderationTraiter,
  listerLogs
};