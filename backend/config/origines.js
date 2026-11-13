// ═══════════════════════════════════════════════════
// SITES AUTORISÉS À APPELER L'API DEPUIS UN NAVIGATEUR (CORS)
//
// Sans cette liste, n'importe quel site ouvert par un agent connecté
// pourrait interroger l'API en son nom.
//
// - CORS_ORIGINES (dans .env, séparées par des virgules) : les adresses
//   officielles des portails et de l'appli web, ex.
//   CORS_ORIGINES=https://agence.jego.cm,https://admin.jego.cm,https://app.jego.cm
// - Hors production (NODE_ENV différent de « production ») on accepte en
//   plus cette machine et le réseau local (téléphone de test en Wi-Fi).
// - Une requête sans en-tête Origin (appli mobile installée, outils,
//   tests) n'est pas concernée par CORS : elle passe.
// ═══════════════════════════════════════════════════
const listees = (process.env.CORS_ORIGINES || '')
  .split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);

const enProduction = process.env.NODE_ENV === 'production';

const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

function origineAutorisee(origine, rappel) {
  if (!origine) return rappel(null, true);
  if (listees.includes(origine)) return rappel(null, true);
  if (!enProduction && LOCAL.test(origine)) return rappel(null, true);
  return rappel(null, false);
}

module.exports = { origineAutorisee };
