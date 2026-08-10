/**
 * TEST — BARÈME DE RETARD ET REMBOURSEMENT AUTOMATIQUE
 *
 * Couvre le chemin qui contenait un bug bloquant : la notification
 * de remboursement était écrite hors de la boucle des passagers et
 * faisait échouer TOUTE déclaration d'arrivée d'un trajet en retard
 * de 2 h ou plus. Ce test verrouille ce comportement.
 *
 * Barème : < 1 h toléré · 1-2 h points JEGO · 2-4 h 10 % · > 4 h 20 %
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
async function scenarioRetard(suffixe, heureArriveePromise) {
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

  const telCh = `+2379${S}`;
  const chId = (await appel('POST', '/api/chauffeurs', {
    token: tokenAgence,
    body: {
      nom: 'Nkeng', prenom: 'Luc', date_naissance: '1980-01-01',
      lieu_naissance: 'Douala', telephone: telCh, mot_de_passe: 'Chauffeur123!'
    }
  })).donnees?.chauffeur?.id;
  await appel('PUT', `/api/trajets/${trajetId}/chauffeur`, {
    token: tokenAgence, body: { chauffeur_id: chId }
  });
  const tokenCh = (await appel('POST', '/api/chauffeurs/connexion', {
    body: { telephone: telCh, mot_de_passe: 'Chauffeur123!' }
  })).donnees?.token;

  // On ramène le trajet à aujourd'hui et on fixe l'heure d'arrivée
  // PROMISE : c'est elle qui sert de référence au barème, jamais une
  // heure révisée en cours de route.
  await pool.query(
    `UPDATE trajets
     SET date_depart = CURRENT_DATE, heure_depart = '00:01',
         heure_arrivee_initiale = $2, heure_arrivee_estimee = $2
     WHERE id = $1`,
    [trajetId, heureArriveePromise]
  );

  await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/depart`, { token: tokenCh });
  const arrivee = await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/arrivee`, { token: tokenCh });

  const remb = await pool.query(
    `SELECT montant, pourcentage, statut FROM remboursements
     WHERE billet_id = $1 AND motif = 'retard_excessif'`,
    [billetId]
  );
  const prix = await pool.query(
    `SELECT prix_total_client FROM billets WHERE id = $1`, [billetId]
  );

  return { arrivee, remboursements: remb.rows, prixClient: prix.rows[0]?.prix_total_client };
}

async function main() {
  console.log('\n═══ TEST — BARÈME DE RETARD ═══\n');

  // ── Retard important : arrivée promise à 00h30, déclarée maintenant
  console.log('1. RETARD SUPÉRIEUR À 4 H → 20 % remboursés');
  const gros = await scenarioRetard('a', '00:30');

  ok('Déclaration d\'arrivée aboutie malgré le retard (bug historique)',
     gros.arrivee.statut === 200, JSON.stringify(gros.arrivee.donnees));
  ok('Le barème renvoie un retard calculé',
     (gros.arrivee.donnees?.retard?.retard_minutes ?? 0) > 240,
     `${gros.arrivee.donnees?.retard?.retard_minutes} min`);
  ok('Pourcentage appliqué : 20 %',
     gros.arrivee.donnees?.retard?.pourcentage === 20,
     `${gros.arrivee.donnees?.retard?.pourcentage}`);
  ok('Un remboursement est enregistré en base',
     gros.remboursements.length === 1, JSON.stringify(gros.remboursements));
  ok('Montant = 20 % du prix payé par le client',
     gros.remboursements[0] &&
     gros.remboursements[0].montant === Math.round(gros.prixClient * 20 / 100),
     `remboursé=${gros.remboursements[0]?.montant} prix=${gros.prixClient}`);
  ok('Remboursement marqué comme traité',
     gros.remboursements[0]?.statut === 'traite');

  const notif = await pool.query(
    `SELECT COUNT(*) AS n FROM notifications
     WHERE type = 'remboursement' AND cree_le > NOW() - INTERVAL '2 minutes'`
  );
  ok('Le passager est notifié de son remboursement',
     parseInt(notif.rows[0].n) >= 1, `${notif.rows[0].n} notification(s)`);

  // ── Aucun retard : arrivée promise dans le futur
  console.log('\n2. AUCUN RETARD → aucun remboursement');
  const futur = new Date(Date.now() + 3 * 3600 * 1000);
  const heureFuture =
    `${futur.getHours().toString().padStart(2, '0')}:${futur.getMinutes().toString().padStart(2, '0')}`;
  const sansRetard = await scenarioRetard('b', heureFuture);

  ok('Déclaration d\'arrivée aboutie', sansRetard.arrivee.statut === 200);
  ok('Retard nul', sansRetard.arrivee.donnees?.retard?.retard_minutes === 0,
     `${sansRetard.arrivee.donnees?.retard?.retard_minutes}`);
  ok('Aucun pourcentage appliqué',
     sansRetard.arrivee.donnees?.retard?.pourcentage === 0);
  ok('Aucun remboursement créé', sansRetard.remboursements.length === 0,
     JSON.stringify(sansRetard.remboursements));

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
