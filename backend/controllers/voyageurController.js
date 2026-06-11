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

module.exports = { inscription, connexion };