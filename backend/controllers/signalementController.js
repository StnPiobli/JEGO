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

    // 3. Compter le nombre de passagers du trajet (billets confirmés/utilisés)
    const passagers = await client.query(
      `SELECT COUNT(*) AS nb FROM billets
       WHERE trajet_id = $1 AND statut IN ('confirme','utilise')`,
      [trajet_id]
    );
    const nbPassagers = parseInt(passagers.rows[0].nb);

    // 4. Déterminer le seuil collectif
    let seuil;
    if (nbPassagers <= 20) seuil = 3;
    else if (nbPassagers <= 40) seuil = 4;
    else seuil = 5;

    // 5. Compter les signalements de CETTE catégorie pour ce trajet
    const signalements = await client.query(
      `SELECT COUNT(*) AS nb FROM signalements
       WHERE trajet_id = $1 AND categorie = $2`,
      [trajet_id, categorie]
    );
    const nbSignalements = parseInt(signalements.rows[0].nb);

    // 6. Si le seuil est atteint, marquer et déclencher l'alerte
    let alerteDeclenchee = false;
    if (nbSignalements >= seuil) {
      await client.query(
        `UPDATE signalements
         SET seuil_atteint = true, alerte_envoyee = true
         WHERE trajet_id = $1 AND categorie = $2`,
        [trajet_id, categorie]
      );
      alerteDeclenchee = true;
      // [SIMULATION] Alerte à l'agence + chauffeur (notifications plus tard)
    }

    await client.query(
        `SELECT chauffeur_id, agence_id FROM trajets WHERE id = $1`,
        [trajet_id]
      ).then(async r => {
        const { chauffeur_id, agence_id } = r.rows[0];
        await creerNotification({
          destinataire_type: 'agence',
          destinataire_id: agence_id,
          type: 'alerte_signalement',
          titre: 'Alerte signalement collectif',
          contenu: `Le seuil de signalements "${categorie}" a été atteint sur un de vos trajets (${nbSignalements} signalements).`,
          canal: 'push'
        });
        if (chauffeur_id) {
          await creerNotification({
            destinataire_type: 'chauffeur',
            destinataire_id: chauffeur_id,
            type: 'alerte_signalement',
            titre: 'Signalement collectif',
            contenu: `Plusieurs passagers ont signalé : ${categorie}. Merci de rester vigilant.`,
            canal: 'push'
          });
        }
      });

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

module.exports = { signaler };