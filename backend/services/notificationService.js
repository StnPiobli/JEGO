const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// SERVICE : CRÉER UNE NOTIFICATION
// Enregistre l'événement en base. L'envoi physique réel
// (push/email/sms) sera branché plus tard sur ce même point.
// Ne fait jamais planter l'appelant : erreur = simplement loggée.
// ═══════════════════════════════════════════════════
async function creerNotification({ destinataire_type, destinataire_id, type, titre, contenu, canal }) {
  try {
    await pool.query(
      `INSERT INTO notifications
        (destinataire_type, destinataire_id, type, titre, contenu, canal, statut)
       VALUES ($1, $2, $3, $4, $5, $6, 'en_attente')`,
      [destinataire_type, destinataire_id, type, titre || null, contenu, canal]
    );
  } catch (err) {
    // Une notification qui échoue ne doit JAMAIS faire échouer l'action principale
    // (payer un billet ne doit pas planter parce que la notif a un souci)
    console.error('⚠️ [Notification] Échec de création :', err.message);
  }
}

module.exports = { creerNotification };