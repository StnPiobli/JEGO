const pool = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { genererToken } = require('../utils/jwt');
const { appliquerBaremeRetard } = require('../services/retardService');
const { creerNotification } = require('../services/notificationService');
const { normaliserTelephone } = require('../utils/telephone');

// ═══════════════════════════════════════════════════
// CRÉER UN COMPTE CHAUFFEUR (par l'agence uniquement)
// ═══════════════════════════════════════════════════
async function creerChauffeur(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const {
      nom, prenom, email, date_naissance, lieu_naissance,
      telephone, mot_de_passe
    } = req.body;

    // Vérifier les champs obligatoires
    if (!nom || !prenom || !email || !date_naissance || !lieu_naissance || !telephone || !mot_de_passe) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
    }

    // Numéro mis en forme AVANT enregistrement : sans cela le même
    // numéro se retrouve en base sous plusieurs écritures selon ce que
    // l'agence a tapé, et le chauffeur ne peut plus se connecter qu'en
    // reproduisant exactement la sienne.
    const telNormalise = normaliserTelephone(telephone);

    // Doublon cherché sur les 9 chiffres finaux, pour rattraper les
    // comptes déjà enregistrés dans un autre format.
    const telExiste = await pool.query(
      `SELECT id FROM chauffeurs
       WHERE RIGHT(REGEXP_REPLACE(telephone, '[^0-9]', '', 'g'), 9) = RIGHT($1, 9)`,
      [telNormalise]
    );
    if (telExiste.rows.length > 0) {
      return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé par un chauffeur' });
    }

    // Chiffrer le mot de passe
    const motDePasseChiffre = await bcrypt.hash(mot_de_passe, 10);

    // Créer le chauffeur, rattaché à l'agence
    const resultat = await pool.query(
      `INSERT INTO chauffeurs
        (agence_id, nom, prenom, email, date_naissance, lieu_naissance, telephone, mot_de_passe)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nom, prenom, email, telephone, statut`,
      [agenceId, nom, prenom, email, date_naissance, lieu_naissance, telNormalise, motDePasseChiffre]
    );

    res.status(201).json({
      message: 'Compte chauffeur créé avec succès',
      chauffeur: resultat.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// LISTER LES CHAUFFEURS DE L'AGENCE
// ═══════════════════════════════════════════════════
async function listerChauffeurs(req, res) {
  try {
    const agenceId = req.utilisateur.id;

    const resultat = await pool.query(
      `SELECT c.id, c.nom, c.prenom, c.telephone, c.email, c.statut, c.note_moyenne, c.desactive_urgence, c.date_naissance,
              COALESCE(voyages.nb, 0) AS nombre_voyages
       FROM chauffeurs c
       LEFT JOIN LATERAL (
                SELECT COUNT(*) AS nb FROM trajets WHERE chauffeur_id = c.id AND statut = 'termine'
       ) voyages ON true
       WHERE c.agence_id = $1 AND c.statut != 'supprime'
       ORDER BY c.nom, c.prenom`,
      [agenceId]
    );

    res.json({ chauffeurs: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// CONNEXION D'UN CHAUFFEUR (par téléphone)
// ═══════════════════════════════════════════════════
async function connexionChauffeur(req, res) {
  try {
    // `identifiant` accepte le téléphone comme l'email. `telephone`
    // reste accepté pour ne pas casser les versions déjà installées.
    const { identifiant, telephone, mot_de_passe } = req.body;
    const saisie = (identifiant || telephone || '').trim();

    if (!saisie || !mot_de_passe) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
    }

    // Les numéros ont été enregistrés dans tous les formats possibles
    // (« +237 678787823 », « 237699888777 »…) parce que rien ne les
    // mettait en forme à la création. On compare donc les 9 chiffres
    // finaux, seuls stables : l'indicatif, le plus et les espaces ne
    // décident plus si un chauffeur peut se connecter.
    const telNormalise = normaliserTelephone(saisie);
    const resultat = await pool.query(
      `SELECT * FROM chauffeurs
       WHERE RIGHT(REGEXP_REPLACE(telephone, '[^0-9]', '', 'g'), 9) = RIGHT($1, 9)
          OR LOWER(email) = LOWER($2)
       LIMIT 1`,
      [telNormalise, saisie]
    );

    if (resultat.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const chauffeur = resultat.rows[0];

    // Bloquer si le compte a été désactivé en urgence
    if (chauffeur.desactive_urgence) {
      return res.status(403).json({ error: 'Ce compte a été désactivé. Contactez votre agence.' });
    }

    // Vérifier le mot de passe
    const motDePasseValide = await bcrypt.compare(mot_de_passe, chauffeur.mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    // Générer un token de type chauffeur
    const token = genererToken({ id: chauffeur.id, type: 'chauffeur' });

    res.json({
      message: 'Connexion réussie',
      chauffeur: {
        id: chauffeur.id,
        nom: chauffeur.nom,
        prenom: chauffeur.prenom,
        telephone: chauffeur.telephone
      },
      token
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// VOIR SES TRAJETS (chauffeur connecté)
// 3 états pour le nombre de passagers :
//   - avant H-30          → rien (vente en cours)
//   - à H-30              → provisoire (guichet peut vendre)
//   - départ déclaré      → définitif (liste figée)
// ═══════════════════════════════════════════════════
async function mesTrajets(req, res) {
  try {
    const chauffeurId = req.utilisateur.id;

    if (req.utilisateur.type !== 'chauffeur') {
      return res.status(403).json({ error: 'Accès réservé aux chauffeurs' });
    }

    const resultat = await pool.query(
      `SELECT
          t.id, t.numero,
          -- Date en texte, jamais en horodatage : renvoyée brute, elle
          -- part en heure universelle (« 2026-08-26T22:00:00Z » pour le
          -- 27 août au Cameroun) et l'application affiche la veille.
          TO_CHAR(t.date_depart, 'YYYY-MM-DD') AS date_depart,
          t.heure_depart, t.heure_arrivee_estimee,
          t.statut,
          vd.nom_affiche AS depart, va.nom_affiche AS arrivee,
          b.nom AS nom_bus, b.disposition,
          -- Capacité réelle du bus : sièges vendables uniquement
          (SELECT COUNT(*) FROM sieges s
           WHERE s.bus_id = b.id AND s.statut = 'disponible') AS capacite,
          -- Point d'embarquement réel du départ (ligne multi-arrêts)
          (SELECT lp.lieu_prise_en_charge FROM ligne_points lp
           WHERE lp.ligne_id = l.id ORDER BY lp.ordre LIMIT 1) AS lieu_embarquement,
          -- Arrêts intermédiaires, dans l'ordre de la ligne
          -- L'heure de passage accompagne chaque arrêt : sans elle, le
          -- chauffeur lit « Bafoussam, Bangangté » sans savoir quand il
          -- est attendu à l'un ou à l'autre.
          COALESCE((
            SELECT json_agg(json_build_object('ville', lp.ville, 'nom_affiche', v2.nom_affiche,
                                              'ordre', lp.ordre, 'heure', lp.heure_arrivee_estimee)
                            ORDER BY lp.ordre)
            FROM ligne_points lp
            JOIN villes v2 ON v2.code = lp.ville
            WHERE lp.ligne_id = l.id
              AND lp.ordre > 0
              AND lp.ordre < (SELECT MAX(ordre) FROM ligne_points WHERE ligne_id = l.id)
          ), '[]'::json) AS arrets,
          -- Itinéraire complet, terminus compris : pour chaque point,
          -- l'heure, le lieu exact de prise en charge, et combien de
          -- voyageurs y montent et y descendent. C'est ce que le
          -- chauffeur doit avoir sous les yeux avant de partir.
          COALESCE((
            SELECT json_agg(json_build_object(
                     'ordre', lp.ordre,
                     'nom_affiche', v3.nom_affiche,
                     'heure', CASE WHEN lp.ordre = 0 THEN t.heure_depart
                                   ELSE COALESCE(lp.heure_arrivee_estimee, t.heure_arrivee_estimee) END,
                     'lieu', lp.lieu_prise_en_charge,
                     'montent', (SELECT COUNT(*) FROM billets bl
                                 WHERE bl.trajet_id = t.id
                                   AND bl.statut IN ('confirme','utilise')
                                   AND bl.point_embarquement_ordre = lp.ordre),
                     'descendent', (SELECT COUNT(*) FROM billets bl
                                    WHERE bl.trajet_id = t.id
                                      AND bl.statut IN ('confirme','utilise')
                                      AND bl.point_debarquement_ordre = lp.ordre)
                   ) ORDER BY lp.ordre)
            FROM ligne_points lp
            JOIN villes v3 ON v3.code = lp.ville
            WHERE lp.ligne_id = l.id
          ), '[]'::json) AS itineraire,
          (SELECT COUNT(*) FROM billets bil
           WHERE bil.trajet_id = t.id AND bil.statut IN ('confirme','utilise')) AS nb_passagers,
          ((t.date_depart + t.heure_depart) <= (NOW() + INTERVAL '30 minutes')) AS vente_fermee_ligne
       FROM trajets t
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       JOIN bus b ON b.id = t.bus_id
       WHERE t.chauffeur_id = $1
         -- Les trajets terminés restent visibles 30 jours pour que le
         -- chauffeur garde son historique dans l'application.
         AND (t.statut IN ('programme', 'en_cours', 'retard')
              OR (t.statut IN ('termine', 'annule')
                  AND t.date_depart >= CURRENT_DATE - INTERVAL '30 days'))
       ORDER BY t.date_depart, t.heure_depart`,
      [chauffeurId]
    );

    const trajets = resultat.rows.map(t => {
      const base = {
        id: t.id,
        numero: t.numero,
        date_depart: t.date_depart,
        heure_depart: t.heure_depart,
        heure_arrivee_estimee: t.heure_arrivee_estimee,
        statut: t.statut,
        depart: t.depart,
        arrivee: t.arrivee,
        // Alias explicites côté application mobile
        depart_affiche: t.depart,
        arrivee_affiche: t.arrivee,
        lieu_embarquement: t.lieu_embarquement,
        arrets: t.arrets || [],
        itineraire: t.itineraire || [],
        nom_bus: t.nom_bus,
        disposition: t.disposition,
        capacite: parseInt(t.capacite) || 0,
        places_reservees: parseInt(t.nb_passagers) || 0
      };

      // État 1 : départ déclaré → nombre DÉFINITIF
      if (t.statut === 'en_cours') {
        return {
          ...base,
          etat_liste: 'definitive',
          nombre_passagers: t.nb_passagers
        };
      }

      // État 2 : vente en ligne fermée (H-30) mais pas encore parti → PROVISOIRE
      if (t.vente_fermee_ligne) {
        return {
          ...base,
          etat_liste: 'provisoire',
          nombre_passagers: t.nb_passagers,
          info: 'Nombre provisoire — la vente au guichet peut encore se faire jusqu\'au départ'
        };
      }

      // État 3 : trop tôt → on ne montre pas le nombre
      return {
        ...base,
        etat_liste: 'vente_ouverte',
        info: 'Vente en cours — nombre de passagers non communiqué'
      };
    });

    res.json({
      nombre_trajets: trajets.length,
      trajets: trajets
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// DÉCLARER LE DÉPART (chauffeur)
// Passe le trajet en "en_cours", fige la liste passagers,
// bloque toute vente. Impossible avant l'heure prévue.
// ═══════════════════════════════════════════════════
async function declarerDepart(req, res) {
  try {
    const chauffeurId = req.utilisateur.id;
    const trajetId = req.params.id;

    if (req.utilisateur.type !== 'chauffeur') {
      return res.status(403).json({ error: 'Accès réservé aux chauffeurs' });
    }

    // 1. Récupérer le trajet et vérifier qu'il est assigné à ce chauffeur
    const trajetResult = await pool.query(
      `SELECT id, statut, date_depart, heure_depart
       FROM trajets WHERE id = $1 AND chauffeur_id = $2`,
      [trajetId, chauffeurId]
    );
    if (trajetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trajet introuvable ou non assigné à vous' });
    }
    const trajet = trajetResult.rows[0];

    // 2. Vérifier le statut
    if (trajet.statut === 'en_cours') {
      return res.status(400).json({ error: 'Le départ a déjà été déclaré' });
    }
    if (trajet.statut === 'termine') {
      return res.status(400).json({ error: 'Ce trajet est déjà terminé' });
    }
    if (trajet.statut === 'annule') {
      return res.status(400).json({ error: 'Ce trajet a été annulé' });
    }

    // 3. Vérifier qu'on n'est pas avant l'heure prévue
    const dateDepart = new Date(trajet.date_depart);
    const [h, m] = trajet.heure_depart.split(':');
    dateDepart.setHours(parseInt(h), parseInt(m), 0, 0);
    if (new Date() < dateDepart) {
      return res.status(400).json({
        error: `Le départ ne peut être déclaré avant l'heure prévue (${trajet.heure_depart.slice(0,5)})`
      });
    }

    // 4. Passer le trajet en "en_cours" et enregistrer l'heure réelle
    //    À partir de là, le statut "en_cours" bloque toute nouvelle vente.
    await pool.query(
      `UPDATE trajets
       SET statut = 'en_cours', heure_depart_reelle = NOW(), mis_a_jour_le = NOW()
       WHERE id = $1`,
      [trajetId]
    );

    // 5. Compter les passagers définitifs (la liste est maintenant figée)
    const passagers = await pool.query(
      `SELECT COUNT(*) AS nb FROM billets
       WHERE trajet_id = $1 AND statut IN ('confirme','utilise')`,
      [trajetId]
    );

    res.json({
      message: 'Départ déclaré. Bon voyage !',
      trajet_id: trajetId,
      nombre_passagers_definitif: parseInt(passagers.rows[0].nb)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// DÉCLARER L'ARRIVÉE (chauffeur)
// Le trajet doit être assigné à ce chauffeur et "en_cours".
// Passe en "termine", programme le versement escrow à +6h.
// ═══════════════════════════════════════════════════
async function declarerArriveeChauffeur(req, res) {
  const client = await pool.connect();
  try {
    const chauffeurId = req.utilisateur.id;
    const trajetId = req.params.id;

    if (req.utilisateur.type !== 'chauffeur') {
      return res.status(403).json({ error: 'Accès réservé aux chauffeurs' });
    }

    await client.query('BEGIN');

    // 1. Vérifier que le trajet est assigné à ce chauffeur
    const trajetCheck = await client.query(
      `SELECT id, statut FROM trajets WHERE id = $1 AND chauffeur_id = $2`,
      [trajetId, chauffeurId]
    );
    if (trajetCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trajet introuvable ou non assigné à vous' });
    }

    const trajet = trajetCheck.rows[0];

    // 2. Vérifier qu'il est bien en cours (parti mais pas encore arrivé)
    if (trajet.statut === 'termine') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ce trajet est déjà déclaré arrivé' });
    }
    if (trajet.statut !== 'en_cours') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Vous devez d\'abord déclarer le départ' });
    }

    // 3. Passer en "termine", enregistrer l'arrivée, programmer le versement à +6h
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
    const billets = await client.query(
      `UPDATE billets SET statut = 'utilise', mis_a_jour_le = NOW()
       WHERE trajet_id = $1 AND statut = 'confirme'
       RETURNING id`,
      [trajetId]
    );

    // Notifier chaque passager : "Arrivée déclarée, c'était comment ?"
    for (const b of billets.rows) {
      const infoBillet = await client.query(
        `SELECT voyageur_id FROM billets WHERE id = $1`,
        [b.id]
      );
      await creerNotification({
        destinataire_type: 'voyageur',
        destinataire_id: infoBillet.rows[0].voyageur_id,
        type: 'arrivee_declaree',
        titre: 'Arrivée déclarée',
        contenu: 'Votre bus est arrivé à destination. Comment s\'est passé votre voyage ? Notez votre trajet ou signalez un problème.',
        canal: 'push'
      });
    }

    // 5. Appliquer le barème de retard (calcul automatique vs heure promise)
    const retard = await appliquerBaremeRetard(client, trajetId);

    await client.query('COMMIT');

    res.json({
      message: 'Arrivée déclarée. Merci, bon repos !',
      trajet_id: trajetId,
      billets_concernes: billets.rows.length,
      retard: retard,
      versement_prevu: 'dans 6 heures (sauf signalement de fraude)'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// DÉSACTIVER UN CHAUFFEUR EN URGENCE (agence)
// Téléphone volé/perdu : coupe l'accès immédiatement.
// ═══════════════════════════════════════════════════
async function desactiverUrgence(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const chauffeurId = req.params.id;

    // Vérifier que le chauffeur appartient à l'agence
    const check = await pool.query(
      'SELECT id, nom, prenom FROM chauffeurs WHERE id = $1 AND agence_id = $2',
      [chauffeurId, agenceId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Chauffeur introuvable dans votre agence' });
    }

  // Même principe que la suppression : on refuse de désactiver un
    // chauffeur assigné à un trajet à venir ou en cours. L'agence doit
    // d'abord le retirer de ces trajets (bouton "Changer de chauffeur").
    const actif = await pool.query(
      `SELECT COUNT(*) AS nb FROM trajets WHERE chauffeur_id = $1 AND statut IN ('programme', 'en_cours')`,
      [chauffeurId]
    );
    if (parseInt(actif.rows[0].nb) > 0) {
      return res.status(409).json({ error: 'Ce chauffeur est assigné à un trajet à venir ou en cours — retire-le de ce(s) trajet(s) avant de le désactiver.' });
    }

    // Désactiver + couper la session active
    await pool.query(
      `UPDATE chauffeurs
       SET desactive_urgence = true, session_active = false, mis_a_jour_le = NOW()
       WHERE id = $1`,
      [chauffeurId]
    );

    const ch = check.rows[0];

    await creerNotification({
      destinataire_type: 'chauffeur',
      destinataire_id: chauffeurId,
      type: 'compte_desactive',
      titre: 'Compte désactivé',
      contenu: 'Votre compte a été désactivé en urgence par votre agence. Contactez-la pour plus d\'informations.',
      canal: 'sms'
    });


    res.json({
      message: `Chauffeur ${ch.prenom} ${ch.nom} désactivé en urgence. Son accès est immédiatement coupé.`,
      chauffeur_id: chauffeurId
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// RÉACTIVER UN CHAUFFEUR (agence) — après récupération du téléphone
// ═══════════════════════════════════════════════════
async function reactiverChauffeur(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const chauffeurId = req.params.id;

    const check = await pool.query(
      'SELECT id, nom, prenom FROM chauffeurs WHERE id = $1 AND agence_id = $2',
      [chauffeurId, agenceId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Chauffeur introuvable dans votre agence' });
    }

    await pool.query(
      `UPDATE chauffeurs SET desactive_urgence = false, mis_a_jour_le = NOW() WHERE id = $1`,
      [chauffeurId]
    );

    const ch = check.rows[0];
    res.json({
      message: `Chauffeur ${ch.prenom} ${ch.nom} réactivé. Il peut de nouveau se connecter.`,
      chauffeur_id: chauffeurId
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// CHANGER SON MOT DE PASSE (chauffeur lui-même UNIQUEMENT)
//
// Règle décidée : l'agence peut consulter ses chauffeurs et leur
// renvoyer leurs identifiants, mais ne peut JAMAIS fixer ni modifier
// leur mot de passe. Seul le chauffeur le change, depuis son espace,
// en fournissant son mot de passe actuel.
// ═══════════════════════════════════════════════════
async function changerMotDePasseChauffeur(req, res) {
  try {
    if (req.utilisateur.type !== 'chauffeur') {
      return res.status(403).json({ error: 'Accès réservé aux chauffeurs' });
    }
    const chauffeurId = req.utilisateur.id;
    const { mot_de_passe_actuel, nouveau_mot_de_passe } = req.body;

    if (!mot_de_passe_actuel || !nouveau_mot_de_passe) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe sont obligatoires' });
    }
    if (nouveau_mot_de_passe.length < 8) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères' });
    }
    if (mot_de_passe_actuel === nouveau_mot_de_passe) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit être différent de l\'actuel' });
    }

    const resultat = await pool.query('SELECT mot_de_passe FROM chauffeurs WHERE id = $1', [chauffeurId]);
    if (resultat.rows.length === 0) {
      return res.status(404).json({ error: 'Compte chauffeur introuvable' });
    }

    const valide = await bcrypt.compare(mot_de_passe_actuel, resultat.rows[0].mot_de_passe);
    if (!valide) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    const nouveauHash = await bcrypt.hash(nouveau_mot_de_passe, 10);
    await pool.query(
      `UPDATE chauffeurs SET mot_de_passe = $1, mis_a_jour_le = NOW() WHERE id = $2`,
      [nouveauHash, chauffeurId]
    );

    res.json({ message: 'Mot de passe modifié avec succès' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// RENVOYER LES IDENTIFIANTS À UN CHAUFFEUR (agence)
//
// L'agence ne voit ni ne choisit le mot de passe : le système en
// génère un provisoire, l'envoie au chauffeur, et l'agence n'en
// reçoit que la confirmation d'envoi.
// ═══════════════════════════════════════════════════
async function renvoyerIdentifiantsChauffeur(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const agenceId = req.utilisateur.id;
    const chauffeurId = req.params.id;

   const check = await pool.query(
      'SELECT id, nom, prenom, telephone, email FROM chauffeurs WHERE id = $1 AND agence_id = $2',
      [chauffeurId, agenceId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Chauffeur introuvable dans votre agence' });
    }
    const ch = check.rows[0];
    if (!ch.email) {
      return res.status(400).json({ error: 'Ce chauffeur n\'a pas d\'email enregistré — impossible de lui renvoyer ses identifiants.' });
    }

    // Mot de passe provisoire aléatoire — jamais renvoyé à l'agence.
    const provisoire = crypto.randomBytes(4).toString('hex').toUpperCase();
    const hash = await bcrypt.hash(provisoire, 10);
    await pool.query(
      `UPDATE chauffeurs SET mot_de_passe = $1, mis_a_jour_le = NOW() WHERE id = $2`,
      [hash, chauffeurId]
    );

    await creerNotification({
      destinataire_type: 'chauffeur',
      destinataire_id: chauffeurId,
      type: 'identifiants_renvoyes',
      titre: 'Vos identifiants JEGO',
      contenu: `Votre mot de passe provisoire est : ${provisoire}. Changez-le dès votre prochaine connexion depuis votre espace.`,
      canal: 'email'
    });

    res.json({
      message: `Un mot de passe provisoire a été envoyé à ${ch.prenom} ${ch.nom} par email. Il devra le changer lui-même à la connexion.`,
      chauffeur_id: chauffeurId
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// DÉCLARER LE PASSAGE À UN ARRÊT INTERMÉDIAIRE (chauffeur)
//
// Sur une ligne multi-arrêts, un passager qui descend à un arrêt
// intermédiaire a fini son voyage : son billet doit passer en
// 'utilise' à CE moment, pas au terminus. Le retard est calculé sur
// ce tronçon précis, à partir de l'heure de passage prévue au point.
//
// Le terminus reste déclaré par declarerArriveeChauffeur(), qui clôt
// le trajet et programme le versement de l'escrow.
// ═══════════════════════════════════════════════════
async function declarerArriveeArret(req, res) {
  const client = await pool.connect();
  try {
    if (req.utilisateur.type !== 'chauffeur') {
      return res.status(403).json({ error: 'Accès réservé aux chauffeurs' });
    }
    const chauffeurId = req.utilisateur.id;
    const trajetId = req.params.id;
    const { ordre } = req.body;

    if (ordre === undefined || ordre === null) {
      return res.status(400).json({ error: 'L\'ordre de l\'arrêt est obligatoire' });
    }
    const ordreNum = parseInt(ordre);
    if (!Number.isFinite(ordreNum) || ordreNum < 1) {
      return res.status(400).json({
        error: 'Ordre invalide. Le point 0 est le départ : il ne se déclare pas comme une arrivée.'
      });
    }

    await client.query('BEGIN');

    const trajetCheck = await client.query(
      `SELECT t.id, t.statut, t.ligne_id, t.date_depart
       FROM trajets t WHERE t.id = $1 AND t.chauffeur_id = $2 FOR UPDATE`,
      [trajetId, chauffeurId]
    );
    if (trajetCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trajet introuvable ou non assigné à vous' });
    }
    const trajet = trajetCheck.rows[0];

    if (trajet.statut !== 'en_cours') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Vous devez d\'abord déclarer le départ' });
    }

    // Le point doit exister sur la ligne
    const point = await client.query(
      `SELECT ville, ordre, heure_passage_prevue,
              (SELECT MAX(ordre) FROM ligne_points WHERE ligne_id = $1) AS ordre_max
       FROM ligne_points WHERE ligne_id = $1 AND ordre = $2`,
      [trajet.ligne_id, ordreNum]
    );
    if (point.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cet arrêt n\'existe pas sur la ligne de ce trajet' });
    }
    const p = point.rows[0];

    // Le terminus se déclare via la route d'arrivée finale, qui clôt
    // le trajet et déclenche le versement de l'escrow.
    if (ordreNum === parseInt(p.ordre_max)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Ce point est le terminus : utilisez la déclaration d\'arrivée finale.'
      });
    }

    // Les arrêts se déclarent dans l'ordre : on ne saute pas un point.
    const precedent = await client.query(
      `SELECT COUNT(*) AS nb FROM arrivees_arrets
       WHERE trajet_id = $1 AND ordre < $2`,
      [trajetId, ordreNum]
    );
    if (parseInt(precedent.rows[0].nb) !== ordreNum - 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Déclarez les arrêts dans l\'ordre : un arrêt précédent n\'a pas été déclaré.'
      });
    }

    // Retard sur CE tronçon, à partir de l'heure prévue au point.
    let retardMinutes = 0;
    if (p.heure_passage_prevue) {
      const promis = new Date(trajet.date_depart);
      const [h, m] = p.heure_passage_prevue.split(':');
      promis.setHours(parseInt(h), parseInt(m), 0, 0);
      retardMinutes = Math.max(0, Math.round((new Date() - promis) / 60000));
    }

    // Billets dont le voyage se TERMINE à cet arrêt -> 'utilise'
    const termines = await client.query(
      `UPDATE billets SET statut = 'utilise', mis_a_jour_le = NOW()
       WHERE trajet_id = $1 AND statut = 'confirme'
         AND point_debarquement_ordre = $2
       RETURNING id, voyageur_id`,
      [trajetId, ordreNum]
    );

    let enregistrement;
    try {
      enregistrement = await client.query(
        `INSERT INTO arrivees_arrets
          (trajet_id, ordre, ville, heure_promise, heure_reelle, retard_minutes,
           declare_par, billets_termines)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
         RETURNING id, ordre, ville, heure_reelle, retard_minutes, billets_termines`,
        [trajetId, ordreNum, p.ville, p.heure_passage_prevue || null,
         retardMinutes, chauffeurId, termines.rows.length]
      );
    } catch (e) {
      if (e.code === '23505') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Le passage à cet arrêt a déjà été déclaré' });
      }
      throw e;
    }

    await client.query('COMMIT');

    // Notifier les passagers descendus ici (hors transaction)
    for (const b of termines.rows) {
      await creerNotification({
        destinataire_type: 'voyageur',
        destinataire_id: b.voyageur_id,
        type: 'arrivee_declaree',
        titre: 'Vous êtes arrivé à destination',
        contenu: 'Votre bus est arrivé à votre point de descente. Comment s\'est passé votre voyage ?',
        canal: 'push'
      });
    }

    res.json({
      message: `Passage à l'arrêt déclaré (${termines.rows.length} passager(s) descendu(s)).`,
      arret: enregistrement.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// DÉCLARER LE DÉPART D'UN ARRÊT (chauffeur)
//
// Ferme l'embarquement à cet arrêt. Tant que le chauffeur n'a pas
// appuyé, il peut continuer à scanner les billets des voyageurs qui
// montent ici — c'est précisément ce qui manquait : le départ du
// terminus fermait l'embarquement pour tout le trajet, y compris pour
// des arrêts que le bus atteindrait des heures plus tard.
// ═══════════════════════════════════════════════════
async function declarerDepartArret(req, res) {
  try {
    if (req.utilisateur.type !== 'chauffeur') {
      return res.status(403).json({ error: 'Accès réservé aux chauffeurs' });
    }
    const chauffeurId = req.utilisateur.id;
    const trajetId = req.params.id;
    const { ordre } = req.body;

    if (ordre === undefined || ordre === null) {
      return res.status(400).json({ error: 'L\'ordre de l\'arrêt est obligatoire' });
    }
    const ordreNum = parseInt(ordre);
    if (!Number.isFinite(ordreNum) || ordreNum < 1) {
      return res.status(400).json({
        error: 'Ordre invalide. Le départ du point 0 se déclare avec la déclaration de départ du trajet.'
      });
    }

    const arret = await pool.query(
      `SELECT aa.id, aa.ville, aa.heure_depart_reelle
       FROM arrivees_arrets aa
       JOIN trajets t ON t.id = aa.trajet_id
       WHERE aa.trajet_id = $1 AND aa.ordre = $2 AND t.chauffeur_id = $3`,
      [trajetId, ordreNum, chauffeurId]
    );
    if (arret.rows.length === 0) {
      return res.status(404).json({
        error: 'Vous devez d\'abord déclarer votre arrivée à cet arrêt.'
      });
    }
    if (arret.rows[0].heure_depart_reelle) {
      return res.status(409).json({ error: 'Le départ de cet arrêt a déjà été déclaré.' });
    }

    const maj = await pool.query(
      `UPDATE arrivees_arrets SET heure_depart_reelle = NOW()
       WHERE id = $1
       RETURNING ordre, ville, heure_reelle, heure_depart_reelle`,
      [arret.rows[0].id]
    );

    res.json({
      message: 'Départ de l\'arrêt déclaré. L\'embarquement est fermé ici.',
      arret: maj.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// VOIR LES ARRÊTS D'UN TRAJET (chauffeur)
// Le chauffeur voit sa feuille de route : chaque point, s'il est
// déjà déclaré, et combien de passagers y descendent.
// ═══════════════════════════════════════════════════
async function arretsTrajet(req, res) {
  try {
    if (req.utilisateur.type !== 'chauffeur') {
      return res.status(403).json({ error: 'Accès réservé aux chauffeurs' });
    }
    const trajetId = req.params.id;

    const trajet = await pool.query(
      `SELECT ligne_id FROM trajets WHERE id = $1 AND chauffeur_id = $2`,
      [trajetId, req.utilisateur.id]
    );
    if (trajet.rows.length === 0) {
      return res.status(404).json({ error: 'Trajet introuvable ou non assigné à vous' });
    }

    const resultat = await pool.query(
      `SELECT lp.ordre, lp.ville, v.nom_affiche, lp.lieu_prise_en_charge,
              lp.heure_passage_prevue, lp.heure_arrivee_estimee,
              aa.heure_reelle, aa.retard_minutes, aa.heure_depart_reelle,
              (aa.id IS NOT NULL) AS declare,
              (aa.heure_depart_reelle IS NOT NULL) AS depart_declare,
              -- Embarquement ouvert ici : le bus y est arrivé et n'en
              -- est pas reparti.
              (aa.id IS NOT NULL AND aa.heure_depart_reelle IS NULL) AS embarquement_ouvert,
              (SELECT COUNT(*) FROM billets b
               WHERE b.trajet_id = $1 AND b.statut IN ('confirme','utilise')
                 AND b.point_embarquement_ordre = lp.ordre) AS montent,
              (SELECT COUNT(*) FROM billets b
               WHERE b.trajet_id = $1 AND b.statut IN ('confirme','utilise')
                 AND b.point_debarquement_ordre = lp.ordre) AS descendent
       FROM ligne_points lp
       JOIN villes v ON v.code = lp.ville
       LEFT JOIN arrivees_arrets aa ON aa.trajet_id = $1 AND aa.ordre = lp.ordre
       WHERE lp.ligne_id = $2
       ORDER BY lp.ordre`,
      [trajetId, trajet.rows[0].ligne_id]
    );

    res.json({ nombre: resultat.rows.length, arrets: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function supprimerChauffeur(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const { id } = req.params;

    const check = await pool.query('SELECT id, nom, prenom, statut FROM chauffeurs WHERE id = $1 AND agence_id = $2', [id, agenceId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Chauffeur introuvable dans votre agence' });
    }
    if (check.rows[0].statut === 'supprime') {
      return res.status(400).json({ error: 'Ce chauffeur est déjà supprimé.' });
    }

    const actif = await pool.query(
      `SELECT COUNT(*) AS nb FROM trajets WHERE chauffeur_id = $1 AND statut IN ('programme', 'en_cours')`,
      [id]
    );
    if (parseInt(actif.rows[0].nb) > 0) {
      return res.status(409).json({ error: 'Ce chauffeur est assigné à un trajet à venir ou en cours — retire-le de ce(s) trajet(s) avant de le supprimer.' });
    }

    // Soft-delete : un vrai DELETE échouerait sur la clé étrangère des
    // avis déjà laissés pour ce chauffeur (et on perdrait la
    // traçabilité de ses trajets déjà terminés/annulés). Le chauffeur
    // reste rattaché à son historique, mais disparaît des listes et ne
    // peut plus se connecter ni être assigné.
    await pool.query(
      `UPDATE chauffeurs SET statut = 'supprime', session_active = false, mis_a_jour_le = NOW() WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Chauffeur supprimé' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { creerChauffeur, listerChauffeurs, connexionChauffeur, mesTrajets, declarerDepart, declarerArriveeChauffeur, desactiverUrgence, reactiverChauffeur, changerMotDePasseChauffeur, renvoyerIdentifiantsChauffeur, declarerArriveeArret, declarerDepartArret, arretsTrajet, supprimerChauffeur };