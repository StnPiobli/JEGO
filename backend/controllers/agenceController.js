const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/database');
const { lireMultipart } = require('../utils/multipart');
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


// ═══════════════════════════════════════════════════
// TÉLÉVERSER UN DOCUMENT (côté agence)
// L'agence envoie ses pièces depuis son espace ; l'admin les consulte
// ensuite sur la fiche de l'agence.
// ═══════════════════════════════════════════════════
const DOSSIER_UPLOADS = path.join(__dirname, '..', 'uploads', 'agences');
const TYPES_MIME_AUTORISES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const TAILLE_MAX_OCTETS = 8 * 1024 * 1024; // 8 Mo

async function televerserDocument(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const agenceId = req.utilisateur.id;

    let resultat;
    try {
      resultat = await lireMultipart(req, TAILLE_MAX_OCTETS);
    } catch (err) {
      if (err.message === 'TAILLE_DEPASSEE') {
        return res.status(413).json({ error: 'Fichier trop lourd (8 Mo maximum)' });
      }
      return res.status(400).json({ error: err.message });
    }

    const { champs, fichier } = resultat;
    if (!fichier || !fichier.donnees || fichier.donnees.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }
    if (!TYPES_MIME_AUTORISES.includes(fichier.type)) {
      return res.status(400).json({
        error: 'Format non accepté. Envoie un PDF ou une image (JPEG, PNG, WebP).'
      });
    }
    const typeDocument = (champs.type_document || '').trim();
    if (!typeDocument) {
      return res.status(400).json({ error: 'Précise de quel document il s\'agit' });
    }

    // Nom de stockage aléatoire : le nom d'origine n'est jamais utilisé
    // pour construire un chemin, ce qui évite toute remontée d'arborescence.
    const extensions = {
      'application/pdf': '.pdf', 'image/jpeg': '.jpg',
      'image/png': '.png', 'image/webp': '.webp'
    };
    const nomStocke = crypto.randomBytes(16).toString('hex') + extensions[fichier.type];

    fs.mkdirSync(DOSSIER_UPLOADS, { recursive: true });
    fs.writeFileSync(path.join(DOSSIER_UPLOADS, nomStocke), fichier.donnees);

    const enregistre = await pool.query(
      `INSERT INTO documents_agence
        (agence_id, type_document, nom_fichier, fichier_stocke, taille_octets, type_mime)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, type_document, nom_fichier, taille_octets, statut, televerse_le`,
      [agenceId, typeDocument, fichier.nom, nomStocke, fichier.donnees.length, fichier.type]
    );

    res.status(201).json({ message: 'Document envoyé', document: enregistre.rows[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// MES DOCUMENTS (côté agence)
// ═══════════════════════════════════════════════════
async function mesDocuments(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const documents = await pool.query(
      `SELECT id, type_document, nom_fichier, taille_octets, statut, televerse_le
       FROM documents_agence WHERE agence_id = $1 ORDER BY televerse_le DESC`,
      [req.utilisateur.id]
    );
    const demandes = await pool.query(
      `SELECT id, pieces, statut, cree_le FROM demandes_pieces
       WHERE agence_id = $1 AND statut = 'ouverte' ORDER BY cree_le DESC`,
      [req.utilisateur.id]
    );
    res.json({ documents: documents.rows, demandes_ouvertes: demandes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// SUPPRIMER UN DE MES DOCUMENTS (côté agence)
// Impossible une fois qu'un admin l'a vérifié : sinon une agence pourrait
// faire disparaître une pièce déjà contrôlée.
// ═══════════════════════════════════════════════════
async function supprimerMonDocument(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const doc = await pool.query(
      `SELECT id, fichier_stocke, statut FROM documents_agence
       WHERE id = $1 AND agence_id = $2`,
      [req.params.id, req.utilisateur.id]
    );
    if (doc.rows.length === 0) {
      return res.status(404).json({ error: 'Document introuvable' });
    }
    if (doc.rows[0].statut === 'verifie') {
      return res.status(403).json({ error: 'Ce document a déjà été vérifié par JEGO et ne peut plus être retiré' });
    }

    const chemin = path.join(DOSSIER_UPLOADS, path.basename(doc.rows[0].fichier_stocke));
    if (fs.existsSync(chemin)) fs.unlinkSync(chemin);
    await pool.query(`DELETE FROM documents_agence WHERE id = $1`, [req.params.id]);

    res.json({ message: 'Document retiré' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { inscription, connexion, monProfil, televerserDocument, mesDocuments, supprimerMonDocument };