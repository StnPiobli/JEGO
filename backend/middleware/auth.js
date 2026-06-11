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

module.exports = { authentifier };