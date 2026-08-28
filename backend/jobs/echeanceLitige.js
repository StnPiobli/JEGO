const cron = require('node-cron');
const pool = require('../config/database');
const { creerNotification } = require('../services/notificationService');
const { lireParametreEntier } = require('../services/parametreService');

// ═══════════════════════════════════════════════════
// JOB : ÉCHÉANCE DE RÉPONSE AGENCE SUR LITIGE
// S'exécute toutes les 10 minutes.
// Quand une agence n'a pas répondu à un litige dans le délai
// configuré (parametres_systeme.delai_reponse_agence_heures), le litige
// est ESCALADÉ automatiquement : l'agence est prévenue qu'elle est hors
// délai, les super-admins sont alertés pour trancher, et le litige est
// marqué (escalade_le) pour ne le faire qu'UNE fois.
// ═══════════════════════════════════════════════════
function demarrerEcheanceLitige() {
  // '*/10 * * * *' = toutes les 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    try {
      // Délai configurable ; 0 est valide (aucun sursis).
      const delaiHeures = await lireParametreEntier('delai_reponse_agence_heures', 48);

      // Litiges encore ouverts, sans réponse agence, jamais escaladés,
      // dont l'échéance (cree_le + délai) est dépassée.
      const enRetard = await pool.query(
        `SELECT l.id, l.numero, l.motif, l.agence_id, l.voyageur_id, l.cree_le
           FROM litiges l
          WHERE l.statut = 'ouvert'
            AND l.reponse_agence_le IS NULL
            AND l.escalade_le IS NULL
            AND l.cree_le <= NOW() - make_interval(hours => $1)`,
        [delaiHeures]
      );

      if (enRetard.rows.length === 0) return;

      const admins = await pool.query(
        `SELECT id FROM membres_admin WHERE statut = 'actif' AND niveau = 0`
      );

      let escalades = 0;
      for (const l of enRetard.rows) {
        // 1) Prévenir l'agence : hors délai, l'admin va trancher.
        await creerNotification({
          destinataire_type: 'agence',
          destinataire_id: l.agence_id,
          type: 'litige_hors_delai',
          titre: 'Litige non traité dans les délais',
          contenu: `Vous n'avez pas répondu au litige ${l.numero} dans le délai de ${delaiHeures}h. Il est transmis à l'administration JEGO pour arbitrage.`,
          canal: 'email'
        });
        await creerNotification({
          destinataire_type: 'agence',
          destinataire_id: l.agence_id,
          type: 'litige_hors_delai',
          titre: 'Litige non traité dans les délais',
          contenu: `Litige ${l.numero} transmis à l'administration : délai de réponse (${delaiHeures}h) dépassé.`,
          canal: 'push'
        });

        // 2) Alerter les super-admins : à trancher.
        for (const a of admins.rows) {
          await creerNotification({
            destinataire_type: 'admin',
            destinataire_id: a.id,
            type: 'litige_a_trancher',
            titre: 'Litige à trancher (agence hors délai)',
            contenu: `L'agence n'a pas répondu au litige ${l.numero} (${l.motif}) dans les ${delaiHeures}h. Arbitrage requis.`,
            canal: 'push'
          });
        }

        // 3) Marquer l'escalade (une seule fois).
        await pool.query(
          `UPDATE litiges SET escalade_le = NOW(), mis_a_jour_le = NOW() WHERE id = $1`,
          [l.id]
        );
        escalades++;
      }

      console.log(`⚖️ [Job échéance litige] ${escalades} litige(s) escaladé(s) (délai agence ${delaiHeures}h dépassé)`);
    } catch (err) {
      console.error('❌ [Job échéance litige] Erreur :', err.message);
    }
  });

  console.log('✅ Job d\'échéance des litiges démarré (toutes les 10 min)');
}

module.exports = { demarrerEcheanceLitige };
