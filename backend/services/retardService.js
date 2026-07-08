const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// SERVICE : CALCUL DU RETARD À L'ARRIVÉE + BARÈME
// Compare l'arrivée RÉELLE à l'heure PROMISE à la vente
// (heure_arrivee_initiale — jamais l'heure mise à jour).
// Barème : <1h → 0% | 1-2h → points JEGO | 2-4h → 10% | >4h → 20%
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

  // 4. Déterminer le pourcentage selon le barème
  let pourcentage = 0;
  let pointsJego = false;
  if (retardMinutes < 60) {
    pourcentage = 0;                    // toléré
  } else if (retardMinutes < 120) {
    pourcentage = 0; pointsJego = true; // points JEGO offerts
  } else if (retardMinutes < 240) {
    pourcentage = 10;
  } else {
    pourcentage = 20;
  }

  // Enregistrer le retard constaté sur le trajet
  await client.query(
    `UPDATE trajets SET retard_minutes = $1 WHERE id = $2`,
    [retardMinutes, trajetId]
  );

  // 5. Si remboursement partiel : l'appliquer à tous les billets utilisés
  let billetsRembourses = 0;
  if (pourcentage > 0) {
    const billets = await client.query(
      `SELECT id, voyageur_id, prix_total_client FROM billets
       WHERE trajet_id = $1 AND statut = 'utilise'`,
      [trajetId]
    );

    for (const b of billets.rows) {
      const montant = Math.round(b.prix_total_client * pourcentage / 100);
      const reference = `REMB-RET-${Date.now()}-${b.id.slice(0,4)}`;
      await client.query(
        `INSERT INTO remboursements
          (billet_id, voyageur_id, montant, motif, pourcentage, statut, reference, traite_le)
         VALUES ($1,$2,$3,'retard_excessif',$4,'traite',$5,NOW())`,
        [b.id, b.voyageur_id, montant, pourcentage, reference]
      );
      billetsRembourses++;
      // [SIMULATION] Remboursement Mobile Money + notification
    }
  }

  return { retard_minutes: retardMinutes, pourcentage, points_jego: pointsJego, billets_rembourses: billetsRembourses };
}

module.exports = { appliquerBaremeRetard };