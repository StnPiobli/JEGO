const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { genererToken } = require('../utils/jwt');
const { localiserIp, ipClient } = require('../utils/geoip');
const { verifierJetonGoogle } = require('../utils/google');
const { normaliserTelephone } = require('../utils/telephone');
const { genererIdentifiant } = require('../utils/identifiant');
const crypto = require('crypto');
const { envoyerEmailDirect } = require('../services/notificationService');

/// Écritures possibles d'un même numéro. Les comptes anciens ont été
/// enregistrés tels que tapés — avec ou sans indicatif, avec ou sans
/// espaces — et un voyageur ne peut pas deviner laquelle est la sienne.
function formesDuNumero(saisie) {
  const brut = String(saisie || '').replace(/[^0-9]/g, '');
  const normalise = normaliserTelephone(saisie).replace(/[^0-9]/g, '');
  const national = normalise.startsWith('237') ? normalise.slice(3) : normalise;
  return [...new Set([brut, normalise, national].filter(Boolean))];
}

// ═══════════════════════════════════════════════════
// INSCRIPTION D'UN VOYAGEUR
// ═══════════════════════════════════════════════════
async function inscription(req, res) {
  try {
    const {
      nom, prenom, date_naissance, lieu_naissance,
      telephone, email, mot_de_passe, contact_urgence
    } = req.body;

    if (!nom || !prenom || !date_naissance || !lieu_naissance || !telephone || !email || !mot_de_passe) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
    }

    // Numéro mis en forme AVANT enregistrement, et doublon cherché sur
    // toutes ses écritures : sans cela le même numéro entrait plusieurs
    // fois sous des formes différentes, et son propriétaire ne pouvait
    // plus se connecter qu'en reproduisant exactement celle de son
    // inscription.
    const telNormalise = normaliserTelephone(telephone);
    const emailNormalise = String(email).trim().toLowerCase();

    const telExiste = await pool.query(
      `SELECT id FROM voyageurs
       WHERE REGEXP_REPLACE(telephone, '[^0-9]', '', 'g') = ANY($1)`,
      [formesDuNumero(telephone)]
    );
    if (telExiste.rows.length > 0) {
      return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    const emailExiste = await pool.query(
      'SELECT id FROM voyageurs WHERE LOWER(email) = $1', [emailNormalise]);
    if (emailExiste.rows.length > 0) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    const motDePasseChiffre = await bcrypt.hash(mot_de_passe, 10);

    const resultat = await pool.query(
      `INSERT INTO voyageurs
        (nom, prenom, date_naissance, lieu_naissance, telephone, email, mot_de_passe, contact_urgence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nom, prenom, telephone, email, points_fidelite`,
      [nom, prenom, date_naissance, lieu_naissance, telNormalise, emailNormalise, motDePasseChiffre, contact_urgence]
    );

    const voyageur = resultat.rows[0];
    const token = genererToken({ id: voyageur.id, type: 'voyageur' });
    pool.query('UPDATE voyageurs SET derniere_connexion = NOW() WHERE id = $1', [voyageur.id]).catch(() => {});
    (async () => {
      try {
        const ip = ipClient(req);
        const ins = await pool.query(
          "INSERT INTO connexions_log (voyageur_id, type, ip) VALUES ($1, 'connexion', $2) RETURNING id",
          [voyageur.id, ip]
        );
        const lieu = await localiserIp(ip);
        if (lieu) await pool.query('UPDATE connexions_log SET lieu = $1 WHERE id = $2', [lieu, ins.rows[0].id]);
      } catch (_) {}
    })();

    res.status(201).json({
      message: 'Inscription réussie',
      voyageur,
      token
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// CONNEXION D'UN VOYAGEUR
// ═══════════════════════════════════════════════════
async function connexion(req, res) {
  try {
    // `identifiant` accepte le téléphone comme l'email. `telephone`
    // reste accepté pour ne pas casser les versions déjà installées.
    const { identifiant, telephone, mot_de_passe } = req.body;
    const saisie = String(identifiant || telephone || '').trim();

    if (!saisie || !mot_de_passe) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
    }

    const resultat = await pool.query(
      `SELECT * FROM voyageurs
       WHERE REGEXP_REPLACE(telephone, '[^0-9]', '', 'g') = ANY($1)
          OR LOWER(email) = LOWER($2)
       LIMIT 1`,
      [formesDuNumero(saisie), saisie]
    );

    if (resultat.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const voyageur = resultat.rows[0];

    // Compte créé par Google : il n'a pas de mot de passe. On le dit,
    // plutôt que de laisser bcrypt échouer sur une valeur nulle.
    if (!voyageur.mot_de_passe) {
      return res.status(401).json({
        error: 'Ce compte se connecte avec Google. Utilisez le bouton Google.'
      });
    }

    const motDePasseValide = await bcrypt.compare(mot_de_passe, voyageur.mot_de_passe);

    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const token = genererToken({ id: voyageur.id, type: 'voyageur' });
    pool.query('UPDATE voyageurs SET derniere_connexion = NOW() WHERE id = $1', [voyageur.id]).catch(() => {});
    (async () => {
      try {
        const ip = ipClient(req);
        const ins = await pool.query(
          "INSERT INTO connexions_log (voyageur_id, type, ip) VALUES ($1, 'connexion', $2) RETURNING id",
          [voyageur.id, ip]
        );
        const lieu = await localiserIp(ip);
        if (lieu) await pool.query('UPDATE connexions_log SET lieu = $1 WHERE id = $2', [lieu, ins.rows[0].id]);
      } catch (_) {}
    })();

    res.json({
      message: 'Connexion réussie',
      voyageur: {
        id: voyageur.id,
        nom: voyageur.nom,
        prenom: voyageur.prenom,
        telephone: voyageur.telephone,
        email: voyageur.email,
        points_fidelite: voyageur.points_fidelite
      },
      token
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// VOIR SON PROFIL (route protégée)
// ═══════════════════════════════════════════════════
async function monProfil(req, res) {
  try {
    const voyageurId = req.utilisateur.id;

    const resultat = await pool.query(
      `SELECT id, nom, prenom, date_naissance, lieu_naissance,
              telephone, email, contact_urgence, points_fidelite,
              langue, mode_sombre, mode_eco_donnees, avis_avec_nom, cree_le
       FROM voyageurs WHERE id = $1`,
      [voyageurId]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({ error: 'Voyageur introuvable' });
    }

    res.json({ voyageur: resultat.rows[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// MODIFIER SON PROFIL (route protégée)
// ═══════════════════════════════════════════════════
async function modifierProfil(req, res) {
  try {
    const voyageurId = req.utilisateur.id;
    const { nom, prenom, email, contact_urgence, langue, mode_sombre, mode_eco_donnees, avis_avec_nom } = req.body;

    const actuel = await pool.query('SELECT * FROM voyageurs WHERE id = $1', [voyageurId]);
    if (actuel.rows.length === 0) {
      return res.status(404).json({ error: 'Voyageur introuvable' });
    }
    const voyageur = actuel.rows[0];

    const nomChange = (nom && nom !== voyageur.nom) || (prenom && prenom !== voyageur.prenom);
    if (nomChange && voyageur.dernier_changement_nom) {
      const dernierChangement = new Date(voyageur.dernier_changement_nom);
      const sixMois = new Date();
      sixMois.setMonth(sixMois.getMonth() - 6);
      if (dernierChangement > sixMois) {
        return res.status(403).json({
          error: 'Le nom ne peut être modifié qu\'une fois tous les 6 mois.'
        });
      }
    }

    if (email && email !== voyageur.email) {
      const emailExiste = await pool.query(
        'SELECT id FROM voyageurs WHERE email = $1 AND id != $2',
        [email, voyageurId]
      );
      if (emailExiste.rows.length > 0) {
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }
    }

    const nouveauNom = nom || voyageur.nom;
    const nouveauPrenom = prenom || voyageur.prenom;
    const nouvelEmail = email || voyageur.email;
    const nouveauContact = contact_urgence !== undefined ? contact_urgence : voyageur.contact_urgence;
    const nouvelleLangue = langue || voyageur.langue;
    const nouveauModeSombre = mode_sombre !== undefined ? mode_sombre : voyageur.mode_sombre;
    const nouveauModeEco = mode_eco_donnees !== undefined ? mode_eco_donnees : voyageur.mode_eco_donnees;
    const nouveauAvisAvecNom =
        avis_avec_nom !== undefined ? avis_avec_nom === true : voyageur.avis_avec_nom;

    const resultat = await pool.query(
      `UPDATE voyageurs SET
        nom = $1, prenom = $2, email = $3, contact_urgence = $4,
        langue = $5, mode_sombre = $6, mode_eco_donnees = $7,
        avis_avec_nom = $8,
        dernier_changement_nom = ${nomChange ? 'NOW()' : 'dernier_changement_nom'},
        mis_a_jour_le = NOW()
       WHERE id = $9
       RETURNING id, nom, prenom, email, contact_urgence, langue, mode_sombre, mode_eco_donnees, avis_avec_nom, points_fidelite`,
      [nouveauNom, nouveauPrenom, nouvelEmail, nouveauContact, nouvelleLangue, nouveauModeSombre, nouveauModeEco, nouveauAvisAvecNom, voyageurId]
    );

    res.json({
      message: 'Profil mis à jour',
      voyageur: resultat.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// HISTORIQUE DES VOYAGES (voyageur connecté)
// ═══════════════════════════════════════════════════

// Deconnexion du voyageur : journalise la fin de session pour les
// statistiques d'activite. Best-effort, jamais bloquant.
async function deconnexion(req, res) {
  try {
    pool.query("INSERT INTO connexions_log (voyageur_id, type) VALUES ($1, 'deconnexion')", [req.utilisateur.id]).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: true });
  }
}

async function historiqueVoyages(req, res) {
  try {
    const voyageurId = req.utilisateur.id;

    const resultat = await pool.query(
      `SELECT DISTINCT
          b.id AS billet_id, b.numero, b.statut, b.prix_total_client,
          b.est_cadeau, b.qr_code, b.trajet_id, b.est_flexible,
          b.supplement_bagage, b.prix_agence, b.marge_jego,
          TO_CHAR(t.date_depart, 'YYYY-MM-DD') AS date_depart, t.heure_depart, t.heure_arrivee_reelle,
          t.heure_arrivee_estimee, t.categorie,
          t.statut AS statut_trajet,
          -- Villes du TRONCON achete, avec repli sur les bornes de la
          -- ligne pour les billets anterieurs aux lignes multi-arrets.
          COALESCE(vdt.nom_affiche, vd.nom_affiche) AS depart,
          COALESCE(vat.nom_affiche, va.nom_affiche) AS arrivee,
          lpd.lieu_prise_en_charge AS lieu_depart,
          lpa.lieu_prise_en_charge AS lieu_arrivee,
          -- Heure de passage a l'arret d'embarquement : sur un troncon,
          -- le bus ne part pas a l'heure de depart de la ligne.
          COALESCE(lpd.heure_arrivee_estimee, t.heure_depart) AS heure_troncon,
          COALESCE(lpa.heure_arrivee_estimee, t.heure_arrivee_estimee) AS heure_arrivee_troncon,
          a.id AS agence_id, a.nom AS nom_agence,
          bus.climatisation, bus.prises_usb, bus.wifi, bus.toilettes,
          s.numero AS siege,
          -- Titulaire du billet : pour un cadeau, c'est le destinataire.
          vp.prenom AS passager_prenom, vp.nom AS passager_nom,
          vp.telephone AS passager_tel, vp.email AS passager_email,
          -- Arrets intermediaires du troncon achete, pas de la ligne
          -- entiere : c'est ce qui dit si CE billet est un express.
          (SELECT COUNT(*) FROM ligne_points lp
            WHERE lp.ligne_id = l.id
              AND lp.ordre > COALESCE(b.point_embarquement_ordre, 0)
              AND lp.ordre < COALESCE(b.point_debarquement_ordre, 1)
          ) AS nombre_arrets,
          (SELECT COUNT(*) FROM arrivees_arrets aa
            WHERE aa.trajet_id = t.id
              AND aa.ordre > COALESCE(b.point_embarquement_ordre, 0)
              AND aa.ordre < COALESCE(b.point_debarquement_ordre, 1)
          ) AS arrets_declares,
          (b.est_cadeau = true AND p.voyageur_id != $1) AS recu_en_cadeau,
          (SELECT COUNT(*) FROM avis WHERE trajet_id = b.trajet_id AND voyageur_id = b.voyageur_id) > 0 AS deja_note
       FROM billets b
       JOIN trajets t ON t.id = b.trajet_id
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       LEFT JOIN ligne_points lpd
         ON lpd.ligne_id = l.id AND lpd.ordre = b.point_embarquement_ordre
       LEFT JOIN ligne_points lpa
         ON lpa.ligne_id = l.id AND lpa.ordre = b.point_debarquement_ordre
       LEFT JOIN villes vdt ON vdt.code = lpd.ville
       LEFT JOIN villes vat ON vat.code = lpa.ville
       JOIN agences a ON a.id = b.agence_id
       JOIN bus ON bus.id = t.bus_id
       JOIN sieges s ON s.id = b.siege_id
       JOIN voyageurs vp ON vp.id = b.voyageur_id
       LEFT JOIN paiements p ON p.billet_id = b.id
       WHERE b.voyageur_id = $1 OR p.voyageur_id = $1
       ORDER BY TO_CHAR(t.date_depart, 'YYYY-MM-DD') DESC, t.heure_depart DESC`,
      [voyageurId]
    );

    res.json({
      nombre_voyages: resultat.rows.length,
      voyages: resultat.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// ═══════════════════════════════════════════════════
// CONNEXION PAR COMPTE GOOGLE
//
// Trois cas, dans cet ordre :
//   1. l'identifiant Google est déjà connu    -> on ouvre la session ;
//   2. l'email correspond à un compte existant -> on rattache Google à
//      ce compte, plutôt que d'en créer un second qui séparerait les
//      billets de la même personne en deux ;
//   3. personne ne correspond -> il faut créer, donc il faut un numéro
//      de téléphone, que Google ne donne jamais. On le réclame à
//      l'application au lieu d'inventer une valeur.
// ═══════════════════════════════════════════════════
async function connexionGoogle(req, res) {
  try {
    const { jeton, telephone } = req.body;

    let identite;
    try {
      identite = await verifierJetonGoogle(jeton, process.env.GOOGLE_CLIENT_ID);
    } catch (e) {
      return res.status(401).json({ error: e.message });
    }

    // Un email non vérifié par Google ne prouve rien : quelqu'un
    // pourrait avoir déclaré l'adresse d'un autre.
    if (!identite.email_verifie) {
      return res.status(403).json({
        error: "Cette adresse Google n'est pas vérifiée. Vérifiez-la chez Google, puis réessayez."
      });
    }

    const ouvrirSession = (voyageur) => {
      const token = genererToken({ id: voyageur.id, type: 'voyageur' });
    pool.query('UPDATE voyageurs SET derniere_connexion = NOW() WHERE id = $1', [voyageur.id]).catch(() => {});
    (async () => {
      try {
        const ip = ipClient(req);
        const ins = await pool.query(
          "INSERT INTO connexions_log (voyageur_id, type, ip) VALUES ($1, 'connexion', $2) RETURNING id",
          [voyageur.id, ip]
        );
        const lieu = await localiserIp(ip);
        if (lieu) await pool.query('UPDATE connexions_log SET lieu = $1 WHERE id = $2', [lieu, ins.rows[0].id]);
      } catch (_) {}
    })();
      res.json({
        message: 'Connexion réussie',
        token,
        voyageur: {
          id: voyageur.id,
          numero: voyageur.numero,
          nom: voyageur.nom,
          prenom: voyageur.prenom,
          telephone: voyageur.telephone,
          email: voyageur.email,
          points_fidelite: voyageur.points_fidelite
        }
      });
    };

    // 1. Déjà connu par son identifiant Google
    const parGoogle = await pool.query(
      'SELECT * FROM voyageurs WHERE google_id = $1', [identite.google_id]);
    if (parGoogle.rows.length > 0) return ouvrirSession(parGoogle.rows[0]);

    // 2. Même email : on rattache au lieu de dupliquer
    const parEmail = await pool.query(
      'SELECT * FROM voyageurs WHERE LOWER(email) = $1', [identite.email]);
    if (parEmail.rows.length > 0) {
      const maj = await pool.query(
        `UPDATE voyageurs SET google_id = $1, email_verifie = true, mis_a_jour_le = NOW()
         WHERE id = $2 RETURNING *`,
        [identite.google_id, parEmail.rows[0].id]
      );
      return ouvrirSession(maj.rows[0]);
    }

    // 3. Création : le téléphone est indispensable
    if (!telephone) {
      return res.json({
        inscription_a_completer: true,
        message: 'Il ne manque que votre numéro de téléphone.',
        email: identite.email,
        prenom: identite.prenom,
        nom: identite.nom
      });
    }

    const telNormalise = normaliserTelephone(telephone);
    const dejaPris = await pool.query(
      `SELECT id FROM voyageurs
       WHERE RIGHT(REGEXP_REPLACE(telephone, '[^0-9]', '', 'g'), 9) = RIGHT($1, 9)`,
      [telNormalise]
    );
    if (dejaPris.rows.length > 0) {
      return res.status(409).json({
        error: 'Ce numéro est déjà utilisé par un autre compte. Connectez-vous avec, ou utilisez un autre numéro.'
      });
    }

    const cree = await pool.query(
      `INSERT INTO voyageurs (numero, nom, prenom, telephone, email, google_id, email_verifie)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [genererIdentifiant('CLI'), identite.nom || '-', identite.prenom || '-',
       telNormalise, identite.email, identite.google_id]
    );
    return ouvrirSession(cree.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// ═══════════════════════════════════════════════════
// MOT DE PASSE OUBLIÉ — DEMANDE D'UN CODE
//
// La réponse est TOUJOURS la même, que le compte existe ou non. Sinon
// cette route dirait à n'importe qui si un numéro est inscrit chez
// JEGO, et permettrait d'en dresser la liste.
//
// Le code part par email : c'est le seul canal branché. Un compte sans
// adresse ne reçoit donc rien, et on ne le dit pas non plus.
// ═══════════════════════════════════════════════════
async function demanderReinitialisation(req, res) {
  const reponseNeutre = {
    message: "Si un compte correspond, un code vient d'être envoyé à l'adresse email associée."
  };
  try {
    const { identifiant } = req.body;
    if (!identifiant || !String(identifiant).trim()) {
      return res.status(400).json({ error: 'Entrez votre numéro de téléphone ou votre email.' });
    }
    const saisie = String(identifiant).trim();

    const compte = await pool.query(
      `SELECT id, prenom, email FROM voyageurs
       WHERE REGEXP_REPLACE(telephone, '[^0-9]', '', 'g') = ANY($1)
          OR LOWER(email) = LOWER($2)
       LIMIT 1`,
      [formesDuNumero(saisie), saisie]
    );
    if (compte.rows.length === 0 || !compte.rows[0].email) {
      return res.json(reponseNeutre);
    }
    const v = compte.rows[0];

    // Les codes encore valides du même compte sont invalidés : une
    // nouvelle demande doit rendre l'ancien code inutilisable.
    await pool.query(
      `UPDATE reinitialisations_mot_de_passe SET utilise_le = NOW()
       WHERE voyageur_id = $1 AND utilise_le IS NULL`,
      [v.id]
    );

    const code = String(crypto.randomInt(100000, 1000000));
    await pool.query(
      `INSERT INTO reinitialisations_mot_de_passe (voyageur_id, code_hash, expire_le)
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
      [v.id, await bcrypt.hash(code, 10)]
    );

    envoyerEmailDirect(
      v.email,
      'Votre code de réinitialisation JEGO',
      `Bonjour ${v.prenom || ''},

Voici votre code pour choisir un nouveau mot de passe :

    ${code}

Il est valable 15 minutes et ne sert qu'une fois.

Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.

JEGO`
    ).catch(() => {});

    return res.json(reponseNeutre);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// MOT DE PASSE OUBLIÉ — NOUVEAU MOT DE PASSE
// ═══════════════════════════════════════════════════
async function reinitialiserMotDePasse(req, res) {
  try {
    const { identifiant, code, nouveau_mot_de_passe } = req.body;
    if (!identifiant || !code || !nouveau_mot_de_passe) {
      return res.status(400).json({ error: 'Identifiant, code et nouveau mot de passe sont requis.' });
    }
    if (String(nouveau_mot_de_passe).length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères.' });
    }
    const saisie = String(identifiant).trim();

    const compte = await pool.query(
      `SELECT id FROM voyageurs
       WHERE REGEXP_REPLACE(telephone, '[^0-9]', '', 'g') = ANY($1)
          OR LOWER(email) = LOWER($2)
       LIMIT 1`,
      [formesDuNumero(saisie), saisie]
    );
    // Message unique pour tous les échecs : ne rien apprendre à qui
    // essaie des codes au hasard.
    const echec = { error: 'Code invalide ou expiré. Demandez-en un nouveau.' };
    if (compte.rows.length === 0) return res.status(400).json(echec);

    const demande = await pool.query(
      `SELECT id, code_hash, tentatives FROM reinitialisations_mot_de_passe
       WHERE voyageur_id = $1 AND utilise_le IS NULL AND expire_le > NOW()
       ORDER BY cree_le DESC LIMIT 1`,
      [compte.rows[0].id]
    );
    if (demande.rows.length === 0) return res.status(400).json(echec);
    const d = demande.rows[0];

    // Un code à six chiffres se devine en un million d'essais : on
    // ferme la demande avant d'en arriver là.
    if (d.tentatives >= 5) {
      await pool.query(
        'UPDATE reinitialisations_mot_de_passe SET utilise_le = NOW() WHERE id = $1', [d.id]);
      return res.status(429).json({
        error: 'Trop de tentatives. Demandez un nouveau code.'
      });
    }

    if (!(await bcrypt.compare(String(code).trim(), d.code_hash))) {
      await pool.query(
        'UPDATE reinitialisations_mot_de_passe SET tentatives = tentatives + 1 WHERE id = $1', [d.id]);
      return res.status(400).json(echec);
    }

    await pool.query(
      'UPDATE voyageurs SET mot_de_passe = $1, mis_a_jour_le = NOW() WHERE id = $2',
      [await bcrypt.hash(nouveau_mot_de_passe, 10), compte.rows[0].id]
    );
    await pool.query(
      'UPDATE reinitialisations_mot_de_passe SET utilise_le = NOW() WHERE id = $1', [d.id]);

    res.json({ message: 'Mot de passe modifié. Vous pouvez vous connecter.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// ═══════════════════════════════════════════════════
// NOTIFICATIONS DU VOYAGEUR
//
// Elles sont déjà écrites en base par le reste de l'application —
// confirmation de billet, remboursement, réponse à un litige, arrivée
// déclarée. Il ne manquait qu'une route pour les lire.
// ═══════════════════════════════════════════════════
async function mesNotifications(req, res) {
  try {
    if (req.utilisateur.type !== 'voyageur') {
      return res.status(403).json({ error: 'Accès réservé aux voyageurs' });
    }
    const resultat = await pool.query(
      `SELECT id, type, titre, contenu, lu, cree_le
       FROM notifications
       WHERE destinataire_type = 'voyageur' AND destinataire_id = $1
       ORDER BY cree_le DESC
       LIMIT 50`,
      [req.utilisateur.id]
    );
    res.json({
      notifications: resultat.rows,
      non_lues: resultat.rows.filter((n) => !n.lu).length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function marquerNotificationsLues(req, res) {
  try {
    if (req.utilisateur.type !== 'voyageur') {
      return res.status(403).json({ error: 'Accès réservé aux voyageurs' });
    }
    // Un identifiant précis marque une seule notification ; sans lui,
    // toutes celles du voyageur.
    const { id } = req.params;
    await pool.query(
      `UPDATE notifications SET lu = true
       WHERE destinataire_type = 'voyageur' AND destinataire_id = $1
         AND ($2::uuid IS NULL OR id = $2::uuid)`,
      [req.utilisateur.id, id || null]
    );
    res.json({ message: 'Notifications marquées comme lues' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function supprimerNotifications(req, res) {
  try {
    if (req.utilisateur.type !== 'voyageur') {
      return res.status(403).json({ error: 'Accès réservé aux voyageurs' });
    }
    const { id } = req.params;
    // La condition sur le destinataire est ce qui empêche de supprimer
    // la notification de quelqu'un d'autre en devinant son identifiant.
    const r = await pool.query(
      `DELETE FROM notifications
       WHERE destinataire_type = 'voyageur' AND destinataire_id = $1
         AND ($2::uuid IS NULL OR id = $2::uuid)
       RETURNING id`,
      [req.utilisateur.id, id || null]
    );
    res.json({ message: `${r.rows.length} notification(s) supprimée(s)` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}



// ═══════════════════════════════════════════════════
// RECUPERATION D'UN BILLET
//
// Cahier des charges §6.6 : retrouver un billet sur un autre appareil.
// Le seul element demande est le NUMERO du billet (BIL-XXXXX-XXXXX) :
// il est imprevisible (30^10 combinaisons) et voyage deja avec le QR,
// donc le connaitre suffit -- exiger en plus le telephone n'ajoutait
// pas de securite reelle et empechait le partage legitime. Aucune
// connexion requise, et le meme billet peut ainsi vivre sur plusieurs
// telephones (acheteur + destinataire d'un cadeau, famille...).
//
// Le billet renvoye a EXACTEMENT la meme forme que dans l'historique :
// le meme QR signe, les villes et heures du troncon.
// ═══════════════════════════════════════════════════
async function recupererBillet(req, res) {
  try {
    const numero = (req.body.numero || '').trim().toUpperCase();

    if (!numero) {
      return res.status(400).json({ error: 'Entrez le numero du billet.' });
    }

    const resultat = await pool.query(
      `SELECT
          b.id AS billet_id, b.numero, b.statut, b.prix_total_client,
          b.est_cadeau, b.qr_code, b.trajet_id, b.est_flexible,
          b.supplement_bagage,
          TO_CHAR(t.date_depart, 'YYYY-MM-DD') AS date_depart,
          t.heure_depart, t.heure_arrivee_reelle, t.heure_arrivee_estimee,
          t.categorie, t.statut AS statut_trajet,
          COALESCE(vdt.nom_affiche, vd.nom_affiche) AS depart,
          COALESCE(vat.nom_affiche, va.nom_affiche) AS arrivee,
          lpd.lieu_prise_en_charge AS lieu_depart,
          lpa.lieu_prise_en_charge AS lieu_arrivee,
          COALESCE(lpd.heure_arrivee_estimee, t.heure_depart) AS heure_troncon,
          COALESCE(lpa.heure_arrivee_estimee, t.heure_arrivee_estimee) AS heure_arrivee_troncon,
          a.id AS agence_id, a.nom AS nom_agence,
          bus.climatisation, bus.prises_usb, bus.wifi, bus.toilettes,
          s.numero AS siege,
          vp.prenom AS passager_prenom, vp.nom AS passager_nom,
          vp.telephone AS passager_tel, vp.email AS passager_email,
          (SELECT COUNT(*) FROM ligne_points lp
            WHERE lp.ligne_id = l.id
              AND lp.ordre > COALESCE(b.point_embarquement_ordre, 0)
              AND lp.ordre < COALESCE(b.point_debarquement_ordre, 1)
          ) AS nombre_arrets,
          (SELECT COUNT(*) FROM arrivees_arrets aa
            WHERE aa.trajet_id = t.id
              AND aa.ordre > COALESCE(b.point_embarquement_ordre, 0)
              AND aa.ordre < COALESCE(b.point_debarquement_ordre, 1)
          ) AS arrets_declares
       FROM billets b
       JOIN trajets t ON t.id = b.trajet_id
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       LEFT JOIN ligne_points lpd
         ON lpd.ligne_id = l.id AND lpd.ordre = b.point_embarquement_ordre
       LEFT JOIN ligne_points lpa
         ON lpa.ligne_id = l.id AND lpa.ordre = b.point_debarquement_ordre
       LEFT JOIN villes vdt ON vdt.code = lpd.ville
       LEFT JOIN villes vat ON vat.code = lpa.ville
       JOIN agences a ON a.id = b.agence_id
       JOIN bus ON bus.id = t.bus_id
       JOIN sieges s ON s.id = b.siege_id
       JOIN voyageurs vp ON vp.id = b.voyageur_id
       WHERE b.numero = $1`,
      [numero]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({
        error: 'Aucun billet ne correspond a ce numero.'
      });
    }

    res.json({ billet: resultat.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// PORTEFEUILLE
//
// Il n'y a pas de table « portefeuille » : le solde d'un voyageur est
// la somme de ses remboursements traités. C'est volontaire — un
// portefeuille est un registre, pas un nombre stocké quelque part que
// deux écritures concurrentes pourraient désynchroniser du réel.
//
// Aucun débit n'existe encore : rien, dans le paiement, ne consomme ce
// solde. Le montant renvoyé est donc le total remboursé, et l'écran
// mobile le présente comme tel plutôt que comme un crédit dépensable.
// ═══════════════════════════════════════════════════
async function monPortefeuille(req, res) {
  try {
    const voyageurId = req.utilisateur.id;

    const resultat = await pool.query(
      `SELECT r.id, r.montant, r.motif, r.pourcentage, r.reference,
              r.statut, r.traite_le, r.cree_le,
              b.numero AS numero_billet,
              vd.nom_affiche AS depart, va.nom_affiche AS arrivee
         FROM remboursements r
         LEFT JOIN billets b ON b.id = r.billet_id
         LEFT JOIN trajets t ON t.id = b.trajet_id
         LEFT JOIN lignes l ON l.id = t.ligne_id
         LEFT JOIN villes vd ON vd.code = l.ville_depart
         LEFT JOIN villes va ON va.code = l.ville_arrivee
        WHERE r.voyageur_id = $1
        ORDER BY COALESCE(r.traite_le, r.cree_le) DESC`,
      [voyageurId]
    );

    // Seuls les remboursements réellement traités comptent dans le
    // total : annoncer un montant encore en cours de versement
    // reviendrait à promettre de l'argent qui n'est pas parti.
    const solde = resultat.rows
      .filter((r) => r.statut === 'traite')
      .reduce((somme, r) => somme + Number(r.montant), 0);

    res.json({
      solde,
      mouvements: resultat.rows.map((r) => ({
        id: r.id,
        montant: Number(r.montant),
        motif: r.motif,
        pourcentage: r.pourcentage,
        reference: r.reference,
        statut: r.statut,
        numero_billet: r.numero_billet,
        depart: r.depart,
        arrivee: r.arrivee,
        date: r.traite_le || r.cree_le
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { inscription, connexion, connexionGoogle, mesNotifications, marquerNotificationsLues, supprimerNotifications, demanderReinitialisation, reinitialiserMotDePasse, monProfil, modifierProfil, historiqueVoyages, monPortefeuille, recupererBillet, deconnexion };