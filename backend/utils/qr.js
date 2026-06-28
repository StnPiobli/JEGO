const crypto = require('crypto');

const QR_SECRET = process.env.QR_SECRET || 'secret_par_defaut';

// ═══════════════════════════════════════════════════
// GÉNÉRER LA SIGNATURE d'un billet
// Calcule une empreinte cryptographique des données.
// Impossible à reproduire sans connaître QR_SECRET.
// ═══════════════════════════════════════════════════
function signerDonnees(donnees) {
  return crypto
    .createHmac('sha256', QR_SECRET)
    .update(donnees)
    .digest('hex')
    .substring(0, 16); // 16 caractères suffisent pour un QR
}

// ═══════════════════════════════════════════════════
// CONSTRUIRE LE CONTENU COMPLET DU QR (avec signature)
// Format : JEGO|numero|trajet|siege|signature
// ═══════════════════════════════════════════════════
function genererQR(numeroBillet, trajetId, siegeId) {
  const donnees = `${numeroBillet}|${trajetId}|${siegeId}`;
  const signature = signerDonnees(donnees);
  return `JEGO|${donnees}|${signature}`;
}

// ═══════════════════════════════════════════════════
// VÉRIFIER UN QR (au scan)
// Recalcule la signature et la compare à celle du QR.
// Si elles correspondent → billet authentique.
// ═══════════════════════════════════════════════════
function verifierQR(contenuQR) {
  try {
    const parties = contenuQR.split('|');
    // Format attendu : JEGO | numero | trajet | siege | signature
    if (parties.length !== 5 || parties[0] !== 'JEGO') {
      return { valide: false, raison: 'Format de QR invalide' };
    }

    const [, numero, trajetId, siegeId, signatureFournie] = parties;
    const donnees = `${numero}|${trajetId}|${siegeId}`;
    const signatureAttendue = signerDonnees(donnees);

    if (signatureFournie !== signatureAttendue) {
      return { valide: false, raison: 'Signature invalide (billet falsifié)' };
    }

    return {
      valide: true,
      numero,
      trajet_id: trajetId,
      siege_id: siegeId
    };
  } catch (err) {
    return { valide: false, raison: 'QR illisible' };
  }
}

module.exports = { genererQR, verifierQR, signerDonnees };