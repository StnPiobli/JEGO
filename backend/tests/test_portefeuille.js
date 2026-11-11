/**
 * TEST — SOLDE JEGO RÉUTILISABLE
 *
 *   1. Un remboursement crédite le solde (il ne repart pas sur MoMo)
 *   2. Le solde paie une partie du billet, Mobile Money le reste
 *   3. Le solde paie tout le billet, sans opérateur
 *   4. Billet cadeau remboursé : crédit à l'acheteur, pas au destinataire
 *   5. Billet du guichet : jamais crédité, signalé à l'agence
 *   6. Deux paiements simultanés ne dépensent pas deux fois le même argent
 *
 * Lancement : node tests/test_portefeuille.js
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
let compteur = 0;

async function creerVoyageur(suffixe) {
  const tel = `+2376${suffixe}${U.slice(-7)}`;
  await appel('POST', '/api/voyageurs/inscription', {
    body: {
      nom: 'Test', prenom: suffixe, date_naissance: '1990-01-01',
      lieu_naissance: 'Douala', telephone: tel, email: `w${suffixe}${U}@t.cm`,
      mot_de_passe: 'Client123!'
    }
  });
  const con = await appel('POST', '/api/voyageurs/connexion', {
    body: { telephone: tel, mot_de_passe: 'Client123!' }
  });
  return { tel, token: con.donnees?.token, id: con.donnees?.voyageur?.id };
}

// Verrou puis paiement d'un siège (trajet complet 0 -> 2).
async function acheter(voyageur, trajetId, siegeId, body = {}) {
  await appel('POST', '/api/reservations/verrou', {
    token: voyageur.token,
    body: { trajet_id: trajetId, siege_id: siegeId, point_embarquement_ordre: 0, point_debarquement_ordre: 2 }
  });
  return appel('POST', '/api/reservations/payer', {
    token: voyageur.token,
    headers: { 'Idempotency-Key': `pf-${U}-${++compteur}` },
    body: { trajet_id: trajetId, siege_id: siegeId, point_embarquement_ordre: 0, point_debarquement_ordre: 2, ...body }
  });
}

async function solde(voyageur) {
  const r = await appel('GET', '/api/voyageurs/portefeuille', { token: voyageur.token });
  return r.donnees;
}

async function creerTrajet(agence, ligneId, busId, dansJours) {
  const date = new Date(Date.now() + dansJours * 86400000).toISOString().slice(0, 10);
  const r = await appel('POST', '/api/trajets', {
    token: agence.token,
    body: { ligne_id: ligneId, bus_id: busId, date_depart: date, heure_depart: '08:00', heure_arrivee_estimee: '12:00', prix_base: 5000 }
  });
  const trajetId = r.donnees?.trajet?.id;
  const plan = await appel('GET', `/api/reservations/trajets/${trajetId}/plan`);
  const sieges = ((plan.donnees?.sieges) || []).filter(s => s && s.id && !s.est_premium);
  return { trajetId, sieges };
}

async function main() {
  console.log('\n═══ TEST — SOLDE JEGO ═══\n');

  console.log('0. Mise en place');
  const admin = await pool.query(
    `INSERT INTO membres_admin (nom,prenom,email,mot_de_passe,niveau,statut)
     VALUES ('T','W',$1,$2,0,'actif') RETURNING id`,
    [`pf${U}@jego.cm`, await bcrypt.hash('Pass123!', 10)]
  );
  await pool.query(
    `INSERT INTO membre_roles (membre_id, role_id)
     SELECT $1, id FROM roles WHERE nom='super_admin' ON CONFLICT DO NOTHING`,
    [admin.rows[0].id]
  );
  const tokenAdmin = (await appel('POST', '/api/admin/connexion', {
    body: { email: `pf${U}@jego.cm`, mot_de_passe: 'Pass123!' }
  })).donnees?.token;

  const insc = await appel('POST', '/api/agences/inscription', {
    body: {
      nom: `Agence W${U}`, email: `agw${U}@t.cm`, telephone: `+2376${U}`,
      adresse: 'Akwa', ville: 'Douala', registre_commerce: `RCW${U}`, mot_de_passe: 'Agence123!'
    }
  });
  await appel('PUT', `/api/admin/agences/${insc.donnees.agence.id}/valider`, { token: tokenAdmin });
  const agence = {
    token: (await appel('POST', '/api/agences/connexion', {
      body: { email: `agw${U}@t.cm`, mot_de_passe: 'Agence123!' }
    })).donnees?.token
  };
  ok('Agence validée', !!agence.token);

  const busId = (await appel('POST', '/api/bus', {
    token: agence.token,
    body: { nom: `Bus W${U}`, type_bus: 'standard', disposition: '2+2', nombre_rangees: 8 }
  })).donnees?.bus?.id;
  const ligneId = (await appel('POST', '/api/lignes', {
    token: agence.token,
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

  const t1 = await creerTrajet(agence, ligneId, busId, 5);
  const t2 = await creerTrajet(agence, ligneId, busId, 6);
  ok('Deux trajets créés', !!t1.trajetId && !!t2.trajetId && t1.sieges.length > 8);

  const acheteur = await creerVoyageur('1');
  const destinataire = await creerVoyageur('2');
  ok('Deux voyageurs connectés', !!acheteur.token && !!destinataire.token);

  // ─────────────────────────────────────────────────────
  console.log('\n1. Un remboursement crédite le solde');
  // ─────────────────────────────────────────────────────
  const sansOp = await acheter(acheteur, t1.trajetId, t1.sieges[0].id, { utiliser_solde: true });
  ok('Solde vide et aucun opérateur : paiement refusé', sansOp.statut === 400, JSON.stringify(sansOp.donnees));

  const flex = await acheter(acheteur, t1.trajetId, t1.sieges[0].id, { operateur: 'mtn_momo', est_flexible: true, utiliser_solde: true });
  ok('Billet flexible payé par MoMo', flex.statut === 201, JSON.stringify(flex.donnees));
  ok('Rien pris sur un solde vide', flex.donnees?.billet?.paye_avec_solde === 0);

  const annul = await appel('PUT', `/api/annulations/billets/${flex.donnees?.billet?.id}/annuler`, { token: acheteur.token });
  const credit = annul.donnees?.annulation?.montant_rembourse;
  const escFlex = await pool.query(
    `SELECT e.statut, e.montant_agence, e.montant_jego, e.frais_momo, b.prix_total_client, b.prix_agence
       FROM escrow e JOIN billets b ON b.id = e.billet_id WHERE e.billet_id = $1`,
    [flex.donnees?.billet?.id]
  );
  const ef = escFlex.rows[0];
  ok('Flexible : l\'agence garde sa part (escrow toujours retenu)',
     ef.statut === 'retenu' && ef.montant_agence === ef.prix_agence, JSON.stringify(ef));
  ok('Flexible : JEGO porte le remboursement',
     ef.montant_jego === ef.prix_total_client - ef.frais_momo - ef.montant_agence - (annul.donnees?.annulation?.montant_rembourse || 0),
     JSON.stringify(ef));
  ok('Annulation : 80 % remboursés', annul.statut === 200 && credit === Math.round(flex.donnees.billet.prix_paye * 0.8),
     JSON.stringify(annul.donnees));

  let w = await solde(acheteur);
  ok('Le solde vaut le remboursement', w?.solde === credit, `${w?.solde} vs ${credit}`);
  ok('Le crédit apparaît dans l\'historique', w?.mouvements?.some(m => m.sens === 'credit' && m.montant === credit));

  // ─────────────────────────────────────────────────────
  console.log('\n2. Le solde paie une partie, MoMo le reste');
  // ─────────────────────────────────────────────────────
  const partiel = await acheter(acheteur, t1.trajetId, t1.sieges[1].id, { operateur: 'orange_money', utiliser_solde: true });
  const prix = partiel.donnees?.billet?.prix_paye;
  const momo = prix - credit;
  ok('Billet payé', partiel.statut === 201, JSON.stringify(partiel.donnees));
  ok('Tout le solde est utilisé', partiel.donnees?.billet?.paye_avec_solde === credit);
  ok('MoMo paie le reste', partiel.donnees?.billet?.paye_mobile_money === momo, `${partiel.donnees?.billet?.paye_mobile_money} vs ${momo}`);
  ok('Frais MoMo sur la seule part MoMo', partiel.donnees?.detail_prix?.frais_momo === Math.round(momo * 0.015));

  const p = await pool.query(`SELECT montant, operateur FROM paiements WHERE billet_id = $1`, [partiel.donnees.billet.id]);
  ok('Paiement enregistré pour la part MoMo', p.rows[0]?.montant === momo && p.rows[0]?.operateur === 'orange_money', JSON.stringify(p.rows));
  const pts = await pool.query(
    `SELECT COALESCE(SUM(points),0)::int AS n FROM jego_points WHERE billet_id = $1 AND points > 0`,
    [partiel.donnees.billet.id]
  ).catch(() => null);
  if (pts) ok('Points sur la seule part MoMo', pts.rows[0].n === Math.floor(momo / 1000) * 10, `${pts.rows[0].n}`);

  w = await solde(acheteur);
  ok('Solde retombé à 0', w?.solde === 0, `${w?.solde}`);
  ok('Le débit apparaît dans l\'historique', w?.mouvements?.some(m => m.sens === 'debit' && m.montant === credit));

  // ─────────────────────────────────────────────────────
  console.log('\n3 à 5. Annulation d\'un trajet par l\'agence');
  // ─────────────────────────────────────────────────────
  // Des points pour payer une réduction : l'agence qui annule doit les rendre.
  await pool.query(
    `UPDATE voyageurs SET points_fidelite = 1000
      WHERE RIGHT(REGEXP_REPLACE(telephone, '[^0-9]', '', 'g'), 9) = RIGHT($1, 9)`,
    [acheteur.tel.replace(/\D/g, '')]
  );
  const normal = await acheter(acheteur, t2.trajetId, t2.sieges[0].id, { operateur: 'mtn_momo', utiliser_reduction: true });
  const depenses = normal.donnees?.billet?.points_utilises || 0;
  ok('Réduction payée en points', depenses > 0, JSON.stringify(normal.donnees));
  const cadeau = await acheter(acheteur, t2.trajetId, t2.sieges[1].id, {
    operateur: 'mtn_momo', est_cadeau: true, destinataire_tel: destinataire.tel, destinataire_email: `w2${U}@t.cm`
  });
  ok('Billet normal et billet cadeau achetés', normal.statut === 201 && cadeau.statut === 201, JSON.stringify(cadeau.donnees));
  const pctRow = await pool.query(
    `SELECT pourcentage FROM configuration_frais WHERE type_frais='commission' AND actif=true
     AND tranche_min <= 5000 AND (tranche_max IS NULL OR tranche_max >= 5000) ORDER BY agence_id NULLS LAST LIMIT 1`
  );
  const pct = pctRow.rows.length ? parseFloat(pctRow.rows[0].pourcentage) : 7;
  const guichet = await appel('POST', `/api/reservations/trajets/${t2.trajetId}/vente-guichet`, {
    token: agence.token,
    body: {
      siege_id: t2.sieges[2].id, nom_client: 'Client Guichet', telephone_client: `+2378${U}`,
      montant_recu: 5000 + Math.round(5000 * pct / 100), point_embarquement_ordre: 0, point_debarquement_ordre: 2
    }
  });
  ok('Billet guichet vendu', guichet.statut === 201, JSON.stringify(guichet.donnees));

  const annulTrajet = await appel('PUT', `/api/trajets/${t2.trajetId}/annuler`, { token: agence.token });
  ok('Trajet annulé', annulTrajet.statut === 200, JSON.stringify(annulTrajet.donnees));
  ok('Deux billets crédités sur un solde', annulTrajet.donnees?.billets_rembourses === 2, `${annulTrajet.donnees?.billets_rembourses}`);
  ok('Billet guichet signalé à l\'agence (espèces)', annulTrajet.donnees?.billets_guichet === 1
     && /espèces/.test(annulTrajet.donnees?.message || ''), annulTrajet.donnees?.message);

  const rendus = await pool.query(
    `SELECT COALESCE(SUM(points),0)::int AS n FROM jego_points WHERE billet_id = $1 AND motif LIKE 'Points rendus%'`,
    [normal.donnees.billet.id]
  );
  ok('Points de la réduction rendus', rendus.rows[0].n === depenses, `${rendus.rows[0].n} vs ${depenses}`);

  w = await solde(acheteur);
  const attendu = normal.donnees.billet.prix_paye + cadeau.donnees.billet.prix_paye;
  ok('Cadeau remboursé à l\'acheteur', w?.solde === attendu, `${w?.solde} vs ${attendu}`);
  const wDest = await solde(destinataire);
  ok('Le destinataire du cadeau n\'est pas crédité', wDest?.solde === 0, `${wDest?.solde}`);

  const clientGuichet = await pool.query(
    `SELECT b.voyageur_id FROM billets b WHERE b.trajet_id = $1 AND b.source_vente = 'physique'`, [t2.trajetId]
  );
  const { soldeDisponible } = require('../services/portefeuilleService');
  ok('Le client du guichet n\'a aucun solde', (await soldeDisponible(clientGuichet.rows[0].voyageur_id)) === 0);

  // ─────────────────────────────────────────────────────
  console.log('\n3. Le solde paie tout le billet, sans opérateur');
  // ─────────────────────────────────────────────────────
  const total = await acheter(acheteur, t1.trajetId, t1.sieges[2].id, { utiliser_solde: true });
  ok('Billet payé sans opérateur', total.statut === 201, JSON.stringify(total.donnees));
  ok('Rien payé par MoMo', total.donnees?.billet?.paye_mobile_money === 0 && total.donnees?.detail_prix?.frais_momo === 0);
  const p3 = await pool.query(`SELECT montant, operateur FROM paiements WHERE billet_id = $1`, [total.donnees?.billet?.id]);
  ok('Paiement marqué « portefeuille »', p3.rows[0]?.operateur === 'portefeuille' && p3.rows[0]?.montant === 0, JSON.stringify(p3.rows));
  w = await solde(acheteur);
  ok('Solde diminué du prix', w?.solde === attendu - total.donnees.billet.prix_paye, `${w?.solde}`);

  // ─────────────────────────────────────────────────────
  console.log('\n6. Paiements simultanés');
  // ─────────────────────────────────────────────────────
  const avant = w.solde;
  for (const s of [t1.sieges[3], t1.sieges[4]]) {
    await appel('POST', '/api/reservations/verrou', {
      token: acheteur.token,
      body: { trajet_id: t1.trajetId, siege_id: s.id, point_embarquement_ordre: 0, point_debarquement_ordre: 2 }
    });
  }
  const [a, b] = await Promise.all([t1.sieges[3], t1.sieges[4]].map(s => appel('POST', '/api/reservations/payer', {
    token: acheteur.token,
    headers: { 'Idempotency-Key': `pf-${U}-${++compteur}` },
    body: { trajet_id: t1.trajetId, siege_id: s.id, point_embarquement_ordre: 0, point_debarquement_ordre: 2, operateur: 'mtn_momo', utiliser_solde: true }
  })));
  const pris = (a.donnees?.billet?.paye_avec_solde || 0) + (b.donnees?.billet?.paye_avec_solde || 0);
  ok('Les deux paiements passent', a.statut === 201 && b.statut === 201, `${a.statut} ${b.statut}`);
  ok('Le solde n\'est pas dépensé deux fois', pris === avant, `${pris} pris pour ${avant} disponibles`);
  w = await solde(acheteur);
  ok('Solde jamais négatif', w?.solde === 0, `${w?.solde}`);

  // ─────────────────────────────────────────────────────
  console.log('\n7. Jamais plus que le prix payé');
  // ─────────────────────────────────────────────────────
  {
    const { rembourserBillet } = require('../services/portefeuilleService');
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const billetId = partiel.donnees.billet.id;
      const r1 = await rembourserBillet(billetId, { motif: 'litige', pourcentage: 100 }, c);
      const r2 = await rembourserBillet(billetId, { motif: 'litige', pourcentage: 100 }, c);
      ok('Premier remboursement = prix payé', r1.montant === partiel.donnees.billet.prix_paye, `${r1.montant}`);
      ok('Second remboursement du même billet = 0', r2.montant === 0, `${r2.montant}`);
      const e = (await c.query('SELECT statut, montant_agence, montant_jego, frais_momo FROM escrow WHERE billet_id = $1', [billetId])).rows[0];
      ok('Agence non versée, JEGO perd frais et commission',
         e.statut === 'rembourse' && e.montant_agence === 0 && e.montant_jego === -e.frais_momo, JSON.stringify(e));
    } finally {
      await c.query('ROLLBACK');
      c.release();
    }
  }

  // ─────────────────────────────────────────────────────
  console.log('\n8. Retard : points à partir de 4 h, jamais d\'argent');
  // ─────────────────────────────────────────────────────
  {
    const { appliquerBaremeRetard } = require('../services/retardService');
    const pts = await pool.query(`SELECT valeur FROM parametres_systeme WHERE cle = 'retard_points_compensation'`);
    const attenduPts = parseInt(pts.rows[0]?.valeur ?? '500', 10);
    for (const [heures, attendu] of [[3, 0], [5, attenduPts]]) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query(`UPDATE billets SET statut = 'utilise' WHERE id = $1`, [partiel.donnees.billet.id]);
        await c.query(
          `UPDATE trajets SET heure_arrivee_initiale = '08:00',
                  heure_arrivee_reelle = (date_depart + TIME '08:00') + ($2 || ' hours')::interval
            WHERE id = $1`,
          [t1.trajetId, String(heures)]
        );
        const avant = (await c.query(`SELECT COUNT(*)::int AS n FROM remboursements`)).rows[0].n;
        const r = await appliquerBaremeRetard(c, t1.trajetId);
        const apres = (await c.query(`SELECT COUNT(*)::int AS n FROM remboursements`)).rows[0].n;
        ok(`Retard ${heures} h : ${attendu} points`, r.points_offerts === attendu, JSON.stringify(r));
        ok(`Retard ${heures} h : aucun remboursement en argent`, apres === avant);
      } finally {
        await c.query('ROLLBACK');
        c.release();
      }
    }
  }

  // ─────────────────────────────────────────────────────
  console.log('\n9. Supprimer un trajet qui a des billets en ligne');
  // ─────────────────────────────────────────────────────
  const suppr = await appel('DELETE', `/api/trajets/${t1.trajetId}`, { token: agence.token });
  ok('Suppression acceptée', suppr.statut === 200, JSON.stringify(suppr.donnees));
  ok('Les voyageurs sont remboursés', (suppr.donnees?.billets_rembourses || 0) > 0, JSON.stringify(suppr.donnees));

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
