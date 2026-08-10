const pool = require('../config/database');
const { creerNotification } = require('../services/notificationService');

// ═══════════════════════════════════════════════════
// ESPACE DÉNONCIATION VOYAGEUR
//
// Distinct du signalement collectif (temps réel, pendant le trajet,
// déclenché au seuil) et du litige (procédure financière liée à
// l'escrow). Ici : un dossier individuel documenté, ouvert après le
// voyage sur un billet réel, notifié SIMULTANÉMENT à l'agence et à
// l'admin. L'agence passe en mode observation : elle peut se défendre
// et déposer des pièces, mais ne peut pas clore le dossier.
// ═══════════════════════════════════════════════════

const CATEGORIES = [
  'conduite_dangereuse', 'comportement_chauffeur', 'etat_du_bus',
  'surcharge', 'arret_non_respecte', 'horaire_non_respecte',
  'securite', 'autre'
];

// Lit un délai depuis parametres_systeme. Jamais de valeur codée en
// dur dans la logique : l'admin doit pouvoir l'ajuster sans redéploi.
async function lireDelai(cle, defaut) {
  try {
    const r = await pool.query('SELECT valeur FROM parametres_systeme WHERE cle = $1', [cle]);
    if (r.rows.length === 0) return defaut;
    const n = parseInt(r.rows[0].valeur);
    return Number.isFinite(n) ? n : defaut;
  } catch (e) {
    return defaut;
  }
}

// ═══════════════════════════════════════════════════
// LISTER SES BILLETS DÉNONÇABLES (voyageur)
// Le client choisit parmi ses VRAIS billets : on ne lui propose que
// des voyages réellement effectués et encore dans le délai.
// ═══════════════════════════════════════════════════
async function billetsDenoncables(req, res) {
  try {
    if (req.utilisateur.type !== 'voyageur') {
      return res.status(403).json({ error: 'Accès réservé aux voyageurs' });
    }
    const delaiJours = await lireDelai('delai_ouverture_litige_jours', 2);

    const resultat = await pool.query(
      `SELECT b.id AS billet_id, b.numero, t.id AS trajet_id,
              t.date_depart, t.heure_depart, t.heure_arrivee_reelle,
              vd.nom_affiche AS depart, va.nom_affiche AS arrivee,
              a.nom AS nom_agence,
              (d.id IS NOT NULL) AS deja_denonce
       FROM billets b
       JOIN trajets t ON t.id = b.trajet_id
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       JOIN agences a ON a.id = b.agence_id
       LEFT JOIN denonciations d ON d.billet_id = b.id
       WHERE b.voyageur_id = $1
         AND b.statut IN ('confirme', 'utilise')
         -- Le bus doit être PARTI : on ne dénonce pas un voyage à venir
         AND t.statut IN ('en_cours', 'termine', 'incident')
         -- et on reste dans le délai après la fin du trajet
         AND (t.heure_arrivee_reelle IS NULL
              OR t.heure_arrivee_reelle >= NOW() - ($2 || ' days')::INTERVAL)
       ORDER BY t.date_depart DESC, t.heure_depart DESC`,
      [req.utilisateur.id, String(delaiJours)]
    );

    res.json({
      delai_jours: delaiJours,
      nombre: resultat.rows.length,
      billets: resultat.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// OUVRIR UNE DÉNONCIATION (voyageur)
// ═══════════════════════════════════════════════════
async function ouvrirDenonciation(req, res) {
  const client = await pool.connect();
  try {
    if (req.utilisateur.type !== 'voyageur') {
      return res.status(403).json({ error: 'Accès réservé aux voyageurs' });
    }
    const voyageurId = req.utilisateur.id;
    const { billet_id, categorie, raison } = req.body;

    if (!billet_id || !categorie || !raison) {
      return res.status(400).json({ error: 'Billet, catégorie et raison sont obligatoires' });
    }
    if (!CATEGORIES.includes(categorie)) {
      return res.status(400).json({ error: 'Catégorie invalide' });
    }
    if (raison.trim().length < 20) {
      return res.status(400).json({ error: 'Décrivez les faits en 20 caractères minimum' });
    }

    await client.query('BEGIN');

    // Le billet doit appartenir au voyageur et le bus doit être parti.
    const billet = await client.query(
      `SELECT b.id, b.trajet_id, b.agence_id, t.chauffeur_id,
              t.statut AS statut_trajet, t.heure_arrivee_reelle
       FROM billets b JOIN trajets t ON t.id = b.trajet_id
       WHERE b.id = $1 AND b.voyageur_id = $2 AND b.statut IN ('confirme','utilise')`,
      [billet_id, voyageurId]
    );
    if (billet.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Ce billet ne vous appartient pas ou est introuvable' });
    }
    const b = billet.rows[0];

    if (!['en_cours', 'termine', 'incident'].includes(b.statut_trajet)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Une dénonciation ne peut être ouverte qu\'après le départ du bus'
      });
    }

    // Délai de forclusion, lu dans les paramètres système
    const delaiJours = await lireDelai('delai_ouverture_litige_jours', 2);
    if (b.heure_arrivee_reelle) {
      const limite = new Date(b.heure_arrivee_reelle);
      limite.setDate(limite.getDate() + delaiJours);
      if (new Date() > limite) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Le délai de ${delaiJours} jour(s) après la fin du trajet est dépassé`
        });
      }
    }

    const numero = `DEN-${Date.now()}`;
    let resultat;
    try {
      resultat = await client.query(
        `INSERT INTO denonciations
          (numero, billet_id, trajet_id, voyageur_id, agence_id, chauffeur_id,
           categorie, raison, statut)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ouverte')
         RETURNING id, numero, categorie, statut, cree_le`,
        [numero, billet_id, b.trajet_id, voyageurId, b.agence_id, b.chauffeur_id || null,
         categorie, raison.trim()]
      );
    } catch (e) {
      if (e.code === '23505') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Vous avez déjà ouvert une dénonciation pour ce billet' });
      }
      throw e;
    }

    await client.query('COMMIT');

    // Agence ET admin notifiés SIMULTANÉMENT.
    await creerNotification({
      destinataire_type: 'agence',
      destinataire_id: b.agence_id,
      type: 'denonciation_ouverte',
      titre: 'Un voyageur a ouvert une dénonciation',
      contenu: `Catégorie : ${categorie}. Vous pouvez déposer vos observations et pièces justificatives depuis votre espace. Seul JEGO tranchera.`,
      canal: 'email'
    });

    const admins = await pool.query(
      `SELECT id FROM membres_admin WHERE statut = 'actif' AND niveau = 0`
    );
    for (const a of admins.rows) {
      await creerNotification({
        destinataire_type: 'admin',
        destinataire_id: a.id,
        type: 'denonciation_ouverte',
        titre: `Nouvelle dénonciation ${numero}`,
        contenu: `Catégorie : ${categorie}. Dossier à instruire.`,
        canal: 'email'
      });
    }

    res.status(201).json({
      message: 'Dénonciation enregistrée. L\'agence et JEGO en ont été informés.',
      denonciation: resultat.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// MES DÉNONCIATIONS (voyageur ou agence, selon le token)
// ═══════════════════════════════════════════════════
async function mesDenonciations(req, res) {
  try {
    const { id, type } = req.utilisateur;
    let colonne;
    if (type === 'voyageur') colonne = 'd.voyageur_id';
    else if (type === 'agence') colonne = 'd.agence_id';
    else return res.status(403).json({ error: 'Accès non autorisé' });

    const resultat = await pool.query(
      `SELECT d.id, d.numero, d.categorie, d.raison, d.statut,
              d.observation_agence, d.observation_agence_le,
              d.decision, d.decide_le, d.cree_le,
              b.numero AS numero_billet,
              t.date_depart, vd.nom_affiche AS depart, va.nom_affiche AS arrivee,
              (SELECT COUNT(*) FROM pieces_denonciation p WHERE p.denonciation_id = d.id) AS nb_pieces
       FROM denonciations d
       JOIN billets b ON b.id = d.billet_id
       JOIN trajets t ON t.id = d.trajet_id
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       WHERE ${colonne} = $1
       ORDER BY d.cree_le DESC`,
      [id]
    );

    res.json({ nombre: resultat.rows.length, denonciations: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// OBSERVATIONS DE L'AGENCE (mode observation)
// L'agence se défend mais ne peut PAS clore le dossier.
// ═══════════════════════════════════════════════════
async function observerDenonciation(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const { observation } = req.body;
    if (!observation || observation.trim().length === 0) {
      return res.status(400).json({ error: 'L\'observation est obligatoire' });
    }

    const check = await pool.query(
      `SELECT id, statut, voyageur_id, numero FROM denonciations
       WHERE id = $1 AND agence_id = $2`,
      [req.params.id, req.utilisateur.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Dénonciation introuvable' });
    }
    if (['traitee', 'classee'].includes(check.rows[0].statut)) {
      return res.status(400).json({ error: 'Ce dossier est déjà clos par JEGO' });
    }

    await pool.query(
      `UPDATE denonciations
       SET observation_agence = $1, observation_agence_le = NOW(),
           statut = 'observation_agence', mis_a_jour_le = NOW()
       WHERE id = $2`,
      [observation.trim(), req.params.id]
    );

    res.json({
      message: 'Vos observations ont été transmises à JEGO. La décision appartient à JEGO.',
      denonciation_id: req.params.id
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// LISTER LES DÉNONCIATIONS À INSTRUIRE (admin)
// ═══════════════════════════════════════════════════
async function denonciationsAdmin(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const { statut } = req.query;
    const params = [];
    let filtre = "WHERE d.statut NOT IN ('traitee', 'classee')";
    if (statut) {
      params.push(statut);
      filtre = 'WHERE d.statut = $1';
    }

    const resultat = await pool.query(
      `SELECT d.id, d.numero, d.categorie, d.raison, d.statut,
              d.observation_agence, d.cree_le,
              a.nom AS nom_agence,
              v.nom AS nom_voyageur, v.prenom AS prenom_voyageur,
              c.nom AS nom_chauffeur, c.prenom AS prenom_chauffeur,
              (SELECT COUNT(*) FROM pieces_denonciation p WHERE p.denonciation_id = d.id) AS nb_pieces,
              -- Corroboration : signalements collectifs sur le même trajet
              (SELECT COUNT(*) FROM signalements s WHERE s.trajet_id = d.trajet_id) AS signalements_trajet
       FROM denonciations d
       JOIN agences a ON a.id = d.agence_id
       JOIN voyageurs v ON v.id = d.voyageur_id
       LEFT JOIN chauffeurs c ON c.id = d.chauffeur_id
       ${filtre}
       ORDER BY d.cree_le ASC`,
      params
    );

    res.json({ nombre: resultat.rows.length, denonciations: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// TRANCHER UNE DÉNONCIATION (admin)
// 'traitee' = faits retenus, 'classee' = sans suite.
// ═══════════════════════════════════════════════════
async function trancherDenonciation(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const { decision, statut } = req.body;

    if (!decision || decision.trim().length === 0) {
      return res.status(400).json({ error: 'La décision est obligatoire' });
    }
    if (!['traitee', 'classee'].includes(statut)) {
      return res.status(400).json({ error: "Le statut doit valoir 'traitee' ou 'classee'" });
    }

    const check = await pool.query(
      `SELECT id, numero, voyageur_id, agence_id, statut FROM denonciations WHERE id = $1`,
      [req.params.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Dénonciation introuvable' });
    }
    if (['traitee', 'classee'].includes(check.rows[0].statut)) {
      return res.status(400).json({ error: 'Ce dossier est déjà tranché' });
    }
    const d = check.rows[0];

    await pool.query(
      `UPDATE denonciations
       SET decision = $1, statut = $2, decide_par = $3, decide_le = NOW(), mis_a_jour_le = NOW()
       WHERE id = $4`,
      [decision.trim(), statut, req.utilisateur.id, req.params.id]
    );

    await creerNotification({
      destinataire_type: 'voyageur',
      destinataire_id: d.voyageur_id,
      type: 'denonciation_decision',
      titre: 'Décision sur votre dénonciation',
      contenu: decision.trim(),
      canal: 'email'
    });
    await creerNotification({
      destinataire_type: 'agence',
      destinataire_id: d.agence_id,
      type: 'denonciation_decision',
      titre: `Décision sur la dénonciation ${d.numero}`,
      contenu: decision.trim(),
      canal: 'email'
    });

    res.json({ message: 'Décision enregistrée', denonciation_id: req.params.id, statut });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  billetsDenoncables, ouvrirDenonciation, mesDenonciations,
  observerDenonciation, denonciationsAdmin, trancherDenonciation
};
