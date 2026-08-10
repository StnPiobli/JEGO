/**
 * TEST — ARRIVÉES PAR ARRÊT INTERMÉDIAIRE
 *
 * Ligne Douala(0) -> Loum(1) -> Yaoundé(2).
 * Un passager descend à Loum, un autre va au terminus.
 * Vérifie que le billet du premier se clôt AU BON MOMENT.
 *
 * Lancement : node tests/test_arrets.js
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

async function main() {
  console.log('\n═══ TEST — ARRIVÉES PAR ARRÊT INTERMÉDIAIRE ═══\n');

  console.log('0. Mise en place (ligne Douala -> Loum -> Yaoundé)');
  const admin = await pool.query(
    `INSERT INTO membres_admin (nom,prenom,email,mot_de_passe,niveau,statut)
     VALUES ('T','A',$1,$2,0,'actif') RETURNING id`,
    [`arr${U}@jego.cm`, await bcrypt.hash('Pass123!', 10)]
  );
  await pool.query(
    `INSERT INTO membre_roles (membre_id, role_id)
     SELECT $1, id FROM roles WHERE nom='super_admin' ON CONFLICT DO NOTHING`,
    [admin.rows[0].id]
  );
  const tokenAdmin = (await appel('POST', '/api/admin/connexion', {
    body: { email: `arr${U}@jego.cm`, mot_de_passe: 'Pass123!' }
  })).donnees?.token;

  const insc = await appel('POST', '/api/agences/inscription', {
    body: {
      nom: `AgArrets ${U}`, email: `agar${U}@t.cm`, telephone: `+2376${U}`,
      adresse: 'Akwa', ville: 'Douala', registre_commerce: `RC${U}`, mot_de_passe: 'Agence123!'
    }
  });
  await appel('PUT', `/api/admin/agences/${insc.donnees.agence.id}/valider`, { token: tokenAdmin });
  const tokenAgence = (await appel('POST', '/api/agences/connexion', {
    body: { email: `agar${U}@t.cm`, mot_de_passe: 'Agence123!' }
  })).donnees?.token;

  const busId = (await appel('POST', '/api/bus', {
    token: tokenAgence,
    body: { nom: `Bus ${U}`, type_bus: 'standard', disposition: '2+2', nombre_rangees: 8 }
  })).donnees?.bus?.id;

  const ligneId = (await appel('POST', '/api/lignes', {
    token: tokenAgence,
    body: {
      ville_depart: 'douala', ville_arrivee: 'yaounde', est_direct: false,
      points: [{ ville: 'douala' }, { ville: 'loum' }, { ville: 'yaounde' }],
      troncons_prix: [
        { ordre_depart: 0, ordre_arrivee: 1, prix: 2000 },
        { ordre_depart: 1, ordre_arrivee: 2, prix: 3500 },
        { ordre_depart: 0, ordre_arrivee: 2, prix: 5000 }
      ]
    }
  })).donnees?.ligne?.id;
  ok('Ligne à 3 points créée', !!ligneId);

  // Heure de passage prévue à Loum : sert au calcul du retard par tronçon
  await pool.query(
    `UPDATE ligne_points SET heure_passage_prevue = '09:30' WHERE ligne_id = $1 AND ordre = 1`,
    [ligneId]
  );

  const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const trajetId = (await appel('POST', '/api/trajets', {
    token: tokenAgence,
    body: {
      ligne_id: ligneId, bus_id: busId, date_depart: demain,
      heure_depart: '08:00', heure_arrivee_estimee: '12:00', prix_base: 5000
    }
  })).donnees?.trajet?.id;
  ok('Trajet créé', !!trajetId);

  // Deux voyageurs : un descend à Loum, l'autre va au terminus
  async function creerVoyageur(suffixe) {
    const tel = `+2377${suffixe}`;
    await appel('POST', '/api/voyageurs/inscription', {
      body: {
        nom: 'Test', prenom: suffixe, date_naissance: '1990-01-01',
        lieu_naissance: 'Douala', telephone: tel,
        email: `v${suffixe}@t.cm`, mot_de_passe: 'Client123!'
      }
    });
    return (await appel('POST', '/api/voyageurs/connexion', {
      body: { telephone: tel, mot_de_passe: 'Client123!' }
    })).donnees?.token;
  }

  const tokenA = await creerVoyageur(U.slice(0, 8) + '1');
  const tokenB = await creerVoyageur(U.slice(0, 8) + '2');

  const plan = await appel('GET', `/api/reservations/trajets/${trajetId}/plan`);
  const sieges = (plan.donnees?.sieges || plan.donnees?.plan || []).flat().filter(s => s && s.id);

  async function acheter(token, siegeId, a, b, cle) {
    await appel('POST', '/api/reservations/verrou', {
      token, body: { trajet_id: trajetId, siege_id: siegeId, point_embarquement_ordre: a, point_debarquement_ordre: b }
    });
    return appel('POST', '/api/reservations/payer', {
      token, headers: { 'Idempotency-Key': cle },
      body: {
        trajet_id: trajetId, siege_id: siegeId, operateur: 'mtn_momo',
        point_embarquement_ordre: a, point_debarquement_ordre: b
      }
    });
  }

  // Voyageur A : Douala -> Loum (descend à l'arrêt 1)
  const achatA = await acheter(tokenA, sieges[0].id, 0, 1, `a-${U}`);
  ok('Billet Douala -> Loum acheté', achatA.statut === 201, JSON.stringify(achatA.donnees));
  const billetA = achatA.donnees?.billet?.id;
  const prixA = await pool.query(`SELECT prix_agence FROM billets WHERE id = $1`, [billetA]);
  ok('Prix du tronçon Douala -> Loum = 2000 (et non le prix complet)',
     prixA.rows[0]?.prix_agence === 2000,
     `prix_agence=${prixA.rows[0]?.prix_agence}`);

  // Voyageur B : Douala -> Yaoundé (terminus)
  const achatB = await acheter(tokenB, sieges[1].id, 0, 2, `b-${U}`);
  ok('Billet Douala -> Yaoundé acheté', achatB.statut === 201);
  const billetB = achatB.donnees?.billet?.id;

  // ─────────────────────────────────────────────────────
  console.log('\n1. FEUILLE DE ROUTE DU CHAUFFEUR');
  // ─────────────────────────────────────────────────────
  const telCh = `+2379${U}`;
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

  const feuille = await appel('GET', `/api/chauffeurs/trajets/${trajetId}/arrets`, { token: tokenCh });
  ok('Feuille de route accessible', feuille.statut === 200, JSON.stringify(feuille.donnees).slice(0, 200));
  ok('3 points sur la feuille de route', feuille.donnees?.nombre === 3);

  const arretLoum = feuille.donnees?.arrets?.find(a => a.ordre === 1);
  ok('1 passager descend à Loum', parseInt(arretLoum?.descendent) === 1,
     `descendent=${arretLoum?.descendent}`);
  ok('2 passagers montent à Douala',
     parseInt(feuille.donnees?.arrets?.find(a => a.ordre === 0)?.montent) === 2);

  // ─────────────────────────────────────────────────────
  console.log('\n2. DÉCLARATION DES ARRÊTS');
  // ─────────────────────────────────────────────────────

  // Avant le départ, aucune déclaration possible
  const avantDepart = await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/arret`, {
    token: tokenCh, body: { ordre: 1 }
  });
  ok('Arrêt refusé avant déclaration du départ', avantDepart.statut === 400,
     JSON.stringify(avantDepart.donnees));

  await pool.query(
    `UPDATE trajets SET date_depart = CURRENT_DATE, heure_depart = '00:01' WHERE id = $1`,
    [trajetId]
  );
  const depart = await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/depart`, { token: tokenCh });
  ok('Départ déclaré', depart.statut === 200);

  // Le point 0 (départ) ne se déclare pas comme une arrivée
  const point0 = await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/arret`, {
    token: tokenCh, body: { ordre: 0 }
  });
  ok('Le point de départ ne se déclare pas comme arrivée', point0.statut === 400);

  // Le terminus passe par la route d'arrivée finale
  const terminus = await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/arret`, {
    token: tokenCh, body: { ordre: 2 }
  });
  ok('Le terminus est refusé sur la route des arrêts', terminus.statut === 400,
     JSON.stringify(terminus.donnees));

  // Arrêt inexistant
  const inexistant = await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/arret`, {
    token: tokenCh, body: { ordre: 9 }
  });
  ok('Arrêt inexistant refusé', inexistant.statut === 404);

  // Déclaration valide de Loum
  const loum = await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/arret`, {
    token: tokenCh, body: { ordre: 1 }
  });
  ok('Passage à Loum déclaré', loum.statut === 200, JSON.stringify(loum.donnees));
  ok('1 passager comptabilisé comme descendu',
     loum.donnees?.arret?.billets_termines === 1,
     `billets_termines=${loum.donnees?.arret?.billets_termines}`);

  // LE POINT CLÉ : le billet A est clos, le billet B ne l'est PAS
  const etatA = await pool.query(`SELECT statut FROM billets WHERE id = $1`, [billetA]);
  const etatB = await pool.query(`SELECT statut FROM billets WHERE id = $1`, [billetB]);
  ok('Billet du passager descendu à Loum passé en "utilise"',
     etatA.rows[0]?.statut === 'utilise', `statut=${etatA.rows[0]?.statut}`);
  ok('Billet du passager allant au terminus TOUJOURS "confirme"',
     etatB.rows[0]?.statut === 'confirme', `statut=${etatB.rows[0]?.statut}`);

  // Double déclaration refusée
  const doublon = await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/arret`, {
    token: tokenCh, body: { ordre: 1 }
  });
  ok('Double déclaration du même arrêt refusée', doublon.statut === 409);

  // Retard calculé sur le tronçon (heure prévue 09:30 dépassée)
  const retard = await pool.query(
    `SELECT retard_minutes, heure_promise FROM arrivees_arrets WHERE trajet_id = $1 AND ordre = 1`,
    [trajetId]
  );
  ok('Retard calculé sur le tronçon, pas sur le trajet entier',
     retard.rows[0] && retard.rows[0].retard_minutes !== null,
     `retard=${retard.rows[0]?.retard_minutes} min, promis=${retard.rows[0]?.heure_promise}`);

  // La feuille de route reflète la déclaration
  const feuille2 = await appel('GET', `/api/chauffeurs/trajets/${trajetId}/arrets`, { token: tokenCh });
  const loumApres = feuille2.donnees?.arrets?.find(a => a.ordre === 1);
  ok('Feuille de route : Loum marqué comme déclaré', loumApres?.declare === true);
  ok('Feuille de route : Yaoundé pas encore déclaré',
     feuille2.donnees?.arrets?.find(a => a.ordre === 2)?.declare === false);

  // ─────────────────────────────────────────────────────
  console.log('\n3. ARRIVÉE FINALE');
  // ─────────────────────────────────────────────────────
  const arriveeFinale = await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/arrivee`, { token: tokenCh });
  ok('Arrivée finale déclarée', arriveeFinale.statut === 200, JSON.stringify(arriveeFinale.donnees));

  const etatBFinal = await pool.query(`SELECT statut FROM billets WHERE id = $1`, [billetB]);
  ok('Billet terminus passé en "utilise" à l\'arrivée finale',
     etatBFinal.rows[0]?.statut === 'utilise', `statut=${etatBFinal.rows[0]?.statut}`);

  const trajetFinal = await pool.query(`SELECT statut FROM trajets WHERE id = $1`, [trajetId]);
  ok('Trajet clos', trajetFinal.rows[0]?.statut === 'termine');

  // Un chauffeur d'une autre agence ne doit rien pouvoir déclarer
  const autreCh = `+23768${U.slice(0, 7)}`;
  const autreChId = (await appel('POST', '/api/chauffeurs', {
    token: tokenAgence,
    body: {
      nom: 'Autre', prenom: 'Chauffeur', date_naissance: '1990-01-01',
      lieu_naissance: 'Douala', telephone: autreCh, mot_de_passe: 'Autre1234!'
    }
  })).donnees?.chauffeur?.id;
  const tokenAutre = (await appel('POST', '/api/chauffeurs/connexion', {
    body: { telephone: autreCh, mot_de_passe: 'Autre1234!' }
  })).donnees?.token;
  const intrusion = await appel('GET', `/api/chauffeurs/trajets/${trajetId}/arrets`, { token: tokenAutre });
  ok('Un chauffeur non assigné ne voit pas la feuille de route', intrusion.statut === 404,
     `statut ${intrusion.statut}`);

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
