const pool = require('../config/database');
const { creerNotification } = require('./notificationService');
const { crediterPoints } = require('./pointsService');
const { lireParametreEntier } = require('./parametreService');

// ═══════════════════════════════════════════════════
// SERVICE : CALCUL DU RETARD À L'ARRIVÉE + BARÈME
// Compare l'arrivée RÉELLE à l'heure PROMISE à la vente
// (heure_arrivee_initiale — jamais l'heure mise à jour).
// Barème (décision du 11/11/2026, réglable dans parametres_systeme) :
// en dessous du seuil (4 h), rien ; à partir du seuil, un nombre fixe
// de points JEGO à chaque passager. Aucun remboursement en argent.
// Doit être appelé DANS la transaction de déclaration d'arrivée.
// ═══════════════════════════════════════════════════
async function appliquerBaremeRetard(client, trajetId) {
  // 1. Récupérer les heures de référence
  const trajetResult = await client.query(
    `SELECT date_depart, heure_arrivee_initiale, heure_arrivee_reelle
     FROM trajets WHERE id = $1`,
    [trajetId]
  );
  const t = trajetResult.rows[0];
  if (!t.heure_arrivee_initiale || !t.heure_arrivee_reelle) {
    return { retard_minutes: 0, pourcentage: 0, billets_rembourses: 0 };
  }

  // 2. Construire le moment PROMIS (date du trajet + heure initiale)
  const promis = new Date(t.date_depart);
  const [h, m] = t.heure_arrivee_initiale.split(':');
  promis.setHours(parseInt(h), parseInt(m), 0, 0);

  // 3. Calculer le retard en minutes (réel - promis)
  const reel = new Date(t.heure_arrivee_reelle);
  const retardMinutes = Math.max(0, Math.round((reel - promis) / 60000));

  // 4. Compensation : des points, à partir du seuil
  const seuilHeures = await lireParametreEntier('retard_seuil_compensation_heures', 4);
  const points = await lireParametreEntier('retard_points_compensation', 500);
  const compense = retardMinutes >= seuilHeures * 60 && points > 0;

  await client.query(
    `UPDATE trajets SET retard_minutes = $1 WHERE id = $2`,
    [retardMinutes, trajetId]
  );

  let passagersCompenses = 0;
  if (compense) {
    // Le passager qui a subi le retard : le titulaire du billet.
    const passagers = await client.query(
      `SELECT id, voyageur_id FROM billets WHERE trajet_id = $1 AND statut = 'utilise'`,
      [trajetId]
    );
    const heures = Math.floor(retardMinutes / 60);
    for (const p of passagers.rows) {
      await crediterPoints(p.voyageur_id, points, `Compensation retard (${heures} h)`, p.id, client);
      passagersCompenses++;
      await creerNotification({
        destinataire_type: 'voyageur',
        destinataire_id: p.voyageur_id,
        type: 'compensation_retard',
        titre: 'Compensation pour retard',
        contenu: `Votre trajet a eu ${heures} h ${retardMinutes % 60} min de retard. JEGO vous offre ${points} points.`,
        canal: 'push'
      });
    }
  }

  return { retard_minutes: retardMinutes, points_offerts: compense ? points : 0, passagers_compenses: passagersCompenses };
}

module.exports = { appliquerBaremeRetard };