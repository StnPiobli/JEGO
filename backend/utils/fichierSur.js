// ═══════════════════════════════════════════════════
// RECONNAÎTRE LE VRAI TYPE D'UN FICHIER ENVOYÉ
//
// Le type annoncé par le navigateur (Content-Type) se falsifie en une
// ligne : une page HTML renommée « facture.png » passerait. On lit donc
// les premiers octets du fichier, que seul le vrai format possède, et
// c'est le serveur qui choisit l'extension enregistrée.
// ═══════════════════════════════════════════════════
const crypto = require('crypto');

const FORMATS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** Renvoie le type MIME réel (pdf, jpeg, png, webp) ou null. */
function typeReel(donnees) {
  if (!donnees || donnees.length < 12) return null;
  if (donnees.slice(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (donnees[0] === 0xff && donnees[1] === 0xd8 && donnees[2] === 0xff) return 'image/jpeg';
  if (donnees.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (donnees.slice(0, 4).toString('latin1') === 'RIFF' && donnees.slice(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

/**
 * Vérifie le fichier et prépare son nom sur disque.
 * Renvoie { type, nomStocke } ou null si le format n'est pas accepté.
 * `typesAcceptes` restreint la liste (ex. images seulement).
 */
function preparerFichier(donnees, typesAcceptes = Object.keys(FORMATS)) {
  const type = typeReel(donnees);
  if (!type || !typesAcceptes.includes(type)) return null;
  return { type, nomStocke: crypto.randomBytes(16).toString('hex') + FORMATS[type] };
}

/** Type MIME d'après l'extension d'un fichier déjà stocké. */
function typeDepuisNom(nom) {
  const ext = (nom.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
  const trouve = Object.entries(FORMATS).find(([, e]) => e === ext || (ext === '.jpeg' && e === '.jpg'));
  return trouve ? trouve[0] : 'application/octet-stream';
}

module.exports = { typeReel, preparerFichier, typeDepuisNom };
