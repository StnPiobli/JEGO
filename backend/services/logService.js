const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// JOURNALISATION DES ACTIONS SENSIBLES
// Écrit dans logs_systeme, jamais modifié ni supprimé une fois écrit.
// Une erreur de journalisation ne doit jamais faire échouer l'action
// métier elle-même : on logue l'erreur côté serveur et on continue.
// ═══════════════════════════════════════════════════
async function journaliser({ acteurType, acteurId, action, details = null, ipAddress = null, estUrgence = false }) {
  try {
    await pool.query(
      `INSERT INTO logs_systeme (acteur_type, acteur_id, action, details, ip_address, est_urgence)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [acteurType, acteurId, action, details ? JSON.stringify(details) : null, ipAddress, estUrgence]
    );
  } catch (err) {
    console.error('Erreur journalisation logs_systeme:', err.message);
  }
}

module.exports = { journaliser };
