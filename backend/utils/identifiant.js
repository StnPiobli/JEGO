const crypto = require('crypto');

// ═══════════════════════════════════════════════════
// IDENTIFIANTS PUBLICS — PPP-XXXXX-XXXXX
//
// Miroir exact de la fonction SQL generer_identifiant(). Les deux
// existent parce que certains numéros doivent être connus AVANT
// l'insertion : celui d'un billet entre dans son QR code signé, il ne
// peut donc pas être décidé par une valeur par défaut en base.
//
// L'alphabet exclut 0, O, 1, I, L et U : ce sont les caractères qu'un
// voyageur et un agent confondent en se dictant un numéro au
// téléphone. 30^10 ≈ 5,9 × 10^14 combinaisons — ni devinable, ni
// énumérable depuis un numéro voisin.
// ═══════════════════════════════════════════════════

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

function genererIdentifiant(prefixe) {
  // randomInt plutôt que Math.random : un identifiant public ne doit
  // pas être prédictible à partir de ceux déjà émis.
  let tirage = '';
  for (let i = 0; i < 10; i++) {
    if (i === 5) tirage += '-';
    tirage += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return `${prefixe}-${tirage}`;
}

module.exports = { genererIdentifiant, ALPHABET };
