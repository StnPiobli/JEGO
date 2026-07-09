// ═══════════════════════════════════════════════════
// NORMALISER UN NUMÉRO DE TÉLÉPHONE CAMEROUNAIS
// Retire espaces, tirets, le + éventuel.
// Ajoute l'indicatif 237 s'il est absent (numéro à 9 chiffres).
// ═══════════════════════════════════════════════════
function normaliserTelephone(numero) {
  if (!numero) return numero;
  let n = numero.replace(/[\s\-\.]/g, ''); // retire espaces, tirets, points
  n = n.replace(/^\+/, ''); // retire le + initial
  if (n.length === 9 && !n.startsWith('237')) {
    n = '237' + n; // ajoute l'indicatif si absent
  }
  return n;
}

module.exports = { normaliserTelephone };