/**
 * TEST — COMPENSATION DES RETARDS
 *
 * Règle décidée le 11/11/2026 (réglable dans parametres_systeme) :
 * en dessous de 4 h de retard, rien ; à partir de 4 h, un nombre fixe
 * de points JEGO à chaque passager. Jamais de remboursement en argent.
 *
 * Passe par la vraie déclaration d'arrivée du chauffeur.
 *
 * Lancement : node tests/test_retard.js
 */

const pool = require('../config/database');
const bcrypt = require('bcrypt');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
let reussis = 0, echoues = 0;
const erreurs = [];

function ok(nom, cond, detail = '') {
  if (cond) { reussis++; console.log(`  ✅ ${nom}`); }
  else { echoues++; erreurs.push(`${nom}${detail ? ' -> ' + detail : ''}`); console.log(`  ❌ ${nom}${detail ? ' -> ' + detail : ''}`); }
}

async function appel(methode, chemin, { token, body, headers = {} } = {}) {
  const opts = { method: methode, headers: { ...headers } };
  if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  const rep = await fetch(`${BASE}${chemin}`, opts);
  let donnees = null;
  try { donnees = await rep.json(); } catch (e) {}
  return { statut: rep.status, donnees };
}

const U = Date.now().toString().slice(-9);

/**
 * Monte un trajet complet avec un passager payant, force l'heure
 * d'arrivée promise pour provoquer le retard voulu, puis déclare
 * l'arrivée. Renvoie le résultat et l'état en base.
 */
async function scenarioRetard(suffixe, retardHeures) {
  const S = `${U}${suffixe}`;

  const admin = await pool.query(
    `INSERT INTO membres_admin (nom,prenom,email,mot_de_passe,niveau,statut)
     VALUES ('T','A',$1,$2,0,'actif') RETURNING id`,
    [`ret${S}@jego.cm`, await bcrypt.hash('Pass123!', 10)]
  );
  await pool.query(
    `INSERT INTO membre_roles (membre_id, role_id)
     SELECT $1, id FROM roles WHERE nom='super_admin' ON CONFLICT DO NOTHING`,
    [admin.rows[0].id]
  );
  const tokenAdmin = (await appel('POST', '/api/admin/connexion', {
    body: { email: `ret${S}@jego.cm`, mot_de_passe: 'Pass123!' }
  })).donnees?.token;

  const insc = await appel('POST', '/api/agences/inscription', {
    body: {
      nom: `AgRet ${S}`, email: `agr${S}@t.cm`, telephone: `+2376${S}`,
      adresse: 'Akwa', ville: 'Douala', registre_commerce: `RC${S}`,
      mot_de_passe: 'Agence123!'
    }
  });
  await appel('PUT', `/api/admin/agences/${insc.donnees.agence.id}/valider`, { token: tokenAdmin });
  const tokenAgence = (await appel('POST', '/api/agences/connexion', {
    body: { email: `agr${S}@t.cm`, mot_de_passe: 'Agence123!' }
  })).donnees?.token;

  const busId = (await appel('POST', '/api/bus', {
    token: tokenAgence,
    body: { nom: `Bus ${S}`, type_bus: 'standard', disposition: '2+2', nombre_rangees: 6 }
  })).donnees?.bus?.id;

  const ligneId = (await appel('POST', '/api/lignes', {
    token: tokenAgence,
    body: {
      ville_depart: 'douala', ville_arrivee: 'yaounde',
      points: [{ ville: 'douala' }, { ville: 'yaounde' }],
      troncons_prix: [{ ordre_depart: 0, ordre_arrivee: 1, prix: 5000 }]
    }
  })).donnees?.ligne?.id;

  const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const trajetId = (await appel('POST', '/api/trajets', {
    token: tokenAgence,
    body: {
      ligne_id: ligneId, bus_id: busId, date_depart: demain,
      heure_depart: '08:00', heure_arrivee_estimee: '12:00', prix_base: 5000
    }
  })).donnees?.trajet?.id;

  const tel = `+2377${S}`;
  await appel('POST', '/api/voyageurs/inscription', {
    body: {
      nom: 'Dupont', prenom: 'Jean', date_naissance: '1990-01-01',
      lieu_naissance: 'Douala', telephone: tel,
      email: `v${S}@t.cm`, mot_de_passe: 'Client123!'
    }
  });
  const tokenVoy = (await appel('POST', '/api/voyageurs/connexion', {
    body: { telephone: tel, mot_de_passe: 'Client123!' }
  })).donnees?.token;

  const plan = await appel('GET', `/api/reservations/trajets/${trajetId}/plan`);
  const siege = ((plan.donnees?.sieges) || []).find(s => s && s.id);

  await appel('POST', '/api/reservations/verrou', {
    token: tokenVoy,
    body: { trajet_id: trajetId, siege_id: siege.id, point_embarquement_ordre: 0, point_debarquement_ordre: 1 }
  });
  const paie = await appel('POST', '/api/reservations/payer', {
    token: tokenVoy,
    headers: { 'Idempotency-Key': `retard-${S}` },
    body: {
      trajet_id: trajetId, siege_id: siege.id, operateur: 'mtn_momo',
      point_embarquement_ordre: 0, point_debarquement_ordre: 1
    }
  });
  const billetId = paie.donnees?.billet?.id;

  // Un vrai numéro camerounais (9 chiffres après +237) : le suffixe
  // lettre du scénario rendait le numéro invalide et la création du
  // chauffeur échouait en silence.
  const telCh = `+2379${U.slice(-7)}${'abc'.indexOf(suffixe) + 1}`;
  const chId = (await appel('POST', '/api/chauffeurs', {
    token: tokenAgence,
    body: {
      nom: 'Nkeng', prenom: 'Luc', date_naissance: '1980-01-01', email: `ch${S}@t.cm`,
      lieu_naissance: 'Douala', telephone: telCh, mot_de_passe: 'Chauffeur123!'
    }
  })).donnees?.chauffeur?.id;
  await appel('PUT', `/api/trajets/${trajetId}/chauffeur`, {
    token: tokenAgence, body: { chauffeur_id: chId }
  });
  const tokenCh = (await appel('POST', '/api/chauffeurs/connexion', {
    body: { telephone: telCh, mot_de_passe: 'Chauffeur123!' }
  })).donnees?.token;

  // L'arrivée PROMISE est placée `retardHeures` avant maintenant (dans
  // le futur pour 0) : c'est elle qui sert de référence, jamais une heure
  // révisée en cours de route. Départ le même jour à minuit.
  const promis = new Date(Date.now() - retardHeures * 3600 * 1000 + (retardHeures === 0 ? 3 * 3600 * 1000 : 0));
  const deux = (n) => String(n).padStart(2, '0');
  const jour = `${promis.getFullYear()}-${deux(promis.getMonth() + 1)}-${deux(promis.getDate())}`;
  const heure = `${deux(promis.getHours())}:${deux(promis.getMinutes())}`;
  await pool.query(
    `UPDATE trajets
     SET date_depart = $3::date, heure_depart = '00:00',
         heure_arrivee_initiale = $2, heure_arrivee_estimee = $2
     WHERE id = $1`,
    [trajetId, heure, jour]
  );

  await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/depart`, { token: tokenCh });
  const arrivee = await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/arrivee`, { token: tokenCh });

  const remb = await pool.query(
    `SELECT montant FROM remboursements WHERE billet_id = $1`, [billetId]
  );
  const points = await pool.query(
    `SELECT COALESCE(SUM(points), 0)::int AS n FROM jego_points
      WHERE billet_id = $1 AND motif LIKE 'Compensation retard%'`,
    [billetId]
  );

  return { arrivee, remboursements: remb.rows, points: points.rows[0].n };
}

async function main() {
  console.log('\n═══ TEST — BARÈME DE RETARD ═══\n');

  const reglage = await pool.query(
    `SELECT valeur FROM parametres_systeme WHERE cle = 'retard_points_compensation'`
  );
  const pointsAttendus = parseInt(reglage.rows[0]?.valeur ?? '500', 10);

  console.log('1. RETARD DE 5 H → points JEGO, pas d\'argent');
  const gros = await scenarioRetard('a', 5);
  ok('Déclaration d\'arrivée aboutie', gros.arrivee.statut === 200, JSON.stringify(gros.arrivee.donnees));
  ok('Retard calculé au-delà de 4 h', (gros.arrivee.donnees?.retard?.retard_minutes ?? 0) >= 240,
     `${gros.arrivee.donnees?.retard?.retard_minutes} min`);
  ok(`${pointsAttendus} points offerts au passager`, gros.points === pointsAttendus, `${gros.points}`);
  ok('Aucun remboursement en argent', gros.remboursements.length === 0, JSON.stringify(gros.remboursements));
  const notif = await pool.query(
    `SELECT COUNT(*) AS n FROM notifications
     WHERE type = 'compensation_retard' AND cree_le > NOW() - INTERVAL '2 minutes'`
  );
  ok('Le passager est notifié', parseInt(notif.rows[0].n) >= 1, `${notif.rows[0].n} notification(s)`);

  console.log('\n2. RETARD DE 3 H → rien');
  const moyen = await scenarioRetard('b', 3);
  ok('Déclaration d\'arrivée aboutie', moyen.arrivee.statut === 200, JSON.stringify(moyen.arrivee.donnees));
  ok('Aucun point', moyen.points === 0, `${moyen.points}`);
  ok('Aucun remboursement', moyen.remboursements.length === 0);

  console.log('\n3. AUCUN RETARD → rien');
  const sansRetard = await scenarioRetard('c', 0);
  ok('Déclaration d\'arrivée aboutie', sansRetard.arrivee.statut === 200);
  ok('Retard nul', sansRetard.arrivee.donnees?.retard?.retard_minutes === 0,
     `${sansRetard.arrivee.donnees?.retard?.retard_minutes}`);
  ok('Aucun point', sansRetard.points === 0);
  ok('Aucun remboursement', sansRetard.remboursements.length === 0);

  console.log('\n═══ RÉSULTAT ═══');
  console.log(`✅ Réussis : ${reussis}`);
  console.log(`❌ Échoués : ${echoues}`);
  if (erreurs.length) {
    console.log('\nDétail des échecs :');
    erreurs.forEach(e => console.log('  - ' + e));
  }
  await pool.end();
  process.exit(echoues === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error('\n💥 ERREUR FATALE :', e);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
