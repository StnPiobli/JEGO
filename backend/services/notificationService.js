const pool = require('../config/database');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ═══════════════════════════════════════════════════
// SERVICE : CRÉER UNE NOTIFICATION
// Enregistre toujours l'événement en base.
// Si canal = 'email', tente un envoi réel via Resend.
// Une notification qui échoue ne bloque JAMAIS l'action principale.
// ═══════════════════════════════════════════════════
async function creerNotification({ destinataire_type, destinataire_id, type, titre, contenu, canal }) {
  let notifId = null;
  try {
    const inserted = await pool.query(
      `INSERT INTO notifications
        (destinataire_type, destinataire_id, type, titre, contenu, canal, statut)
       VALUES ($1, $2, $3, $4, $5, $6, 'en_attente')
       RETURNING id`,
      [destinataire_type, destinataire_id, type, titre || null, contenu, canal]
    );
    notifId = inserted.rows[0].id;
  } catch (err) {
    console.error('⚠️ [Notification] Échec d\'enregistrement en base :', err.message);
    return; // si même l'enregistrement échoue, on s'arrête là
  }

  // Envoi réel uniquement pour le canal email
  if (canal === 'email') {
    try {
      const email = await recupererEmailDestinataire(destinataire_type, destinataire_id);
      if (!email) {
        console.error(`⚠️ [Notification email] Aucun email trouvé pour ${destinataire_type} ${destinataire_id}`);
        return;
      }

      await resend.emails.send({
        from: 'JEGO <onboarding@resend.dev>',
        to: email,
        subject: titre || 'Notification JEGO',
        text: contenu
      });

      await pool.query(`UPDATE notifications SET statut = 'envoye', envoye_le = NOW() WHERE id = $1`, [notifId]);

    } catch (err) {
      console.error('⚠️ [Notification email] Échec d\'envoi :', err.message);
      await pool.query(`UPDATE notifications SET statut = 'echoue' WHERE id = $1`, [notifId]).catch(() => {});
    }
  }
}

// ═══════════════════════════════════════════════════
// Récupérer l'email d'un destinataire selon son type
// ═══════════════════════════════════════════════════
async function recupererEmailDestinataire(type, id) {
  let table;
  if (type === 'voyageur') table = 'voyageurs';
  else if (type === 'agence') table = 'agences';
  else if (type === 'admin') table = 'membres_admin';
  else return null; // chauffeurs n'ont pas d'email en base actuellement

  const r = await pool.query(`SELECT email FROM ${table} WHERE id = $1`, [id]);
  return r.rows.length > 0 ? r.rows[0].email : null;
}

module.exports = { creerNotification };