const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { genererToken } = require('../utils/jwt');

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
// VOIR SON TRAJET DU JOUR (chauffeur connecté)
// Renvoie les trajets assignés au chauffeur, à venir
// ═══════════════════════════════════════════════════
async function mesTrajets(req, res) {
  try {
    const chauffeurId = req.utilisateur.id;

    // Vérifier que c'est bien un chauffeur
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
           WHERE bil.trajet_id = t.id AND bil.statut IN ('confirme','utilise')) AS nombre_passagers
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

    res.json({
      nombre_trajets: resultat.rows.length,
      trajets: resultat.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { creerChauffeur, listerChauffeurs, connexionChauffeur, mesTrajets };