const pool = require('../config/database');
const { creerNotification } = require('../services/notificationService');

// Catégories de signalement autorisées (doivent correspondre à la contrainte BDD)
const CATEGORIES = [
  'exces_vitesse', 'conduite_dangereuse', 'comportement_inapproprie',
  'panne_technique', 'arret_prolonge', 'fausse_arrivee', 'autre'
];

// ═══════════════════════════════════════════════════
// CRÉER UN SIGNALEMENT (voyageur avec billet sur le trajet)
// Déclenche une alerte seulement si le seuil collectif est atteint
// ═══════════════════════════════════════════════════
async function signaler(req, res) {
  const client = await pool.connect();
  try {
    const voyageurId = req.utilisateur.id;
    const { trajet_id, categorie, commentaire } = req.body;

    // Vérifs de base
    if (!trajet_id || !categorie) {
      return res.status(400).json({ error: 'Trajet et catégorie sont obligatoires' });
    }
    if (!CATEGORIES.includes(categorie)) {
      return res.status(400).json({ error: 'Catégorie invalide' });
    }

    await client.query('BEGIN');

    // 1. Vérifier que le voyageur a un billet valide sur ce trajet
    const billetCheck = await client.query(
      `SELECT id FROM billets
       WHERE trajet_id = $1 AND voyageur_id = $2 AND statut IN ('confirme','utilise')`,
      [trajet_id, voyageurId]
    );
    if (billetCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Vous devez avoir un billet sur ce trajet pour signaler' });
    }

    // 2. Créer le signalement
    //    La contrainte unique (trajet, voyageur, catégorie) empêche le doublon
    try {
      await client.query(
        `INSERT INTO signalements (trajet_id, voyageur_id, categorie, commentaire)
         VALUES ($1, $2, $3, $4)`,
        [trajet_id, voyageurId, categorie, commentaire || null]
      );
    } catch (e) {
      if (e.code === '23505') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Vous avez déjà signalé ce problème pour ce trajet' });
      }
      throw e;
    }

    // 3. Auteur, trajet, et destinataires (agence + admins).
    const auteurRes = await client.query(
      `SELECT prenom, nom FROM voyageurs WHERE id = $1`, [voyageurId]
    );
    const auteur = auteurRes.rows[0] || { prenom: 'Un', nom: 'voyageur' };
    const nomAuteur = `${auteur.prenom || ''} ${auteur.nom || ''}`.trim();

    const trajetRes = await client.query(
      `SELECT t.chauffeur_id, t.agence_id, t.numero,
              vd.nom_affiche AS depart, va.nom_affiche AS arrivee
         FROM trajets t
         JOIN lignes l ON l.id = t.ligne_id
         JOIN villes vd ON vd.code = l.ville_depart
         JOIN villes va ON va.code = l.ville_arrivee
        WHERE t.id = $1`, [trajet_id]
    );
    const trj = trajetRes.rows[0] || {};
    const trajetLibelle = `${trj.depart || ''} → ${trj.arrivee || ''} (${trj.numero || ''})`;
    const heureFr = new Date().toLocaleTimeString('fr-FR',
      { hour: '2-digit', minute: '2-digit' });

    const LIBELLES = {
      'exces_vitesse': 'excès de vitesse',
      'conduite_dangereuse': 'conduite dangereuse',
      'comportement_inapproprie': 'comportement inapproprié',
      'panne_technique': 'panne technique',
      'arret_prolonge': 'arrêt prolongé',
      'fausse_arrivee': 'une fausse arrivée',
      'autre': 'un autre problème'
    };
    const libCat = LIBELLES[categorie] || categorie;
    const estFausseArrivee = categorie === 'fausse_arrivee';

    // 4. Seuil collectif base sur le nombre de voyageurs REELLEMENT
    //    montes a bord (billets scannes), pas seulement vendus : c'est
    //    le nombre de temoins possibles.
    const embarques = await client.query(
      `SELECT COUNT(*) AS nb FROM billets
       WHERE trajet_id = $1 AND qr_scanne = true`, [trajet_id]
    );
    let nbEmbarques = parseInt(embarques.rows[0].nb);
    // Repli : si le scan n'a pas encore eu lieu, on prend les billets
    // confirmes pour ne pas laisser le seuil a 3 par defaut absolu.
    if (nbEmbarques === 0) {
      const conf = await client.query(
        `SELECT COUNT(*) AS nb FROM billets
         WHERE trajet_id = $1 AND statut IN ('confirme','utilise')`, [trajet_id]
      );
      nbEmbarques = parseInt(conf.rows[0].nb);
    }
    let seuil;
    if (nbEmbarques <= 20) seuil = 3;
    else if (nbEmbarques <= 40) seuil = 4;
    else seuil = 5;

    // 5. Compter les signalements de CETTE categorie pour ce trajet.
    const signalements = await client.query(
      `SELECT COUNT(*) AS nb FROM signalements
       WHERE trajet_id = $1 AND categorie = $2`, [trajet_id, categorie]
    );
    const nbSignalements = parseInt(signalements.rows[0].nb);

    const admins = await client.query(
      `SELECT id FROM membres_admin WHERE statut = 'actif' AND niveau = 0`
    );

    // 6. Notification INDIVIDUELLE, a chaque signalement : agence + admin
    //    voient qui a signale quoi, et a quelle heure, sur ce trajet.
    const titreIndiv = estFausseArrivee
      ? 'Fausse arrivée signalée'
      : 'Nouveau signalement sur un trajet';
    const contenuIndiv = estFausseArrivee
      ? `${nomAuteur} a dénoncé une fausse arrivée sur ${trajetLibelle} à ${heureFr}.`
      : `${nomAuteur} a signalé ${libCat} sur ${trajetLibelle} à ${heureFr}.`;

    if (trj.agence_id) {
      await creerNotification({
        destinataire_type: 'agence', destinataire_id: trj.agence_id,
        type: estFausseArrivee ? 'fausse_arrivee' : 'signalement_trajet',
        titre: titreIndiv, contenu: contenuIndiv, canal: 'push',
        trajet_id
      });
    }
    for (const a of admins.rows) {
      await creerNotification({
        destinataire_type: 'admin', destinataire_id: a.id,
        type: estFausseArrivee ? 'fausse_arrivee' : 'signalement_trajet',
        titre: titreIndiv, contenu: contenuIndiv, canal: 'push',
        trajet_id
      });
    }

    // 7. Seuil atteint : on le marque et on previent en plus, avec la
    //    consigne au chauffeur. Une fausse arrivee au seuil suspend le
    //    versement (investigation).
    let alerteDeclenchee = false;
    if (nbSignalements >= seuil) {
      await client.query(
        `UPDATE signalements SET seuil_atteint = true, alerte_envoyee = true
         WHERE trajet_id = $1 AND categorie = $2`, [trajet_id, categorie]
      );
      alerteDeclenchee = true;

      const titreSeuil = estFausseArrivee
        ? 'Seuil atteint — fausse arrivée'
        : `Seuil atteint — ${libCat}`;
      const contenuSeuil = estFausseArrivee
        ? `${nbSignalements} voyageurs ont dénoncé une fausse arrivée sur ${trajetLibelle}. Versement suspendu, investigation requise.`
        : `${nbSignalements} voyageurs ont signalé ${libCat} sur ${trajetLibelle}. Seuil collectif atteint.`;

      if (trj.agence_id) {
        await creerNotification({
          destinataire_type: 'agence', destinataire_id: trj.agence_id,
          type: 'alerte_signalement', titre: titreSeuil,
          contenu: contenuSeuil, canal: 'push', trajet_id
        });
      }
      for (const a of admins.rows) {
        await creerNotification({
          destinataire_type: 'admin', destinataire_id: a.id,
          type: 'alerte_signalement', titre: titreSeuil,
          contenu: contenuSeuil, canal: 'push', trajet_id
        });
      }
      if (trj.chauffeur_id && !estFausseArrivee) {
        await creerNotification({
          destinataire_type: 'chauffeur', destinataire_id: trj.chauffeur_id,
          type: 'alerte_signalement', titre: 'Signalement collectif',
          contenu: `Plusieurs passagers ont signalé : ${libCat}. Merci de rester vigilant.`,
          canal: 'push', trajet_id
        });
      }

      // Fausse arrivee au seuil : le trajet part en investigation.
      if (estFausseArrivee) {
        await client.query(
          `UPDATE trajets SET statut = 'incident', mis_a_jour_le = NOW()
           WHERE id = $1 AND statut NOT IN ('annule')`, [trajet_id]
        );
      }
    }

    const nbPassagers = nbEmbarques;

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Signalement enregistré',
      categorie: categorie,
      nb_passagers: nbPassagers,
      seuil_requis: seuil,
      nb_signalements: nbSignalements,
      alerte_declenchee: alerteDeclenchee,
      info: alerteDeclenchee
        ? 'Seuil atteint — l\'agence et le chauffeur ont été alertés'
        : `Encore ${seuil - nbSignalements} signalement(s) pour déclencher une alerte`
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}


// ═══════════════════════════════════════════════════
// SIGNALEMENTS REÇUS PAR L'AGENCE (page Incidents)
//
// Regroupe par trajet ce que les passagers ont signalé en cours de
// route. L'agence voit le nombre et la nature des signalements, mais
// jamais l'identité des passagers : un signalement doit pouvoir être
// fait sans crainte de représailles.
// ═══════════════════════════════════════════════════
async function signalementsAgence(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }

    const resultat = await pool.query(
      `SELECT s.id, s.categorie, s.commentaire, s.cree_le, s.trajet_id,
              t.date_depart, t.heure_depart, t.statut AS statut_trajet,
              'JG-' || to_char(t.date_depart, 'YYMMDD') || '-' ||
              to_char(t.heure_depart, 'HH24MI') || '-' ||
              UPPER(SUBSTRING(t.id::text, 1, 4)) AS numero_voyage,
              vd.nom_affiche AS depart, va.nom_affiche AS arrivee,
              c.nom AS nom_chauffeur, c.prenom AS prenom_chauffeur,
              (SELECT COUNT(*) FROM signalements s2
               WHERE s2.trajet_id = s.trajet_id AND s2.categorie = s.categorie)
                AS signalements_meme_categorie
       FROM signalements s
       JOIN trajets t ON t.id = s.trajet_id
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       LEFT JOIN chauffeurs c ON c.id = t.chauffeur_id
       WHERE t.agence_id = $1
       ORDER BY s.cree_le DESC
       LIMIT 200`,
      [req.utilisateur.id]
    );

    res.json({ nombre: resultat.rows.length, signalements: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { signaler, signalementsAgence };