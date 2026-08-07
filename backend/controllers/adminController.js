const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { genererToken } = require('../utils/jwt');
const { creerNotification } = require('../services/notificationService');

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
          t.statut, t.retard_minutes,
          a.nom AS agence,
          vd.nom_affiche AS depart_affiche,
          va.nom_affiche AS arrivee_affiche,
          l.id AS ligne_id,
          (SELECT COUNT(*) FROM sieges s
            WHERE s.bus_id = t.bus_id
              AND s.statut NOT IN ('supprime_toilettes', 'desactive')) AS places_totales,
          (SELECT COUNT(*) FROM billets b
            WHERE b.trajet_id = t.id AND b.statut IN ('confirme', 'utilise')) AS places_vendues,
          (SELECT COUNT(*) FROM billets b
            WHERE b.trajet_id = t.id AND b.statut IN ('confirme', 'utilise')
              AND b.source_vente = 'en_ligne') AS vendus_app,
          (SELECT COUNT(*) FROM billets b
            WHERE b.trajet_id = t.id AND b.statut IN ('confirme', 'utilise')
              AND b.source_vente = 'physique') AS vendus_guichet
       FROM trajets t
       JOIN agences a ON a.id = t.agence_id
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
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

module.exports = {
  connexion, agencesEnAttente, validerAgence, refuserAgence,
  listerParametres, modifierParametre,
  listerVoyageurs, modifierStatutVoyageur,
  listerFrais, modifierGrilleFrais, creerDerogationFrais, supprimerDerogationFrais,
  listerAgences,
  listerTrajetsAdmin, resumeTrajetsAdmin
};