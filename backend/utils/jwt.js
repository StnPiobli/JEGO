const jwt = require('jsonwebtoken');
require('dotenv').config();

// Génère un token pour un utilisateur
function genererToken(utilisateur) {
  return jwt.sign(
    {
      id: utilisateur.id,
      type: utilisateur.type,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Vérifie qu'un token est valide
function verifierToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = { genererToken, verifierToken };