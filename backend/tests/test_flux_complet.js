/**
 * TEST DE BOUT EN BOUT — FLUX RÉEL JEGO
 *
 * Suit le chemin réel de la donnée :
 *   admin valide l'agence -> agence publie -> client cherche, réserve,
 *   paie -> chauffeur scanne -> arrivée -> avis -> litige tranché.
 *
 * Aucune donnée fictive : tout passe par les vraies routes HTTP contre
 * la vraie base PostgreSQL.
 *
 * Lancement : node tests/test_flux_complet.js
 */

const pool = require('../config/database');
const bcrypt = require('bcrypt');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

let reussis = 0;
let echoues = 0;
const erreurs = [];

function ok(nom, condition, detail = '') {
  if (condition) {
    reussis++;
    console.log(`  ✅ ${nom}`);
  } else {
    echoues++;
    erreurs.push(`${nom}${detail ? ' -> ' + detail : ''}`);
    console.log(`  ❌ ${nom}${detail ? ' -> ' + detail : ''}`);
  }
}

async function appel(methode, chemin, { token, body, headers = {} } = {}) {
  const opts = { method: methode, headers: { ...headers } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  const rep = await fetch(`${BASE}${chemin}`, opts);
  let donnees = null;
  try { donnees = await rep.json(); } catch (e) { donnees = null; }
  return { statut: rep.status, donnees };
}

// Suffixe unique pour ne jamais entrer en collision avec des données
// existantes si le script est relancé.
const U = Date.now().toString().slice(-9);

async function main() {
  console.log('\n═══ TEST DE BOUT EN BOUT — FLUX RÉEL JEGO ═══\n');

  // ─────────────────────────────────────────────────────
  console.log('1. PRÉPARATION — compte admin');
  // ─────────────────────────────────────────────────────
  const mdpAdmin = 'AdminTest123!';
  const hashAdmin = await bcrypt.hash(mdpAdmin, 10);
  const emailAdmin = `admin${U}@jego.cm`;
  const admin = await pool.query(
    `INSERT INTO membres_admin (nom, prenom, email, mot_de_passe, niveau, statut)
     VALUES ('Piobli', 'Stephane', $1, $2, 0, 'actif') RETURNING id`,
    [emailAdmin, hashAdmin]
  );
  ok('Compte Super Admin créé', admin.rows.length === 1);

  // Rattachement au rôle super_admin (créé par database/seed_admin.sql).
  // Sans ce rattachement, verifierPermission() refuse tout.
  const rattache = await pool.query(
    `INSERT INTO membre_roles (membre_id, role_id)
     SELECT $1, r.id FROM roles r WHERE r.nom = 'super_admin'
     ON CONFLICT DO NOTHING RETURNING role_id`,
    [admin.rows[0].id]
  );
  ok('Rôle super_admin rattaché (seed_admin.sql appliqué)', rattache.rows.length === 1,
     'Lance database/seed_admin.sql si ce test échoue');

  const cnxAdmin = await appel('POST', '/api/admin/connexion', {
    body: { email: emailAdmin, mot_de_passe: mdpAdmin }
  });
  ok('Connexion admin', cnxAdmin.statut === 200 && !!cnxAdmin.donnees?.token,
     JSON.stringify(cnxAdmin.donnees));
  const tokenAdmin = cnxAdmin.donnees?.token;

  // ─────────────────────────────────────────────────────
  console.log('\n2. AGENCE — inscription puis validation par l\'admin');
  // ─────────────────────────────────────────────────────
  const emailAgence = `agence${U}@test.cm`;
  const mdpAgence = 'AgenceTest123!';
  const inscAgence = await appel('POST', '/api/agences/inscription', {
    body: {
      nom: `Touristique Express ${U}`,
      email: emailAgence,
      telephone: `+2376${U}`,
      adresse: 'Akwa', ville: 'Douala',
      registre_commerce: `RC${U}`,
      mot_de_passe: mdpAgence
    }
  });
  ok('Inscription agence', inscAgence.statut === 201, JSON.stringify(inscAgence.donnees));
  const agenceId = inscAgence.donnees?.agence?.id;

  // Une agence non validée ne doit PAS pouvoir se connecter/opérer
  const cnxAvant = await appel('POST', '/api/agences/connexion', {
    body: { email: emailAgence, mot_de_passe: mdpAgence }
  });
  ok('Agence en attente : connexion refusée ou signalée',
     cnxAvant.statut !== 200 || cnxAvant.donnees?.agence?.statut === 'en_attente',
     `statut ${cnxAvant.statut}`);

  const valid = await appel('PUT', `/api/admin/agences/${agenceId}/valider`, { token: tokenAdmin });
  ok('Admin valide l\'agence', valid.statut === 200, JSON.stringify(valid.donnees));

  const cnxAgence = await appel('POST', '/api/agences/connexion', {
    body: { email: emailAgence, mot_de_passe: mdpAgence }
  });
  ok('Connexion agence après validation', cnxAgence.statut === 200 && !!cnxAgence.donnees?.token,
     JSON.stringify(cnxAgence.donnees));
  const tokenAgence = cnxAgence.donnees?.token;

  // ─────────────────────────────────────────────────────
  console.log('\n3. AGENCE — bus, ligne multi-arrêts, trajet');
  // ─────────────────────────────────────────────────────
  const bus = await appel('POST', '/api/bus', {
    token: tokenAgence,
    body: {
      nom: `Confort ${U}`, type_bus: 'standard', disposition: '2+2',
      nombre_rangees: 10, climatisation: true, prises_usb: true,
      supplement_premium: 1000
    }
  });
  ok('Création bus', bus.statut === 201, JSON.stringify(bus.donnees));
  const busId = bus.donnees?.bus?.id;

  // Ligne multi-arrêts : Douala(0) -> Loum(1) -> Yaoundé(2)
  const ligne = await appel('POST', '/api/lignes', {
    token: tokenAgence,
    body: {
      ville_depart: 'douala', ville_arrivee: 'yaounde', est_direct: false,
      points: [
        { ville: 'douala', lieu_prise_en_charge: 'Agence Akwa' },
        { ville: 'loum', lieu_prise_en_charge: 'Carrefour Loum' },
        { ville: 'yaounde', lieu_prise_en_charge: 'Gare Mvan' }
      ],
      troncons_prix: [
        { ordre_depart: 0, ordre_arrivee: 1, prix: 2000 },
        { ordre_depart: 1, ordre_arrivee: 2, prix: 3500 },
        { ordre_depart: 0, ordre_arrivee: 2, prix: 5000 }
      ]
    }
  });
  ok('Création ligne multi-arrêts (3 points, 3 tronçons)', ligne.statut === 201,
     JSON.stringify(ligne.donnees));
  const ligneId = ligne.donnees?.ligne?.id;

  // Prix par tronçon indépendants (pas somme des tronçons adjacents)
  ok('Prix segment complet indépendant (5000 != 2000+3500)',
     ligne.donnees?.troncons_prix?.find(t => t.ordre_depart === 0 && t.ordre_arrivee === 2)?.prix === 5000);

  const demain = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  const trajet = await appel('POST', '/api/trajets', {
    token: tokenAgence,
    body: {
      ligne_id: ligneId, bus_id: busId, date_depart: demain,
      heure_depart: '07:00', heure_arrivee_estimee: '11:00',
      prix_base: 5000, categorie: 'standard'
    }
  });
  ok('Création trajet', trajet.statut === 201, JSON.stringify(trajet.donnees));
  const trajetId = trajet.donnees?.trajet?.id;

  // ─────────────────────────────────────────────────────
  console.log('\n4. VOYAGEUR — recherche publique (multi-arrêts)');
  // ─────────────────────────────────────────────────────
  const rechComplet = await appel('GET',
    `/api/recherche/trajets?ville_depart=douala&ville_arrivee=yaounde&date_depart=${demain}`);
  ok('Recherche Douala -> Yaoundé trouve le trajet',
     rechComplet.statut === 200 && rechComplet.donnees?.nombre_resultats >= 1,
     JSON.stringify(rechComplet.donnees).slice(0, 300));
  const trouve = rechComplet.donnees?.trajets?.find(t => t.id === trajetId);
  ok('Prix du segment complet = 5000', trouve?.prix === 5000, `prix=${trouve?.prix}`);

  const rechTroncon = await appel('GET',
    `/api/recherche/trajets?ville_depart=loum&ville_arrivee=yaounde&date_depart=${demain}`);
  const trouveTroncon = rechTroncon.donnees?.trajets?.find(t => t.id === trajetId);
  ok('Recherche sur tronçon intermédiaire Loum -> Yaoundé', !!trouveTroncon,
     JSON.stringify(rechTroncon.donnees).slice(0, 200));
  ok('Prix du tronçon Loum -> Yaoundé = 3500', trouveTroncon?.prix === 3500,
     `prix=${trouveTroncon?.prix}`);

  // Sens inverse impossible (Yaoundé -> Douala n'existe pas sur cette ligne)
  const rechInverse = await appel('GET',
    `/api/recherche/trajets?ville_depart=yaounde&ville_arrivee=douala&date_depart=${demain}`);
  const trouveInverse = rechInverse.donnees?.trajets?.find(t => t.id === trajetId);
  ok('Sens inverse non vendable', !trouveInverse);

  // ─────────────────────────────────────────────────────
  console.log('\n5. VOYAGEUR — inscription, verrou, paiement');
  // ─────────────────────────────────────────────────────
  const emailVoy = `client${U}@test.cm`;
  const mdpVoy = 'ClientTest123!';
  const inscVoy = await appel('POST', '/api/voyageurs/inscription', {
    body: {
      nom: 'Dupont', prenom: 'Jean', date_naissance: '1990-05-15',
      lieu_naissance: 'Douala', telephone: `+2377${U}`,
      email: emailVoy, mot_de_passe: mdpVoy
    }
  });
  ok('Inscription voyageur', inscVoy.statut === 201, JSON.stringify(inscVoy.donnees));

  // La connexion voyageur se fait par TÉLÉPHONE (pas par email)
  const cnxVoy = await appel('POST', '/api/voyageurs/connexion', {
    body: { telephone: `+2377${U}`, mot_de_passe: mdpVoy }
  });
  ok('Connexion voyageur', cnxVoy.statut === 200 && !!cnxVoy.donnees?.token);
  const tokenVoy = cnxVoy.donnees?.token;

  const plan = await appel('GET', `/api/reservations/trajets/${trajetId}/plan`);
  ok('Plan du bus accessible', plan.statut === 200, JSON.stringify(plan.donnees).slice(0, 200));
  const sieges = plan.donnees?.sieges || plan.donnees?.plan || [];
  const listeSieges = Array.isArray(sieges) ? sieges.flat() : [];
  const siegeLibre = listeSieges.find(s => s && s.id && s.statut !== 'supprime_toilettes' && s.statut !== 'desactive');
  ok('Au moins un siège disponible', !!siegeLibre, JSON.stringify(listeSieges).slice(0, 200));
  const siegeId = siegeLibre?.id;

  // Verrou sur le segment complet 0 -> 2
  const verrou = await appel('POST', '/api/reservations/verrou', {
    token: tokenVoy,
    body: {
      trajet_id: trajetId, siege_id: siegeId,
      point_embarquement_ordre: 0, point_debarquement_ordre: 2
    }
  });
  ok('Verrou siège (segment 0->2)', verrou.statut === 201 || verrou.statut === 200,
     JSON.stringify(verrou.donnees));

  // Paiement avec clé d'idempotence
  const cleIdem = `test-idem-${U}`;
  const paiement = await appel('POST', '/api/reservations/payer', {
    token: tokenVoy,
    headers: { 'Idempotency-Key': cleIdem },
    body: {
      trajet_id: trajetId, siege_id: siegeId, operateur: 'mtn_momo',
      supplement_bagage: 1000,
      point_embarquement_ordre: 0, point_debarquement_ordre: 2
    }
  });
  ok('Paiement Mobile Money', paiement.statut === 201 || paiement.statut === 200,
     JSON.stringify(paiement.donnees));
  const billet = paiement.donnees?.billet;
  const billetId = billet?.id;
  const qrCode = billet?.qr_code;

  // IDEMPOTENCE : rejouer la même clé ne doit PAS créer un 2e billet
  const rejeu = await appel('POST', '/api/reservations/payer', {
    token: tokenVoy,
    headers: { 'Idempotency-Key': cleIdem },
    body: {
      trajet_id: trajetId, siege_id: siegeId, operateur: 'mtn_momo',
      supplement_bagage: 1000,
      point_embarquement_ordre: 0, point_debarquement_ordre: 2
    }
  });
  const nbBillets = await pool.query(
    `SELECT COUNT(*) AS n FROM billets WHERE trajet_id = $1 AND siege_id = $2 AND statut = 'confirme'`,
    [trajetId, siegeId]
  );
  ok('Idempotence : rejeu ne crée pas de 2e billet',
     parseInt(nbBillets.rows[0].n) === 1, `${nbBillets.rows[0].n} billets`);

  // BAGAGE : le supplément bagage doit revenir à l'AGENCE, pas à JEGO
  if (billetId) {
    const eco = await pool.query(
      `SELECT supplement_bagage, prix_agence, marge_jego FROM billets WHERE id = $1`,
      [billetId]
    );
    const b = eco.rows[0];
    ok('Supplément bagage reversé à l\'agence (inclus dans prix_agence)',
       b && b.prix_agence >= b.supplement_bagage && b.supplement_bagage === 1000,
       `prix_agence=${b?.prix_agence} bagage=${b?.supplement_bagage} marge_jego=${b?.marge_jego}`);
  }

  // CHEVAUCHEMENT : un autre voyageur ne peut pas prendre le même siège
  // sur un segment qui chevauche (1->2 chevauche 0->2)
  const verrouChevauche = await appel('POST', '/api/reservations/verrou', {
    token: tokenVoy,
    body: {
      trajet_id: trajetId, siege_id: siegeId,
      point_embarquement_ordre: 1, point_debarquement_ordre: 2
    }
  });
  ok('Siège vendu : segment chevauchant refusé',
     verrouChevauche.statut >= 400, `statut ${verrouChevauche.statut}`);

  // ─────────────────────────────────────────────────────
  console.log('\n6. CHAUFFEUR — création, scan QR, départ, arrivée');
  // ─────────────────────────────────────────────────────
  const chauffeur = await appel('POST', '/api/chauffeurs', {
    token: tokenAgence,
    body: {
      nom: 'Eto\'o', prenom: 'Paul', date_naissance: '1985-03-10',
      lieu_naissance: 'Douala', telephone: `+2379${U}`, mot_de_passe: 'Chauffeur123!'
    }
  });
  ok('Création chauffeur par l\'agence', chauffeur.statut === 201, JSON.stringify(chauffeur.donnees));
  const chauffeurId = chauffeur.donnees?.chauffeur?.id;

  const assign = await appel('PUT', `/api/trajets/${trajetId}/chauffeur`, {
    token: tokenAgence, body: { chauffeur_id: chauffeurId }
  });
  ok('Assignation chauffeur au trajet', assign.statut === 200, JSON.stringify(assign.donnees));

  const cnxCh = await appel('POST', '/api/chauffeurs/connexion', {
    body: { telephone: `+2379${U}`, mot_de_passe: 'Chauffeur123!' }
  });
  ok('Connexion chauffeur', cnxCh.statut === 200 && !!cnxCh.donnees?.token);
  const tokenCh = cnxCh.donnees?.token;

  // Scan du VRAI QR généré au paiement
  const scan1 = await appel('POST', '/api/reservations/scanner', {
    token: tokenCh, body: { contenu_qr: qrCode }
  });
  ok('Scan QR valide', scan1.statut === 200 && scan1.donnees?.valide === true,
     JSON.stringify(scan1.donnees));

  // Double scan refusé
  const scan2 = await appel('POST', '/api/reservations/scanner', {
    token: tokenCh, body: { contenu_qr: qrCode }
  });
  ok('Double scan refusé', scan2.statut === 409, JSON.stringify(scan2.donnees));

  // QR falsifié refusé (signature invalide)
  const scanFaux = await appel('POST', '/api/reservations/scanner', {
    token: tokenCh, body: { contenu_qr: 'JEGO|JG-FAUX|x|y|deadbeef12345678' }
  });
  ok('QR falsifié refusé (signature)', scanFaux.statut >= 400,
     JSON.stringify(scanFaux.donnees));

  // Départ : le trajet est demain, la déclaration doit être refusée
  const departTrop = await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/depart`, { token: tokenCh });
  ok('Départ refusé avant l\'heure prévue', departTrop.statut >= 400,
     JSON.stringify(departTrop.donnees));

  // On ramène le trajet à aujourd'hui/heure passée pour tester départ+arrivée
  await pool.query(
    `UPDATE trajets SET date_depart = CURRENT_DATE, heure_depart = '00:01' WHERE id = $1`,
    [trajetId]
  );
  const depart = await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/depart`, { token: tokenCh });
  ok('Déclaration départ', depart.statut === 200, JSON.stringify(depart.donnees));

  const arrivee = await appel('PUT', `/api/chauffeurs/trajets/${trajetId}/arrivee`, { token: tokenCh });
  ok('Déclaration arrivée', arrivee.statut === 200, JSON.stringify(arrivee.donnees));

  const escrowApres = await pool.query(
    `SELECT statut FROM escrow WHERE billet_id = $1`, [billetId]
  );
  ok('Escrow toujours retenu juste après l\'arrivée (versement différé)',
     escrowApres.rows[0]?.statut === 'retenu', `statut=${escrowApres.rows[0]?.statut}`);

  // ─────────────────────────────────────────────────────
  console.log('\n7. APRÈS VOYAGE — avis puis litige tranché');
  // ─────────────────────────────────────────────────────
  const avis = await appel('POST', '/api/avis', {
    token: tokenVoy,
    body: {
      trajet_id: trajetId, note_service: 4, note_conduite: 5,
      note_horaires: 3, note_confort: 4, commentaire: 'Voyage correct.'
    }
  });
  ok('Dépôt d\'un avis', avis.statut === 201 || avis.statut === 200,
     JSON.stringify(avis.donnees));

  const litige = await appel('POST', '/api/litiges', {
    token: tokenVoy,
    body: { billet_id: billetId, motif: 'conduite_dangereuse', description: 'Vitesse excessive sur la nationale.' }
  });
  ok('Ouverture litige par le voyageur', litige.statut === 201, JSON.stringify(litige.donnees));
  const litigeId = litige.donnees?.litige?.id;

  const repLitige = await appel('PUT', `/api/litiges/${litigeId}/reponse`, {
    token: tokenAgence, body: { reponse: 'Le chauffeur conteste, le GPS montre une vitesse normale.' }
  });
  ok('Réponse de l\'agence au litige', repLitige.statut === 200, JSON.stringify(repLitige.donnees));

  const tranche = await appel('PUT', `/api/litiges/${litigeId}/decision`, {
    token: tokenAdmin, body: { decision: 'Remboursement accordé au voyageur.', gagnant: 'voyageur' }
  });
  ok('Admin tranche le litige', tranche.statut === 200, JSON.stringify(tranche.donnees));

  // EFFET AUTOMATIQUE RÉEL sur l'escrow
  const escrowFinal = await pool.query(
    `SELECT statut FROM escrow WHERE billet_id = $1`, [billetId]
  );
  ok('Escrow passé en "rembourse" automatiquement',
     escrowFinal.rows[0]?.statut === 'rembourse', `statut=${escrowFinal.rows[0]?.statut}`);

  const remb = await pool.query(
    `SELECT motif, montant, statut FROM remboursements WHERE billet_id = $1 AND motif = 'litige'`,
    [billetId]
  );
  ok('Ligne de remboursement "litige" créée', remb.rows.length === 1,
     JSON.stringify(remb.rows));

  // ─────────────────────────────────────────────────────
  console.log('\n8. VENTE GUICHET (espèces, compte fantôme)');
  // ─────────────────────────────────────────────────────
  const trajet2 = await appel('POST', '/api/trajets', {
    token: tokenAgence,
    body: {
      ligne_id: ligneId, bus_id: busId, date_depart: demain,
      heure_depart: '14:00', heure_arrivee_estimee: '18:00',
      prix_base: 5000, categorie: 'standard'
    }
  });
  const trajet2Id = trajet2.donnees?.trajet?.id;
  ok('Second trajet créé pour test guichet', trajet2.statut === 201);

  const plan2 = await appel('GET', `/api/reservations/trajets/${trajet2Id}/plan`);
  const sieges2 = (plan2.donnees?.sieges || plan2.donnees?.plan || []);
  const liste2 = Array.isArray(sieges2) ? sieges2.flat() : [];
  const siege2 = liste2.find(s => s && s.id);

  // Prix attendu : 5000 (segment complet) + 0 bagage + commission
  const grille = await pool.query(
    `SELECT pourcentage FROM configuration_frais WHERE type_frais='commission' AND actif=true
     AND tranche_min <= 5000 AND (tranche_max IS NULL OR tranche_max >= 5000)
     ORDER BY agence_id NULLS LAST LIMIT 1`
  );
  const pct = grille.rows.length ? parseFloat(grille.rows[0].pourcentage) : 7;
  const prixAttendu = 5000 + Math.round(5000 * pct / 100);

  const guichet = await appel('POST', `/api/reservations/trajets/${trajet2Id}/vente-guichet`, {
    token: tokenAgence,
    body: {
      siege_id: siege2?.id, nom_client: 'Marie Fotso',
      telephone_client: `+2378${U}`, montant_recu: prixAttendu,
      point_embarquement_ordre: 0, point_debarquement_ordre: 2
    }
  });
  ok('Vente au guichet en espèces', guichet.statut === 201, JSON.stringify(guichet.donnees));

  const fantome = await pool.query(
    `SELECT cree_par_guichet, email FROM voyageurs WHERE telephone LIKE $1`,
    [`%${U}`]
  );
  ok('Compte fantôme créé par le guichet',
     fantome.rows.some(r => r.cree_par_guichet === true),
     JSON.stringify(fantome.rows));

  // ─────────────────────────────────────────────────────
  console.log('\n9. PROTECTION — agence désactivée bloquée');
  // ─────────────────────────────────────────────────────
  const desact = await appel('PUT', `/api/admin/agences/${agenceId}/desactiver`, {
    token: tokenAdmin, body: { motif: 'Test automatisé' }
  });
  ok('Désactivation agence par l\'admin', desact.statut === 200, JSON.stringify(desact.donnees));

  const trajetApres = await appel('POST', '/api/trajets', {
    token: tokenAgence,
    body: {
      ligne_id: ligneId, bus_id: busId, date_depart: demain,
      heure_depart: '20:00', heure_arrivee_estimee: '23:00', prix_base: 5000
    }
  });
  ok('Agence désactivée : création trajet bloquée (JWT existant)',
     trajetApres.statut === 403, `statut ${trajetApres.statut}`);

  const rechApres = await appel('GET',
    `/api/recherche/trajets?ville_depart=douala&ville_arrivee=yaounde&date_depart=${demain}`);
  const encoreVisible = rechApres.donnees?.trajets?.some(t => t.id === trajet2Id);
  ok('Agence désactivée : trajets retirés de la recherche client', !encoreVisible);

  // ─────────────────────────────────────────────────────
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
