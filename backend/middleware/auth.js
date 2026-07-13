const pool = require('../config/database');
const { verifierToken } = require('../utils/jwt');

// ═══════════════════════════════════════════════════
// MIDDLEWARE D'AUTHENTIFICATION
// Vérifie que l'utilisateur a un token valide
// ═══════════════════════════════════════════════════
function authentifier(req, res, next) {
  // Récupérer le token depuis l'en-tête Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  // Extraire le token (enlever "Bearer ")
  const token = authHeader.split(' ')[1];

  // Vérifier le token
  const decode = verifierToken(token);

  if (!decode) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }

  // Attacher les infos de l'utilisateur à la requête
  req.utilisateur = decode;

  // Passer à la suite
  next();
}

// ═══════════════════════════════════════════════════
// VÉRIFIER QU'UN CHAUFFEUR N'EST PAS DÉSACTIVÉ
// À utiliser après `authentifier` sur les actions chauffeur sensibles.
// Coupe l'accès immédiatement même si le token est encore valide.
// ═══════════════════════════════════════════════════
async function verifierChauffeurActif(req, res, next) {
  try {
    if (req.utilisateur.type !== 'chauffeur') {
      return res.status(403).json({ error: 'Accès réservé aux chauffeurs' });
    }

    const resultat = await pool.query(
      'SELECT desactive_urgence FROM chauffeurs WHERE id = $1',
      [req.utilisateur.id]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({ error: 'Compte chauffeur introuvable' });
    }

    if (resultat.rows[0].desactive_urgence) {
      return res.status(403).json({ error: 'Votre compte a été désactivé. Contactez votre agence.' });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// VÉRIFIER QU'UN MEMBRE ADMIN A UNE PERMISSION PRÉCISE
// Parcourt : membre → ses rôles → permissions de ces rôles
// Remplace les vérifications "type === 'admin'" en dur.
// ═══════════════════════════════════════════════════
function verifierPermission(codePermission) {
  return async (req, res, next) => {
    try {
      if (req.utilisateur.type !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
      }

      const resultat = await pool.query(
        `SELECT 1 FROM membre_roles mr
         JOIN role_permissions rp ON rp.role_id = mr.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE mr.membre_id = $1 AND p.code = $2
         LIMIT 1`,
        [req.utilisateur.id, codePermission]
      );

      if (resultat.rows.length === 0) {
        return res.status(403).json({ error: `Permission manquante : ${codePermission}` });
      }

      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { authentifier, verifierChauffeurActif, verifierPermission };