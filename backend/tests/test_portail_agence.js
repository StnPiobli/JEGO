/**
 * TEST — ROUTES DU PORTAIL AGENCE
 *
 *   1. Liste des passagers d'un trajet (page Réservations)
 *   2. Versements escrow reçus par l'agence (page Paiements)
 *
 * Vérifie aussi le cloisonnement : une agence ne doit jamais voir
 * les passagers ni les versements d'une autre agence.
 *
 * Lancement : node tests/test_portail_agence.js
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

async function creerAgence(suffixe, tokenAdmin) {
  const S = `${U}${suffixe}`;
  const insc = await appel('POST', '/api/agences/inscription', {
    body: {
      nom: `Agence ${S}`, email: `ag${S}@t.cm`, telephone: `+2376${S}`,
      adresse: 'Akwa', ville: 'Douala', registre_commerce: `RC${S}`,
      mot_de_passe: 'Agence123!'
    }
  });
  await appel('PUT', `/api/admin/agences/${insc.donnees.agence.id}/valider`, { token: tokenAdmin });
  const token = (await appel('POST', '/api/agences/connexion', {
    body: { email: `ag${S}@t.cm`, mot_de_passe: 'Agence123!' }
  })).donnees?.token;
  return { id: insc.donnees.agence.id, token, S };
}

async function main() {
  console.log('\n═══ TEST — PORTAIL AGENCE ═══\n');

  console.log('0. Mise en place');
  const admin = await pool.query(
    `INSERT INTO membres_admin (nom,prenom,email,mot_de_passe,niveau,statut)
     VALUES ('T','A',$1,$2,0,'actif') RETURNING id`,
    [`pa${U}@jego.cm`, await bcrypt.hash('Pass123!', 10)]
  );
  await pool.query(
    `INSERT INTO membre_roles (membre_id, role_id)
     SELECT $1, id FROM roles WHERE nom='super_admin' ON CONFLICT DO NOTHING`,
    [admin.rows[0].id]
  );
  const tokenAdmin = (await appel('POST', '/api/admin/connexion', {
    body: { email: `pa${U}@jego.cm`, mot_de_passe: 'Pass123!' }
  })).donnees?.token;
  ok('Admin connecté', !!tokenAdmin);

  const agenceA = await creerAgence('a', tokenAdmin);
  const agenceB = await creerAgence('b', tokenAdmin);
  ok('Deux agences validées', !!agenceA.token && !!agenceB.token);

  const busId = (await appel('POST', '/api/bus', {
    token: agenceA.token,
    body: { nom: `Bus ${U}`, type_bus: 'standard', disposition: '2+2', nombre_rangees: 8 }
  })).donnees?.bus?.id;

  const ligneId = (await appel('POST', '/api/lignes', {
    token: agenceA.token,
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

  const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const trajetId = (await appel('POST', '/api/trajets', {
    token: agenceA.token,
    body: {
      ligne_id: ligneId, bus_id: busId, date_depart: demain,
      heure_depart: '08:00', heure_arrivee_estimee: '12:00', prix_base: 5000
    }
  })).donnees?.trajet?.id;
  ok('Trajet créé', !!trajetId);

  // Un voyageur achète en ligne, un autre au guichet
  const tel = `+2377${U}`;
  await appel('POST', '/api/voyageurs/inscription', {
    body: {
      nom: 'Dupont', prenom: 'Jean', date_naissance: '1990-01-01',
      lieu_naissance: 'Douala', telephone: tel, email: `v${U}@t.cm`,
      mot_de_passe: 'Client123!'
    }
  });
  const tokenVoy = (await appel('POST', '/api/voyageurs/connexion', {
    body: { telephone: tel, mot_de_passe: 'Client123!' }
  })).donnees?.token;

  const plan = await appel('GET', `/api/reservations/trajets/${trajetId}/plan`);
  const sieges = ((plan.donnees?.sieges) || []).filter(s => s && s.id);

  // En ligne, sur le tronçon Douala -> Loum
  await appel('POST', '/api/reservations/verrou', {
    token: tokenVoy,
    body: { trajet_id: trajetId, siege_id: sieges[0].id, point_embarquement_ordre: 0, point_debarquement_ordre: 1 }
  });
  const enLigne = await appel('POST', '/api/reservations/payer', {
    token: tokenVoy,
    headers: { 'Idempotency-Key': `pa-${U}` },
    body: {
      trajet_id: trajetId, siege_id: sieges[0].id, operateur: 'mtn_momo',
      point_embarquement_ordre: 0, point_debarquement_ordre: 1
    }
  });
  ok('Billet en ligne acheté', enLigne.statut === 201, JSON.stringify(enLigne.donnees));

  // Au guichet, trajet complet
  const grille = await pool.query(
    `SELECT pourcentage FROM configuration_frais WHERE type_frais='commission' AND actif=true
     AND tranche_min <= 5000 AND (tranche_max IS NULL OR tranche_max >= 5000)
     ORDER BY agence_id NULLS LAST LIMIT 1`
  );
  const pct = grille.rows.length ? parseFloat(grille.rows[0].pourcentage) : 7;
  const guichet = await appel('POST', `/api/reservations/trajets/${trajetId}/vente-guichet`, {
    token: agenceA.token,
    body: {
      siege_id: sieges[1].id, nom_client: 'Marie Fotso',
      telephone_client: `+2378${U}`, montant_recu: 5000 + Math.round(5000 * pct / 100),
      point_embarquement_ordre: 0, point_debarquement_ordre: 2
    }
  });
  ok('Billet guichet vendu', guichet.statut === 201, JSON.stringify(guichet.donnees));

  // ─────────────────────────────────────────────────────
  console.log('\n1. PAGE RÉSERVATIONS — liste des passagers');
  // ─────────────────────────────────────────────────────
  const passagers = await appel('GET', `/api/trajets/${trajetId}/passagers`, { token: agenceA.token });
  ok('Liste accessible', passagers.statut === 200, JSON.stringify(passagers.donnees).slice(0, 200));
  ok('Deux passagers listés', passagers.donnees?.nombre_passagers === 2,
     `${passagers.donnees?.nombre_passagers}`);

  const liste = passagers.donnees?.passagers || [];
  ok('Origine de vente distinguée (en ligne / guichet)',
     liste.some(p => p.source_vente === 'en_ligne') && liste.some(p => p.source_vente === 'physique'),
     JSON.stringify(liste.map(p => p.source_vente)));
  ok('Segment de chaque passager renseigné',
     liste.every(p => p.point_embarquement_ordre !== null && p.point_debarquement_ordre !== null));
  ok('Le passager du tronçon descend bien à Loum',
     liste.some(p => p.point_debarquement_ordre === 1 && p.ville_debarquement === 'loum'),
     JSON.stringify(liste.map(p => p.ville_debarquement)));
  ok('Numéro de siège et coordonnées présents',
     liste.every(p => p.siege && p.telephone));
  ok('Capacité du bus renvoyée', parseInt(passagers.donnees?.trajet?.capacite) > 0,
     `${passagers.donnees?.trajet?.capacite}`);

  // Cloisonnement
  const intrusion = await appel('GET', `/api/trajets/${trajetId}/passagers`, { token: agenceB.token });
  ok('Une autre agence ne voit PAS les passagers', intrusion.statut === 404,
     `statut ${intrusion.statut}`);

  const sansToken = await appel('GET', `/api/trajets/${trajetId}/passagers`);
  ok('Accès refusé sans authentification', sansToken.statut === 401,
     `statut ${sansToken.statut}`);

  // ─────────────────────────────────────────────────────
  console.log('\n2. PAGE PAIEMENTS — versements escrow');
  // ─────────────────────────────────────────────────────
  const versements = await appel('GET', '/api/agences/versements', { token: agenceA.token });
  ok('Versements accessibles', versements.statut === 200,
     JSON.stringify(versements.donnees).slice(0, 200));

  const resume = versements.donnees?.resume;
  ok('Résumé financier présent', !!resume, JSON.stringify(resume));
  ok('Deux billets comptabilisés', parseInt(resume?.nombre_billets) === 2,
     `${resume?.nombre_billets}`);
  ok('Montant en attente non nul (arrivée pas encore déclarée)',
     parseInt(resume?.en_attente) > 0, `${resume?.en_attente}`);
  ok('Rien encore versé', parseInt(resume?.deja_verse) === 0, `${resume?.deja_verse}`);
  ok('Commission JEGO calculée', parseInt(resume?.commission_jego) > 0,
     `${resume?.commission_jego}`);

  const detail = versements.donnees?.versements || [];
  ok('Détail par trajet fourni', detail.length >= 1, `${detail.length} ligne(s)`);
  ok('Le trajet du jour figure dans le détail',
     detail.some(v => v.trajet_id === trajetId));
  ok('Versement marqué comme non effectué',
     detail.find(v => v.trajet_id === trajetId)?.entierement_verse === false);

  // Cloisonnement financier : l'agence B n'a rien vendu
  const versB = await appel('GET', '/api/agences/versements', { token: agenceB.token });
  ok('Une autre agence ne voit aucun versement',
     parseInt(versB.donnees?.resume?.nombre_billets) === 0,
     `${versB.donnees?.resume?.nombre_billets}`);

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
