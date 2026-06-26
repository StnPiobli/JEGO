const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { genererToken } = require('../utils/jwt');

// ═══════════════════════════════════════════════════
// INSCRIPTION D'UN VOYAGEUR
// ═══════════════════════════════════════════════════
async function inscription(req, res) {
  try {
    const {
      nom, prenom, date_naissance, lieu_naissance,
      telephone, email, mot_de_passe, contact_urgence
    } = req.body;

    // Vérifier que les champs obligatoires sont présents
    if (!nom || !prenom || !date_naissance || !lieu_naissance || !telephone || !email || !mot_de_passe) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
    }

    // Vérifier si le téléphone existe déjà
    const telExiste = await pool.query('SELECT id FROM voyageurs WHERE telephone = $1', [telephone]);
    if (telExiste.rows.length > 0) {
      return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Vérifier si l'email existe déjà
    const emailExiste = await pool.query('SELECT id FROM voyageurs WHERE email = $1', [email]);
    if (emailExiste.rows.length > 0) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Chiffrer le mot de passe
    const motDePasseChiffre = await bcrypt.hash(mot_de_passe, 10);

    // Créer le voyageur
    const resultat = await pool.query(
      `INSERT INTO voyageurs
        (nom, prenom, date_naissance, lieu_naissance, telephone, email, mot_de_passe, contact_urgence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nom, prenom, telephone, email, points_fidelite`,
      [nom, prenom, date_naissance, lieu_naissance, telephone, email, motDePasseChiffre, contact_urgence]
    );

    const voyageur = resultat.rows[0];

    // Générer un token
    const token = genererToken({ id: voyageur.id, type: 'voyageur' });

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
    const { telephone, mot_de_passe } = req.body;

    if (!telephone || !mot_de_passe) {
      return res.status(400).json({ error: 'Téléphone et mot de passe requis' });
    }

    // Chercher le voyageur
    const resultat = await pool.query('SELECT * FROM voyageurs WHERE telephone = $1', [telephone]);

    if (resultat.rows.length === 0) {
      return res.status(401).json({ error: 'Téléphone ou mot de passe incorrect' });
    }

    const voyageur = resultat.rows[0];

    // Vérifier le mot de passe
    const motDePasseValide = await bcrypt.compare(mot_de_passe, voyageur.mot_de_passe);

    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Téléphone ou mot de passe incorrect' });
    }

    // Générer un token
    const token = genererToken({ id: voyageur.id, type: 'voyageur' });

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
              langue, mode_sombre, mode_eco_donnees, cree_le
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
    const { nom, prenom, email, contact_urgence, langue, mode_sombre, mode_eco_donnees } = req.body;

    // Récupérer le voyageur actuel
    const actuel = await pool.query('SELECT * FROM voyageurs WHERE id = $1', [voyageurId]);
    if (actuel.rows.length === 0) {
      return res.status(404).json({ error: 'Voyageur introuvable' });
    }
    const voyageur = actuel.rows[0];

    // Vérifier la règle du changement de nom (1 fois / 6 mois)
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

    // Si l'email change, vérifier qu'il n'est pas déjà pris
    if (email && email !== voyageur.email) {
      const emailExiste = await pool.query(
        'SELECT id FROM voyageurs WHERE email = $1 AND id != $2',
        [email, voyageurId]
      );
      if (emailExiste.rows.length > 0) {
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }
    }

    // Construire les nouvelles valeurs (garder l'ancienne si non envoyée)
    const nouveauNom = nom || voyageur.nom;
    const nouveauPrenom = prenom || voyageur.prenom;
    const nouvelEmail = email || voyageur.email;
    const nouveauContact = contact_urgence !== undefined ? contact_urgence : voyageur.contact_urgence;
    const nouvelleLangue = langue || voyageur.langue;
    const nouveauModeSombre = mode_sombre !== undefined ? mode_sombre : voyageur.mode_sombre;
    const nouveauModeEco = mode_eco_donnees !== undefined ? mode_eco_donnees : voyageur.mode_eco_donnees;

    const resultat = await pool.query(
      `UPDATE voyageurs SET
        nom = $1, prenom = $2, email = $3, contact_urgence = $4,
        langue = $5, mode_sombre = $6, mode_eco_donnees = $7,
        dernier_changement_nom = ${nomChange ? 'NOW()' : 'dernier_changement_nom'},
        mis_a_jour_le = NOW()
       WHERE id = $8
       RETURNING id, nom, prenom, email, contact_urgence, langue, mode_sombre, mode_eco_donnees, points_fidelite`,
      [nouveauNom, nouveauPrenom, nouvelEmail, nouveauContact, nouvelleLangue, nouveauModeSombre, nouveauModeEco, voyageurId]
    );

    res.json({
      message: 'Profil mis à jour',
      voyageur: resultat.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { inscription, connexion, monProfil, modifierProfil };