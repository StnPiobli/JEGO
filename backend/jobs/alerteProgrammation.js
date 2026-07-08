const cron = require('node-cron');
const pool = require('../config/database');
const { calculerHorizon } = require('../services/programmationService');
const { creerNotification } = require('../services/notificationService');

// ═══════════════════════════════════════════════════
// JOB : ALERTE QUOTIDIENNE PROGRAMMATION
// S'exécute une fois par jour (5h du matin).
// Vérifie l'horizon de chaque agence active,
// notifie celles qui sont sous le seuil.
// ═══════════════════════════════════════════════════
function demarrerAlerteProgrammation() {
  // '0 5 * * *' = tous les jours à 5h00
  cron.schedule('0 5 * * *', async () => {
    try {
      const agences = await pool.query(
        `SELECT id, nom FROM agences WHERE statut = 'actif'`
      );

      let alertesEnvoyees = 0;

      for (const agence of agences.rows) {
        const horizon = await calculerHorizon(agence.id);
        if (horizon && !horizon.conforme) {
          await creerNotification({
            destinataire_type: 'agence',
            destinataire_id: agence.id,
            type: 'alerte_programmation',
            titre: 'Programmation insuffisante',
            contenu: horizon.message,
            canal: 'push'
          });
          await creerNotification({
            destinataire_type: 'agence',
            destinataire_id: agence.id,
            type: 'alerte_programmation',
            titre: 'Programmation insuffisante',
            contenu: horizon.message,
            canal: 'email'
          });
          alertesEnvoyees++;
        }
      }

      if (alertesEnvoyees > 0) {
        console.log(`⚠️ [Job programmation] ${alertesEnvoyees} agence(s) alertée(s) pour programmation insuffisante`);
      }
    } catch (err) {
      console.error('❌ [Job programmation] Erreur :', err.message);
    }
  });

  console.log('✅ Job d\'alerte programmation démarré (tous les jours à 5h)');
}

module.exports = { demarrerAlerteProgrammation };