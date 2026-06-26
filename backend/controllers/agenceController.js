const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { genererToken } = require('../utils/jwt');

// ═══════════════════════════════════════════════════
// INSCRIPTION D'UNE AGENCE
// ═══════════════════════════════════════════════════
async function inscription(req, res) {
  try {
    const {
      nom, email, telephone, adresse, ville,
      registre_commerce, mot_de_passe
    } = req.body;

    // Vérifier les champs obligatoires
    if (!nom || !email || !telephone || !mot_de_passe) {
      return res.status(400).json({ error: 'Nom, email, téléphone et mot de passe sont obligatoires' });
    }

    // Vérifier si l'email existe déjà
    const emailExiste = await pool.query('SELECT id FROM agences WHERE email = $1', [email]);
    if (emailExiste.rows.length > 0) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Vérifier si le téléphone existe déjà
    const telExiste = await pool.query('SELECT id FROM agences WHERE telephone = $1', [telephone]);
    if (telExiste.rows.length > 0) {
      return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    // Chiffrer le mot de passe
    const motDePasseChiffre = await bcrypt.hash(mot_de_passe, 10);

    // Créer l'agence (statut en_attente par défaut)
    const resultat = await pool.query(
      `INSERT INTO agences
        (nom, email, telephone, adresse, ville, registre_commerce, mot_de_passe)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nom, email, telephone, ville, statut, badge_certifie`,
      [nom, email, telephone, adresse, ville, registre_commerce, motDePasseChiffre]
    );

    const agence = resultat.rows[0];

    res.status(201).json({
      message: 'Inscription réussie. Votre agence est en attente de validation par JEGO.',
      agence
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// CONNEXION D'UNE AGENCE
// ═══════════════════════════════════════════════════
async function connexion(req, res) {
  try {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Chercher l'agence
    const resultat = await pool.query('SELECT * FROM agences WHERE email = $1', [email]);

    if (resultat.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const agence = resultat.rows[0];

    // Vérifier le mot de passe
    const motDePasseValide = await bcrypt.compare(mot_de_passe, agence.mot_de_passe);

    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Générer un token
    const token = genererToken({ id: agence.id, type: 'agence' });

    res.json({
      message: 'Connexion réussie',
      agence: {
        id: agence.id,
        nom: agence.nom,
        email: agence.email,
        telephone: agence.telephone,
        ville: agence.ville,
        statut: agence.statut,
        badge_certifie: agence.badge_certifie
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
    const agenceId = req.utilisateur.id;

    const resultat = await pool.query(
      `SELECT id, nom, email, telephone, adresse, ville,
              registre_commerce, logo_url, badge_certifie, statut,
              langue, cree_le
       FROM agences WHERE id = $1`,
      [agenceId]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    res.json({ agence: resultat.rows[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { inscription, connexion, monProfil };