// ═══════════════════════════════════════════════════
// OUVRIR UNE PIÈCE JOINTE (messages agence ↔ JEGO, litiges)
//
// Ces fichiers ne sont plus servis en accès libre : avant, quiconque
// connaissait l'adresse d'une facture jointe à un litige pouvait l'ouvrir.
// Désormais seuls l'agence concernée et l'équipe JEGO y ont accès.
// L'adresse reste la même (/uploads/messages/…, /uploads/litiges/…),
// les liens déjà enregistrés continuent donc de fonctionner.
// ═══════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const { typeDepuisNom } = require('../utils/fichierSur');
const { erreurServeur } = require('../utils/erreurServeur');

const DOSSIERS = {
  messages: path.join(__dirname, '..', 'uploads', 'messages'),
  litiges: path.join(__dirname, '..', 'uploads', 'litiges'),
};

async function agenceDuFichier(dossier, url) {
  if (dossier === 'messages') {
    const r = await pool.query(
      'SELECT agence_id FROM messages_agence WHERE piece_jointe_url = $1 LIMIT 1', [url]
    );
    return r.rows[0] || null;
  }
  const r = await pool.query(
    `SELECT l.agence_id, p.nom FROM pieces_litige p
       JOIN litiges l ON l.id = p.litige_id
      WHERE p.url = $1 LIMIT 1`, [url]
  );
  return r.rows[0] || null;
}

function servirPieceJointe(dossier) {
  return async (req, res) => {
    try {
      const nom = path.basename(String(req.params.nom || ''));
      const url = `/uploads/${dossier}/${nom}`;
      const ligne = await agenceDuFichier(dossier, url);
      if (!ligne) return res.status(404).json({ error: 'Fichier introuvable' });

      const { type, id } = req.utilisateur;
      const autorise = type === 'admin' || (type === 'agence' && String(ligne.agence_id) === String(id));
      if (!autorise) return res.status(403).json({ error: 'Accès non autorisé' });

      const chemin = path.join(DOSSIERS[dossier], nom);
      if (!fs.existsSync(chemin)) return res.status(404).json({ error: 'Fichier absent du serveur' });

      // Type déduit de l'extension choisie par le serveur ; « nosniff »
      // empêche le navigateur de deviner autre chose (une page HTML).
      res.setHeader('Content-Type', typeDepuisNom(nom));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'private, no-store');
      fs.createReadStream(chemin).pipe(res);
    } catch (err) {
      erreurServeur(res, err);
    }
  };
}

module.exports = { servirPieceJointe };
