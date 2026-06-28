const cron = require('node-cron');
const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// JOB : NETTOYAGE DES VERROUS EXPIRÉS
// S'exécute toutes les 2 minutes.
// Supprime les soft_locks dont l'expiration est dépassée.
// ═══════════════════════════════════════════════════
function demarrerNettoyageVerrous() {
  // '*/2 * * * *' = toutes les 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      const resultat = await pool.query(
        `DELETE FROM soft_locks WHERE expire_le < NOW() RETURNING id`
      );

      if (resultat.rows.length > 0) {
        console.log(`🧹 [Job verrous] ${resultat.rows.length} verrou(x) expiré(s) nettoyé(s)`);
      }
    } catch (err) {
      console.error('❌ [Job verrous] Erreur :', err.message);
    }
  });

  console.log('✅ Job de nettoyage des verrous démarré (toutes les 2 min)');
}

module.exports = { demarrerNettoyageVerrous };