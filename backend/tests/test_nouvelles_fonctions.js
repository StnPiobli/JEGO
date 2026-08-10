/**
 * TEST — NOUVELLES FONCTIONNALITÉS
 *
 *   1. Changement de mot de passe chauffeur (par lui seul)
 *   2. Renvoi d'identifiants par l'agence (sans voir le mot de passe)
 *   3. Annulation d'un billet guichet par l'agence (espèces)
 *   4. Espace dénonciation voyageur (distinct du litige)
 *
 * Tout passe par les vraies routes HTTP contre la vraie base.
 *
 * Prérequis : database/seed_admin.sql appliqué.
 * Lancement : node tests/test_nouvelles_fonctions.js
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
  console.log('\n═══ TEST — NOUVELLES FONCTIONNALITÉS ═══\n');

  // ── Mise en place : admin, agence validée, bus, ligne, trajet ──
  console.log('0. Mise en place');
  const mdpAdmin = 'AdminTest123!';
  const admin = await pool.query(
    `INSERT INTO membres_admin (nom, prenom, email, mot_de_passe, niveau, statut)
     VALUES ('T','Admin',$1,$2,0,'actif') RETURNING id`,
    [`adm${U}@jego.cm`, await bcrypt.hash(mdpAdmin, 10)]
  );
  await pool.query(
    `INSERT INTO membre_roles (membre_id, role_id)
     SELECT $1, id FROM roles WHERE nom='super_admin' ON CONFLICT DO NOTHING`,
    [admin.rows[0].id]
  );
  const tokenAdmin = (await appel('POST', '/api/admin/connexion', {
    body: { email: `adm${U}@jego.cm`, mot_de_passe: mdpAdmin }
  })).donnees?.token;
  ok('Admin connecté', !!tokenAdmin);

  const insc = await appel('POST', '/api/agences/inscription', {
    body: {
      nom: `Agence ${U}`, email: `ag${U}@test.cm`, telephone: `+2376${U}`,
      adresse: 'Akwa', ville: 'Douala', registre_commerce: `RC${U}`,
      mot_de_passe: 'AgenceTest123!'
    }
  });
  const agenceId = insc.donnees?.agence?.id;
  await appel('PUT', `/api/admin/agences/${agenceId}/valider`, { token: tokenAdmin });
  const tokenAgence = (await appel('POST', '/api/agences/connexion', {
    body: { email: `ag${U}@test.cm`, mot_de_passe: 'AgenceTest123!' }
  })).donnees?.token;
  ok('Agence validée et connectée', !!tokenAgence);

  const busId = (await appel('POST', '/api/bus', {
    token: tokenAgence,
    body: { nom: `Bus ${U}`, type_bus: 'standard', disposition: '2+2', nombre_rangees: 8 }
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
  ok('Trajet de test créé', !!trajetId);

  // ─────────────────────────────────────────────────────
  console.log('\n1. MOT DE PASSE CHAUFFEUR (par lui seul)');
  // ─────────────────────────────────────────────────────
  const telCh = `+2379${U}`;
  const mdpInitial = 'Chauffeur123!';
  const chauffeurId = (await appel('POST', '/api/chauffeurs', {
    token: tokenAgence,
    body: {
      nom: 'Eto', prenom: 'Paul', date_naissance: '1985-03-10',
      lieu_naissance: 'Douala', telephone: telCh, mot_de_passe: mdpInitial
    }
  })).donnees?.chauffeur?.id;
  ok('Chauffeur créé', !!chauffeurId);

  const tokenCh = (await appel('POST', '/api/chauffeurs/connexion', {
    body: { telephone: telCh, mot_de_passe: mdpInitial }
  })).donnees?.token;
  ok('Chauffeur connecté', !!tokenCh);

  // Mauvais mot de passe actuel -> refusé
  const mauvais = await appel('PUT', '/api/chauffeurs/mon-mot-de-passe', {
    token: tokenCh,
    body: { mot_de_passe_actuel: 'FauxMotDePasse!', nouveau_mot_de_passe: 'NouveauPass456!' }
  });
  ok('Changement refusé si mot de passe actuel faux', mauvais.statut === 401,
     JSON.stringify(mauvais.donnees));

  // Trop court -> refusé
  const court = await appel('PUT', '/api/chauffeurs/mon-mot-de-passe', {
    token: tokenCh,
    body: { mot_de_passe_actuel: mdpInitial, nouveau_mot_de_passe: 'court' }
  });
  ok('Changement refusé si nouveau mot de passe trop court', court.statut === 400);

  // Changement valide
  const nouveauMdp = 'NouveauPass456!';
  const change = await appel('PUT', '/api/chauffeurs/mon-mot-de-passe', {
    token: tokenCh,
    body: { mot_de_passe_actuel: mdpInitial, nouveau_mot_de_passe: nouveauMdp }
  });
  ok('Chauffeur change son mot de passe', change.statut === 200, JSON.stringify(change.donnees));

  const ancienRefuse = await appel('POST', '/api/chauffeurs/connexion', {
    body: { telephone: telCh, mot_de_passe: mdpInitial }
  });
  ok('Ancien mot de passe ne fonctionne plus', ancienRefuse.statut === 401);

  const nouveauMarche = await appel('POST', '/api/chauffeurs/connexion', {
    body: { telephone: telCh, mot_de_passe: nouveauMdp }
  });
  ok('Nouveau mot de passe fonctionne', nouveauMarche.statut === 200);

  // L'AGENCE ne doit pas pouvoir changer le mot de passe du chauffeur
  const agenceTente = await appel('PUT', '/api/chauffeurs/mon-mot-de-passe', {
    token: tokenAgence,
    body: { mot_de_passe_actuel: nouveauMdp, nouveau_mot_de_passe: 'AgencePirate1!' }
  });
  ok('L\'agence ne peut PAS changer le mot de passe du chauffeur',
     agenceTente.statut === 403, `statut ${agenceTente.statut}`);

  // ─────────────────────────────────────────────────────
  console.log('\n2. RENVOI D\'IDENTIFIANTS PAR L\'AGENCE');
  // ─────────────────────────────────────────────────────
  const renvoi = await appel('POST', `/api/chauffeurs/${chauffeurId}/renvoyer-identifiants`, {
    token: tokenAgence
  });
  ok('Agence renvoie les identifiants', renvoi.statut === 200, JSON.stringify(renvoi.donnees));
  ok('Le mot de passe n\'est JAMAIS exposé à l\'agence',
     !JSON.stringify(renvoi.donnees).match(/mot_de_passe|password|provisoire\s*:/i),
     JSON.stringify(renvoi.donnees));

  const apresRenvoi = await appel('POST', '/api/chauffeurs/connexion', {
    body: { telephone: telCh, mot_de_passe: nouveauMdp }
  });
  ok('L\'ancien mot de passe est invalidé par le renvoi', apresRenvoi.statut === 401);

  // ─────────────────────────────────────────────────────
  console.log('\n3. ANNULATION BILLET GUICHET PAR L\'AGENCE');
  // ─────────────────────────────────────────────────────
  const plan = await appel('GET', `/api/reservations/trajets/${trajetId}/plan`);
  const liste = (plan.donnees?.sieges || plan.donnees?.plan || []).flat();
  const siegeA = liste[0], siegeB = liste[1];

  const grille = await pool.query(
    `SELECT pourcentage FROM configuration_frais WHERE type_frais='commission' AND actif=true
     AND tranche_min <= 5000 AND (tranche_max IS NULL OR tranche_max >= 5000)
     ORDER BY agence_id NULLS LAST LIMIT 1`
  );
  const pct = grille.rows.length ? parseFloat(grille.rows[0].pourcentage) : 7;
  const prixGuichet = 5000 + Math.round(5000 * pct / 100);

  const vente = await appel('POST', `/api/reservations/trajets/${trajetId}/vente-guichet`, {
    token: tokenAgence,
    body: {
      siege_id: siegeA?.id, nom_client: 'Marie Fotso',
      telephone_client: `+2378${U}`, montant_recu: prixGuichet,
      point_embarquement_ordre: 0, point_debarquement_ordre: 1
    }
  });
  ok('Vente guichet réalisée', vente.statut === 201, JSON.stringify(vente.donnees));
  const billetGuichetId = vente.donnees?.billet?.id;

  const annul = await appel('PUT', `/api/annulations/billets/${billetGuichetId}/annuler-guichet`, {
    token: tokenAgence, body: { motif: 'Client renonce au voyage' }
  });
  ok('Agence annule le billet guichet', annul.statut === 200, JSON.stringify(annul.donnees));
  ok('Montant à rembourser en espèces correct',
     annul.donnees?.annulation?.montant_a_rembourser_especes === prixGuichet,
     `${annul.donnees?.annulation?.montant_a_rembourser_especes} vs ${prixGuichet}`);

  const etatBillet = await pool.query(`SELECT statut FROM billets WHERE id = $1`, [billetGuichetId]);
  ok('Billet passé en "annule"', etatBillet.rows[0]?.statut === 'annule');

  const etatEscrow = await pool.query(`SELECT statut FROM escrow WHERE billet_id = $1`, [billetGuichetId]);
  ok('Escrow ne partira pas à l\'agence', etatEscrow.rows[0]?.statut === 'rembourse',
     `statut=${etatEscrow.rows[0]?.statut}`);

  // Le siège est de nouveau vendable
  const revente = await appel('POST', `/api/reservations/trajets/${trajetId}/vente-guichet`, {
    token: tokenAgence,
    body: {
      siege_id: siegeA?.id, nom_client: 'Autre Client',
      telephone_client: `+23770${U.slice(0,7)}`, montant_recu: prixGuichet,
      point_embarquement_ordre: 0, point_debarquement_ordre: 1
    }
  });
  ok('Siège libéré et revendable après annulation', revente.statut === 201,
     JSON.stringify(revente.donnees));

  // Un billet en ligne ne peut PAS être annulé par l'agence
  const emailVoy = `cli${U}@test.cm`, telVoy = `+2377${U}`, mdpVoy = 'ClientTest123!';
  await appel('POST', '/api/voyageurs/inscription', {
    body: {
      nom: 'Dupont', prenom: 'Jean', date_naissance: '1990-05-15',
      lieu_naissance: 'Douala', telephone: telVoy, email: emailVoy, mot_de_passe: mdpVoy
    }
  });
  const tokenVoy = (await appel('POST', '/api/voyageurs/connexion', {
    body: { telephone: telVoy, mot_de_passe: mdpVoy }
  })).donnees?.token;

  await appel('POST', '/api/reservations/verrou', {
    token: tokenVoy,
    body: { trajet_id: trajetId, siege_id: siegeB?.id, point_embarquement_ordre: 0, point_debarquement_ordre: 1 }
  });
  const paie = await appel('POST', '/api/reservations/payer', {
    token: tokenVoy,
    headers: { 'Idempotency-Key': `idem-${U}` },
    body: {
      trajet_id: trajetId, siege_id: siegeB?.id, operateur: 'mtn_momo',
      point_embarquement_ordre: 0, point_debarquement_ordre: 1
    }
  });
  const billetEnLigneId = paie.donnees?.billet?.id;
  ok('Billet en ligne acheté', paie.statut === 201, JSON.stringify(paie.donnees));

  const refus = await appel('PUT', `/api/annulations/billets/${billetEnLigneId}/annuler-guichet`, {
    token: tokenAgence, body: { motif: 'tentative' }
  });
  ok('Agence NE PEUT PAS annuler un billet acheté en ligne', refus.statut === 403,
     JSON.stringify(refus.donnees));

  // ─────────────────────────────────────────────────────
  console.log('\n4. ESPACE DÉNONCIATION VOYAGEUR');
  // ─────────────────────────────────────────────────────

  // Avant le départ : aucun billet dénonçable
  const avantDepart = await appel('GET', '/api/denonciations/billets-denoncables', { token: tokenVoy });
  ok('Avant départ : aucun billet dénonçable', avantDepart.donnees?.nombre === 0,
     JSON.stringify(avantDepart.donnees));

  const denonceTrop = await appel('POST', '/api/denonciations', {
    token: tokenVoy,
    body: { billet_id: billetEnLigneId, categorie: 'conduite_dangereuse', raison: 'Le chauffeur roulait beaucoup trop vite sur la nationale 3.' }
  });
  ok('Dénonciation refusée avant le départ du bus', denonceTrop.statut === 400,
     JSON.stringify(denonceTrop.donnees));

  // Le bus part et arrive
  const chId2 = (await appel('POST', '/api/chauffeurs', {
    token: tokenAgence,
    body: {
      nom: 'Nkeng', prenom: 'Luc', date_naissance: '1980-01-01',
      lieu_naissance: 'Douala', telephone: `+23769${U.slice(0,7)}`, mot_de_passe: 'Chauffeur999!'
    }
  })).donnees?.chauffeur?.id;
  await appel('PUT', `/api/trajets/${trajetId}/chauffeur`, {
    token: tokenAgence, body: { chauffeur_id: chId2 }
  });
  const tokenCh2 = (await appel('POST', '/api/chauffeurs/connexion', {
    body: { telephone: `+23769${U.slice(0,7)}`, mot_de_passe: 'Chauffeur999!' }
  })).donnees?.token;

  await pool.query(
    `UPDATE trajets SET date_depart = CURRENT_DATE, heure_depart = '00:01' WHERE id = $1`,
    [trajetId]
  );
  await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/depart`, { token: tokenCh2 });
  await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/arrivee`, { token: tokenCh2 });

  const apresArrivee = await appel('GET', '/api/denonciations/billets-denoncables', { token: tokenVoy });
  ok('Après arrivée : le billet réel est proposé', apresArrivee.donnees?.nombre >= 1,
     JSON.stringify(apresArrivee.donnees).slice(0, 200));
  ok('Le billet proposé est bien un VRAI billet du voyageur',
     apresArrivee.donnees?.billets?.some(b => b.billet_id === billetEnLigneId));

  // Raison trop courte -> refusée
  const courte = await appel('POST', '/api/denonciations', {
    token: tokenVoy,
    body: { billet_id: billetEnLigneId, categorie: 'securite', raison: 'trop court' }
  });
  ok('Raison trop courte refusée', courte.statut === 400);

  // Catégorie invalide -> refusée
  const catInvalide = await appel('POST', '/api/denonciations', {
    token: tokenVoy,
    body: { billet_id: billetEnLigneId, categorie: 'nimporte_quoi', raison: 'Une raison suffisamment longue pour passer la validation.' }
  });
  ok('Catégorie invalide refusée', catInvalide.statut === 400);

  // Dénonciation valide
  const denonce = await appel('POST', '/api/denonciations', {
    token: tokenVoy,
    body: {
      billet_id: billetEnLigneId, categorie: 'conduite_dangereuse',
      raison: 'Le chauffeur a doublé plusieurs fois en pleine ligne continue, les passagers ont eu peur.'
    }
  });
  ok('Dénonciation ouverte après le voyage', denonce.statut === 201, JSON.stringify(denonce.donnees));
  const denonciationId = denonce.donnees?.denonciation?.id;

  // Doublon interdit
  const doublon = await appel('POST', '/api/denonciations', {
    token: tokenVoy,
    body: { billet_id: billetEnLigneId, categorie: 'securite', raison: 'Une autre raison assez longue pour valider le champ.' }
  });
  ok('Deuxième dénonciation sur le même billet refusée', doublon.statut === 409);

  // L'agence ET l'admin ont été notifiés
  const notifs = await pool.query(
    `SELECT destinataire_type FROM notifications WHERE type = 'denonciation_ouverte'
     AND cree_le > NOW() - INTERVAL '2 minutes'`
  );
  const types = notifs.rows.map(r => r.destinataire_type);
  ok('Agence notifiée', types.includes('agence'));
  ok('Admin notifié simultanément', types.includes('admin'));

  // L'agence voit le dossier et dépose ses observations
  const vueAgence = await appel('GET', '/api/denonciations/mes-denonciations', { token: tokenAgence });
  ok('L\'agence voit la dénonciation', vueAgence.donnees?.nombre >= 1,
     JSON.stringify(vueAgence.donnees).slice(0, 200));

  const obs = await appel('PUT', `/api/denonciations/${denonciationId}/observation`, {
    token: tokenAgence,
    body: { observation: 'Le chauffeur conteste : le tachygraphe indique une vitesse conforme.' }
  });
  ok('Agence dépose ses observations', obs.statut === 200, JSON.stringify(obs.donnees));

  const statutApresObs = await pool.query(
    `SELECT statut FROM denonciations WHERE id = $1`, [denonciationId]
  );
  ok('Statut passé en "observation_agence"',
     statutApresObs.rows[0]?.statut === 'observation_agence');

  // L'agence ne peut PAS clore le dossier
  const agenceCloture = await appel('PUT', `/api/denonciations/${denonciationId}/decision`, {
    token: tokenAgence, body: { decision: 'Je classe sans suite', statut: 'classee' }
  });
  ok('L\'agence NE PEUT PAS clore le dossier', agenceCloture.statut === 403,
     `statut ${agenceCloture.statut}`);

  // L'admin instruit et tranche
  const listeAdmin = await appel('GET', '/api/denonciations/admin/tous', { token: tokenAdmin });
  ok('Admin voit les dossiers à instruire', listeAdmin.donnees?.nombre >= 1,
     JSON.stringify(listeAdmin.donnees).slice(0, 200));

  const tranche = await appel('PUT', `/api/denonciations/${denonciationId}/decision`, {
    token: tokenAdmin,
    body: { decision: 'Faits retenus. Avertissement adressé à l\'agence.', statut: 'traitee' }
  });
  ok('Admin tranche la dénonciation', tranche.statut === 200, JSON.stringify(tranche.donnees));

  const dejaTranche = await appel('PUT', `/api/denonciations/${denonciationId}/decision`, {
    token: tokenAdmin, body: { decision: 'Rejugement', statut: 'classee' }
  });
  ok('Dossier déjà tranché : nouvelle décision refusée', dejaTranche.statut === 400);

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
