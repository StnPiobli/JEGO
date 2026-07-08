const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { genererToken } = require('../utils/jwt');
const { appliquerBaremeRetard } = require('../services/retardService');
const { creerNotification } = require('../services/notificationService');

// ═══════════════════════════════════════════════════
// CRÉER UN COMPTE CHAUFFEUR (par l'agence uniquement)
// ═══════════════════════════════════════════════════
async function creerChauffeur(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const {
      nom, prenom, date_naissance, lieu_naissance,
      telephone, mot_de_passe
    } = req.body;

    // Vérifier les champs obligatoires
    if (!nom || !prenom || !date_naissance || !lieu_naissance || !telephone || !mot_de_passe) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
    }

    // Vérifier que le téléphone n'est pas déjà utilisé
    const telExiste = await pool.query('SELECT id FROM chauffeurs WHERE telephone = $1', [telephone]);
    if (telExiste.rows.length > 0) {
      return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé par un chauffeur' });
    }

    // Chiffrer le mot de passe
    const motDePasseChiffre = await bcrypt.hash(mot_de_passe, 10);

    // Créer le chauffeur, rattaché à l'agence
    const resultat = await pool.query(
      `INSERT INTO chauffeurs
        (agence_id, nom, prenom, date_naissance, lieu_naissance, telephone, mot_de_passe)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nom, prenom, telephone, statut`,
      [agenceId, nom, prenom, date_naissance, lieu_naissance, telephone, motDePasseChiffre]
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
      `SELECT id, nom, prenom, telephone, statut, note_moyenne, nombre_voyages, desactive_urgence
       FROM chauffeurs WHERE agence_id = $1
       ORDER BY nom, prenom`,
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
    const { telephone, mot_de_passe } = req.body;

    if (!telephone || !mot_de_passe) {
      return res.status(400).json({ error: 'Téléphone et mot de passe requis' });
    }

    const resultat = await pool.query('SELECT * FROM chauffeurs WHERE telephone = $1', [telephone]);

    if (resultat.rows.length === 0) {
      return res.status(401).json({ error: 'Téléphone ou mot de passe incorrect' });
    }

    const chauffeur = resultat.rows[0];

    // Bloquer si le compte a été désactivé en urgence
    if (chauffeur.desactive_urgence) {
      return res.status(403).json({ error: 'Ce compte a été désactivé. Contactez votre agence.' });
    }

    // Vérifier le mot de passe
    const motDePasseValide = await bcrypt.compare(mot_de_passe, chauffeur.mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Téléphone ou mot de passe incorrect' });
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
          t.id, t.date_depart, t.heure_depart, t.heure_arrivee_estimee,
          t.statut,
          vd.nom_affiche AS depart, va.nom_affiche AS arrivee,
          b.nom AS nom_bus, b.disposition,
          (SELECT COUNT(*) FROM billets bil
           WHERE bil.trajet_id = t.id AND bil.statut IN ('confirme','utilise')) AS nb_passagers,
          ((t.date_depart + t.heure_depart) <= (NOW() + INTERVAL '30 minutes')) AS vente_fermee_ligne
       FROM trajets t
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       JOIN bus b ON b.id = t.bus_id
       WHERE t.chauffeur_id = $1
         AND t.statut IN ('programme', 'en_cours', 'retard')
       ORDER BY t.date_depart, t.heure_depart`,
      [chauffeurId]
    );

    const trajets = resultat.rows.map(t => {
      const base = {
        id: t.id,
        date_depart: t.date_depart,
        heure_depart: t.heure_depart,
        heure_arrivee_estimee: t.heure_arrivee_estimee,
        statut: t.statut,
        depart: t.depart,
        arrivee: t.arrivee,
        nom_bus: t.nom_bus,
        disposition: t.disposition
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

    // Désactiver + couper la session active
    await pool.query(
      `UPDATE chauffeurs
       SET desactive_urgence = true, session_active = false, mis_a_jour_le = NOW()
       WHERE id = $1`,
      [chauffeurId]
    );

    const ch = check.rows[0];
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

module.exports = { creerChauffeur, listerChauffeurs, connexionChauffeur, mesTrajets, declarerDepart, declarerArriveeChauffeur, desactiverUrgence, reactiverChauffeur };