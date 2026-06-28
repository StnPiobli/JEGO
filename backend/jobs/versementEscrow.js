const cron = require('node-cron');
const pool = require('../config/database');
const { verserEscrowTrajet } = require('../services/escrowService');

// ═══════════════════════════════════════════════════
// JOB : VERSEMENT AUTOMATIQUE DES ESCROWS
// S'exécute toutes les 10 minutes.
// Cherche les trajets terminés, délai 6h écoulé, escrow retenu,
// et déclenche le versement (ou la suspension si fraude).
// ═══════════════════════════════════════════════════
function demarrerVersementEscrow() {
  // '*/10 * * * *' = toutes les 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    try {
      // Chercher les trajets prêts à verser :
      //   - terminés
      //   - délai de 6h passé
      //   - avec au moins un escrow encore "retenu"
      const trajets = await pool.query(
        `SELECT DISTINCT t.id
         FROM trajets t
         JOIN billets b ON b.trajet_id = t.id
         JOIN escrow e ON e.billet_id = b.id
         WHERE t.statut = 'termine'
           AND t.versement_escrow_le <= NOW()
           AND e.statut = 'retenu'`
      );

      if (trajets.rows.length === 0) return; // rien à faire

      let verses = 0;
      let suspendus = 0;

      for (const trajet of trajets.rows) {
        const resultat = await verserEscrowTrajet(trajet.id);
        if (resultat.ok) {
          verses++;
          console.log(`💰 [Job escrow] Trajet ${trajet.id.slice(0,8)}… versé : ${resultat.total_verse_agence} FCFA`);
        } else if (resultat.suspendu) {
          suspendus++;
          console.log(`⚠️ [Job escrow] Trajet ${trajet.id.slice(0,8)}… SUSPENDU (fraude présumée)`);
        }
      }

      if (verses > 0 || suspendus > 0) {
        console.log(`✅ [Job escrow] ${verses} versé(s), ${suspendus} suspendu(s)`);
      }
    } catch (err) {
      console.error('❌ [Job escrow] Erreur :', err.message);
    }
  });

  console.log('✅ Job de versement des escrows démarré (toutes les 10 min)');
}

module.exports = { demarrerVersementEscrow };