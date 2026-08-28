const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// SERVICE : CALCUL DE L'HORIZON DE PROGRAMMATION D'UNE AGENCE
// Compare le dernier trajet programmé à aujourd'hui,
// et détermine si l'agence respecte ses obligations.
// ═══════════════════════════════════════════════════
async function calculerHorizon(agenceId) {
  // 1. Récupérer les seuils configurables
  const params = await pool.query(
    `SELECT cle, valeur FROM parametres_systeme WHERE cle IN ('programmation_min_jours_initial', 'programmation_seuil_alerte_jours')`
  );
  const seuils = {};
  params.rows.forEach(p => { seuils[p.cle] = parseInt(p.valeur); });
  // 0 est une valeur VALIDE (pas de minimum / pas de seuil) : on ne
  // retombe sur le defaut que si le parametre est absent ou illisible.
  const lire = (cle, defaut) => Number.isInteger(seuils[cle]) ? seuils[cle] : defaut;
  const minInitial = lire('programmation_min_jours_initial', 30);
  const seuilAlerte = lire('programmation_seuil_alerte_jours', 14);

  // 2. Récupérer la date d'inscription de l'agence
  const agence = await pool.query(`SELECT cree_le FROM agences WHERE id = $1`, [agenceId]);
  if (agence.rows.length === 0) return null;
  const dateInscription = new Date(agence.rows[0].cree_le);

  // 3. Trouver le trajet le plus tardif programmé par cette agence
  const dernierTrajet = await pool.query(
    `SELECT MAX(date_depart) AS derniere_date FROM trajets
     WHERE agence_id = $1 AND statut NOT IN ('annule')`,
    [agenceId]
  );
  const derniereDate = dernierTrajet.rows[0].derniere_date;

  const aujourdhui = new Date();
  aujourdhui.setHours(0,0,0,0);

  // 4. Calculer le nombre de jours d'inscription écoulés (pour savoir si le délai initial s'applique encore)
  const joursDepuisInscription = Math.floor((aujourdhui - dateInscription) / 86400000);

  // 5. Calculer l'horizon actuel (jours de programme qu'il reste devant soi)
  let horizonJours = 0;
  if (derniereDate) {
    horizonJours = Math.floor((new Date(derniereDate) - aujourdhui) / 86400000);
  }

  // 6. Déterminer la conformité
  //    Phase initiale (moins de 30 jours après inscription) : doit couvrir jusqu'à J+30 de l'inscription
  //    Phase de croisière : doit toujours avoir au moins seuilAlerte jours devant elle
  let conforme, message;
  if (joursDepuisInscription < minInitial) {
    // Encore dans la période d'inscription : l'horizon doit couvrir jusqu'à minInitial jours après l'inscription
    const joursRestantsAvantEcheanceInitiale = minInitial - joursDepuisInscription;
    conforme = horizonJours >= joursRestantsAvantEcheanceInitiale - 1; // tolérance d'un jour
    message = conforme
      ? `Phase d'inscription : programme conforme (couvre ${horizonJours} jours, objectif initial ${minInitial} jours au total)`
      : `Programme initial incomplet : il manque du programme pour couvrir les ${minInitial} premiers jours`;
  } else {
    conforme = horizonJours >= seuilAlerte;
    message = conforme
      ? `Horizon de programmation : ${horizonJours} jours (seuil minimum ${seuilAlerte} jours)`
      : `Alerte : horizon de programmation sous le seuil (${horizonJours} jours restants, minimum ${seuilAlerte} requis)`;
  }

  return {
    horizon_jours: horizonJours,
    seuil_alerte: seuilAlerte,
    conforme,
    message,
    derniere_date_programmee: derniereDate
  };
}

module.exports = { calculerHorizon };