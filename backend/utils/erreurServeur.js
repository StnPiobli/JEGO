// ═══════════════════════════════════════════════════
// RÉPONSE D'ERREUR 500 SANS DÉTAIL TECHNIQUE
//
// Avant, chaque contrôleur renvoyait err.message au client : une erreur
// SQL affichait par exemple « la colonne x de la relation billets
// n'existe pas », ce qui renseigne un attaquant sur la base.
//
// Désormais :
//   - une erreur de la base, de Node (TypeError…) ou d'une bibliothèque
//     → message générique + numéro de suivi ; le détail va dans le
//       journal du serveur, retrouvable par ce numéro ;
//   - une erreur écrite par nous (new Error('Fichier trop lourd…')) garde
//     son message, déjà rédigé pour l'utilisateur.
// ═══════════════════════════════════════════════════
const crypto = require('crypto');

function estMessageMetier(err) {
  return err instanceof Error
    && err.constructor === Error
    && !err.code && !err.severity && !err.routine;
}

function erreurServeur(res, err) {
  if (estMessageMetier(err)) {
    return res.status(500).json({ error: err.message });
  }
  const suivi = crypto.randomBytes(4).toString('hex');
  console.error(`[erreur ${suivi}]`, err);
  return res.status(500).json({
    error: `Erreur interne du serveur. Réessayez ; si le problème continue, communiquez ce numéro : ${suivi}.`,
    suivi,
  });
}

module.exports = { erreurServeur };
