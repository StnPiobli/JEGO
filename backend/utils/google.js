const crypto = require('crypto');

// ═══════════════════════════════════════════════════
// VÉRIFICATION D'UN JETON D'IDENTITÉ GOOGLE
//
// Le jeton arrive de l'application. On ne peut donc rien croire de ce
// qu'il annonce tant qu'on n'a pas vérifié sa signature : n'importe qui
// pourrait en fabriquer un annonçant l'email de quelqu'un d'autre.
//
// Google publie ses clés publiques ; on récupère celle dont l'identifiant
// figure dans l'en-tête du jeton, et on vérifie la signature avec. Les
// clés sont gardées en mémoire le temps que Google indique, pour ne pas
// les redemander à chaque connexion.
// ═══════════════════════════════════════════════════

const URL_CLES = 'https://www.googleapis.com/oauth2/v3/certs';
const EMETTEURS = ['accounts.google.com', 'https://accounts.google.com'];

let cache = { cles: null, expire: 0 };

async function clesGoogle() {
  if (cache.cles && Date.now() < cache.expire) return cache.cles;

  const reponse = await fetch(URL_CLES);
  if (!reponse.ok) {
    throw new Error('Impossible de joindre Google pour vérifier la connexion');
  }
  const corps = await reponse.json();

  // Google indique lui-même combien de temps ses clés restent valables.
  const cacheControl = reponse.headers.get('cache-control') || '';
  const duree = /max-age=(\d+)/.exec(cacheControl);
  const secondes = duree ? parseInt(duree[1]) : 3600;

  cache = { cles: corps.keys, expire: Date.now() + secondes * 1000 };
  return cache.cles;
}

function base64UrlVersJson(segment) {
  // Un jeton mal formé ne doit pas remonter l'erreur brute de JSON.parse
  // au voyageur : elle ne lui apprend rien et expose le fonctionnement
  // interne.
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch (_) {
    throw new Error('Jeton Google illisible');
  }
}

/// Vérifie le jeton et renvoie l'identité qu'il porte.
/// Lève une erreur dès que quelque chose ne colle pas — jamais de
/// « probablement valide ».
async function verifierJetonGoogle(jeton, clientId) {
  if (!jeton || typeof jeton !== 'string') {
    throw new Error('Jeton Google manquant');
  }
  if (!clientId) {
    throw new Error(
      'La connexion Google n\'est pas configurée sur ce serveur (GOOGLE_CLIENT_ID absent).'
    );
  }

  const parties = jeton.split('.');
  if (parties.length !== 3) throw new Error('Jeton Google illisible');

  const [enteteB64, charge64, signatureB64] = parties;
  const entete = base64UrlVersJson(enteteB64);
  const charge = base64UrlVersJson(charge64);

  if (entete.alg !== 'RS256') {
    throw new Error('Signature Google dans un format inattendu');
  }

  const cles = await clesGoogle();
  const cle = cles.find((k) => k.kid === entete.kid);
  if (!cle) throw new Error('Clé de signature Google inconnue');

  const valide = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${enteteB64}.${charge64}`),
    crypto.createPublicKey({ key: cle, format: 'jwk' }),
    Buffer.from(signatureB64, 'base64url')
  );
  if (!valide) throw new Error('Signature du jeton Google invalide');

  // Le jeton est authentique. Reste à vérifier qu'il nous est bien
  // destiné et qu'il n'est pas périmé : un jeton signé par Google pour
  // une AUTRE application serait sinon accepté ici.
  const attendus = String(clientId).split(',').map((c) => c.trim()).filter(Boolean);
  if (!attendus.includes(charge.aud)) {
    throw new Error('Ce jeton Google a été émis pour une autre application');
  }
  if (!EMETTEURS.includes(charge.iss)) {
    throw new Error('Émetteur du jeton Google inattendu');
  }
  if (charge.exp * 1000 < Date.now()) {
    throw new Error('Jeton Google expiré, réessayez');
  }
  if (!charge.email) {
    throw new Error('Ce compte Google ne communique pas d\'adresse email');
  }

  return {
    google_id: charge.sub,
    email: String(charge.email).toLowerCase(),
    email_verifie: charge.email_verified === true || charge.email_verified === 'true',
    prenom: charge.given_name || '',
    nom: charge.family_name || '',
  };
}

module.exports = { verifierJetonGoogle };
