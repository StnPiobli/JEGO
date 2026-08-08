const pool = require('../config/database');
const { verifierToken } = require('../utils/jwt');

// ═══════════════════════════════════════════════════
// MIDDLEWARE D'AUTHENTIFICATION
// Vérifie que l'utilisateur a un token valide
// ═══════════════════════════════════════════════════
function authentifier(req, res, next) {
  const authHeader = req.headers.authorization;

  // Le token arrive normalement dans l'en-tête Authorization. Exception :
  // l'affichage d'un fichier dans un <iframe> ou un onglet ne permet pas
  // d'envoyer d'en-tête, le token passe alors en paramètre d'URL.
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = String(req.query.token);
  }

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

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


// ═══════════════════════════════════════════════════
// VÉRIFIER QU'UNE AGENCE EST TOUJOURS ACTIVE
// Le token JWT vit 30 jours et ne contient que l'id : sans cette
// vérification, une agence désactivée continuerait à publier des trajets
// jusqu'à l'expiration de son token. On relit donc le statut en base à
// chaque action d'agence.
// ═══════════════════════════════════════════════════
async function verifierAgenceActive(req, res, next) {
  try {
    if (req.utilisateur.type !== 'agence') return next();

    const resultat = await pool.query(
      'SELECT statut, motif_desactivation FROM agences WHERE id = $1',
      [req.utilisateur.id]
    );

    if (resultat.rows.length === 0) {
      return res.status(403).json({ error: 'Compte agence introuvable' });
    }

    const { statut, motif_desactivation } = resultat.rows[0];

    if (statut === 'suspendu') {
      return res.status(403).json({
        error: 'Votre compte a été désactivé par JEGO.',
        motif: motif_desactivation || null,
        compte_desactive: true
      });
    }
    if (statut === 'refuse') {
      return res.status(403).json({ error: 'Votre inscription a été refusée.' });
    }
    if (statut === 'en_attente') {
      return res.status(403).json({ error: 'Votre compte est encore en attente de validation.' });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { authentifier, verifierChauffeurActif, verifierAgenceActive, verifierPermission };