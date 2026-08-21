const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const { lireMultipart } = require('../utils/multipart');

const DOSSIER_UPLOADS = path.join(__dirname, '..', 'uploads', 'messages');
const TYPES_MIME_AUTORISES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const TAILLE_MAX_OCTETS = 8 * 1024 * 1024; // 8 Mo

// Lit le corps de la requête, qu'il soit multipart (avec pièce jointe)
// ou JSON classique (texte seul) -- les deux doivent rester possibles.
async function lireCorpsMessage(req) {
  const typeContenu = req.headers['content-type'] || '';
  if (typeContenu.startsWith('multipart/form-data')) {
    let resultat;
    try {
      resultat = await lireMultipart(req, TAILLE_MAX_OCTETS);
    } catch (err) {
      if (err.message === 'TAILLE_DEPASSEE') {
        throw new Error('Fichier trop lourd (8 Mo maximum)');
      }
      throw err;
    }
    const { champs, fichier } = resultat;
    let pieceJointe = null;
    if (fichier && fichier.donnees && fichier.donnees.length > 0) {
      if (!TYPES_MIME_AUTORISES.includes(fichier.type)) {
        throw new Error('Format non accepté. Envoie un PDF ou une image (JPEG, PNG, WebP).');
      }
      fs.mkdirSync(DOSSIER_UPLOADS, { recursive: true });
      const nomSurDisque = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${fichier.nom.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      fs.writeFileSync(path.join(DOSSIER_UPLOADS, nomSurDisque), fichier.donnees);
      pieceJointe = { nom: fichier.nom, url: `/uploads/messages/${nomSurDisque}`, type: fichier.type };
    }
    return { texte: (champs.texte || '').trim(), pieceJointe };
  }
  return { texte: (req.body?.texte || '').trim(), pieceJointe: null };
}

// ═══════════════════════════════════════════════════
// CÔTÉ AGENCE
// ═══════════════════════════════════════════════════

// Liste les messages du fil de l'agence connectée, marque comme lus
// tous les messages admin non encore vus par l'agence.
async function listerMessagesAgence(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const agenceId = req.utilisateur.id;

    const messages = await pool.query(
      `SELECT id, auteur_type, texte, piece_jointe_nom, piece_jointe_url, piece_jointe_type, cree_le
       FROM messages_agence WHERE agence_id = $1
       ORDER BY cree_le ASC`,
      [agenceId]
    );

    await pool.query(
      `UPDATE messages_agence SET lu_par_agence = true
       WHERE agence_id = $1 AND auteur_type = 'admin' AND lu_par_agence = false`,
      [agenceId]
    );

    res.json({ messages: messages.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// L'agence envoie un message à JEGO, avec pièce jointe optionnelle.
async function envoyerMessageAgence(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const agenceId = req.utilisateur.id;

    let texte, pieceJointe;
    try {
      ({ texte, pieceJointe } = await lireCorpsMessage(req));
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!texte && !pieceJointe) {
      return res.status(400).json({ error: 'Le message ne peut pas être vide' });
    }

    const resultat = await pool.query(
      `INSERT INTO messages_agence
        (agence_id, auteur_type, texte, piece_jointe_nom, piece_jointe_url, piece_jointe_type, lu_par_agence, lu_par_admin)
       VALUES ($1, 'agence', $2, $3, $4, $5, true, false)
       RETURNING id, auteur_type, texte, piece_jointe_nom, piece_jointe_url, piece_jointe_type, cree_le`,
             [agenceId, texte || '', pieceJointe?.nom || null, pieceJointe?.url || null, pieceJointe?.type || null]
    );

    res.status(201).json({ message: resultat.rows[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// CÔTÉ ADMIN
// ═══════════════════════════════════════════════════

// Liste toutes les agences ayant au moins un message, avec le dernier
// message et le nombre de messages non lus par l'admin.
async function listerConversationsAdmin(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }

    const resultat = await pool.query(
      `SELECT a.id AS agence_id, a.nom AS agence_nom,
              dernier.texte AS dernier_texte, dernier.auteur_type AS dernier_auteur, dernier.cree_le AS dernier_le,
              dernier.piece_jointe_nom AS dernier_a_piece,
              COALESCE(nonlus.nb, 0) AS non_lus
       FROM agences a
       JOIN LATERAL (
         SELECT texte, auteur_type, cree_le, piece_jointe_nom FROM messages_agence
         WHERE agence_id = a.id ORDER BY cree_le DESC LIMIT 1
       ) dernier ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS nb FROM messages_agence
         WHERE agence_id = a.id AND auteur_type = 'agence' AND lu_par_admin = false
       ) nonlus ON true
       ORDER BY dernier.cree_le DESC`
    );

    res.json({ conversations: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Ouvre le fil complet d'une agence précise, marque comme lus tous
// les messages agence non encore vus par l'admin.
async function voirConversationAdmin(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }
    const { agenceId } = req.params;

    const agence = await pool.query('SELECT id, nom FROM agences WHERE id = $1', [agenceId]);
    if (agence.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    const messages = await pool.query(
      `SELECT id, auteur_type, texte, piece_jointe_nom, piece_jointe_url, piece_jointe_type, cree_le
       FROM messages_agence WHERE agence_id = $1
       ORDER BY cree_le ASC`,
      [agenceId]
    );

    await pool.query(
      `UPDATE messages_agence SET lu_par_admin = true
       WHERE agence_id = $1 AND auteur_type = 'agence' AND lu_par_admin = false`,
      [agenceId]
    );

    res.json({ agence: agence.rows[0], messages: messages.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// L'admin répond à une agence précise, avec pièce jointe optionnelle.
async function envoyerMessageAdmin(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }
    const { agenceId } = req.params;

    let texte, pieceJointe;
    try {
      ({ texte, pieceJointe } = await lireCorpsMessage(req));
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!texte && !pieceJointe) {
      return res.status(400).json({ error: 'Le message ne peut pas être vide' });
    }

    const agence = await pool.query('SELECT id FROM agences WHERE id = $1', [agenceId]);
    if (agence.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    const resultat = await pool.query(
      `INSERT INTO messages_agence
        (agence_id, auteur_type, texte, piece_jointe_nom, piece_jointe_url, piece_jointe_type, lu_par_agence, lu_par_admin)
       VALUES ($1, 'admin', $2, $3, $4, $5, false, true)
       RETURNING id, auteur_type, texte, piece_jointe_nom, piece_jointe_url, piece_jointe_type, cree_le`,
             [agenceId, texte || '', pieceJointe?.nom || null, pieceJointe?.url || null, pieceJointe?.type || null]
    );

    res.status(201).json({ message: resultat.rows[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Compteur seul, sans effet de bord (ne marque rien comme lu) -- pour
// les badges de notification qui doivent rester visibles tant que
// l'agence n'a pas réellement ouvert la discussion.
async function compterMessagesNonLusAgence(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const agenceId = req.utilisateur.id;

    const resultat = await pool.query(
      `SELECT COUNT(*) AS nb FROM messages_agence
       WHERE agence_id = $1 AND auteur_type = 'admin' AND lu_par_agence = false`,
      [agenceId]
    );

    res.json({ non_lus: parseInt(resultat.rows[0].nb) || 0 });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listerMessagesAgence, envoyerMessageAgence, compterMessagesNonLusAgence,
  listerConversationsAdmin, voirConversationAdmin, envoyerMessageAdmin
};