const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { genererToken } = require('../utils/jwt');

// ═══════════════════════════════════════════════════
// INSCRIPTION D'UN VOYAGEUR
// ═══════════════════════════════════════════════════
async function inscription(req, res) {
  try {
    const {
      nom, prenom, date_naissance, lieu_naissance,
      telephone, email, mot_de_passe, contact_urgence
    } = req.body;

    if (!nom || !prenom || !date_naissance || !lieu_naissance || !telephone || !email || !mot_de_passe) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
    }

    const telExiste = await pool.query('SELECT id FROM voyageurs WHERE telephone = $1', [telephone]);
    if (telExiste.rows.length > 0) {
      return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    const emailExiste = await pool.query('SELECT id FROM voyageurs WHERE email = $1', [email]);
    if (emailExiste.rows.length > 0) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    const motDePasseChiffre = await bcrypt.hash(mot_de_passe, 10);

    const resultat = await pool.query(
      `INSERT INTO voyageurs
        (nom, prenom, date_naissance, lieu_naissance, telephone, email, mot_de_passe, contact_urgence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nom, prenom, telephone, email, points_fidelite`,
      [nom, prenom, date_naissance, lieu_naissance, telephone, email, motDePasseChiffre, contact_urgence]
    );

    const voyageur = resultat.rows[0];
    const token = genererToken({ id: voyageur.id, type: 'voyageur' });

    res.status(201).json({
      message: 'Inscription réussie',
      voyageur,
      token
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// CONNEXION D'UN VOYAGEUR
// ═══════════════════════════════════════════════════
async function connexion(req, res) {
  try {
    const { telephone, mot_de_passe } = req.body;

    if (!telephone || !mot_de_passe) {
      return res.status(400).json({ error: 'Téléphone et mot de passe requis' });
    }

    const resultat = await pool.query('SELECT * FROM voyageurs WHERE telephone = $1', [telephone]);

    if (resultat.rows.length === 0) {
      return res.status(401).json({ error: 'Téléphone ou mot de passe incorrect' });
    }

    const voyageur = resultat.rows[0];
    const motDePasseValide = await bcrypt.compare(mot_de_passe, voyageur.mot_de_passe);

    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Téléphone ou mot de passe incorrect' });
    }

    const token = genererToken({ id: voyageur.id, type: 'voyageur' });

    res.json({
      message: 'Connexion réussie',
      voyageur: {
        id: voyageur.id,
        nom: voyageur.nom,
        prenom: voyageur.prenom,
        telephone: voyageur.telephone,
        email: voyageur.email,
        points_fidelite: voyageur.points_fidelite
      },
      token
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// VOIR SON PROFIL (route protégée)
// ═══════════════════════════════════════════════════
async function monProfil(req, res) {
  try {
    const voyageurId = req.utilisateur.id;

    const resultat = await pool.query(
      `SELECT id, nom, prenom, date_naissance, lieu_naissance,
              telephone, email, contact_urgence, points_fidelite,
              langue, mode_sombre, mode_eco_donnees, cree_le
       FROM voyageurs WHERE id = $1`,
      [voyageurId]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({ error: 'Voyageur introuvable' });
    }

    res.json({ voyageur: resultat.rows[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// MODIFIER SON PROFIL (route protégée)
// ═══════════════════════════════════════════════════
async function modifierProfil(req, res) {
  try {
    const voyageurId = req.utilisateur.id;
    const { nom, prenom, email, contact_urgence, langue, mode_sombre, mode_eco_donnees } = req.body;

    const actuel = await pool.query('SELECT * FROM voyageurs WHERE id = $1', [voyageurId]);
    if (actuel.rows.length === 0) {
      return res.status(404).json({ error: 'Voyageur introuvable' });
    }
    const voyageur = actuel.rows[0];

    const nomChange = (nom && nom !== voyageur.nom) || (prenom && prenom !== voyageur.prenom);
    if (nomChange && voyageur.dernier_changement_nom) {
      const dernierChangement = new Date(voyageur.dernier_changement_nom);
      const sixMois = new Date();
      sixMois.setMonth(sixMois.getMonth() - 6);
      if (dernierChangement > sixMois) {
        return res.status(403).json({
          error: 'Le nom ne peut être modifié qu\'une fois tous les 6 mois.'
        });
      }
    }

    if (email && email !== voyageur.email) {
      const emailExiste = await pool.query(
        'SELECT id FROM voyageurs WHERE email = $1 AND id != $2',
        [email, voyageurId]
      );
      if (emailExiste.rows.length > 0) {
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }
    }

    const nouveauNom = nom || voyageur.nom;
    const nouveauPrenom = prenom || voyageur.prenom;
    const nouvelEmail = email || voyageur.email;
    const nouveauContact = contact_urgence !== undefined ? contact_urgence : voyageur.contact_urgence;
    const nouvelleLangue = langue || voyageur.langue;
    const nouveauModeSombre = mode_sombre !== undefined ? mode_sombre : voyageur.mode_sombre;
    const nouveauModeEco = mode_eco_donnees !== undefined ? mode_eco_donnees : voyageur.mode_eco_donnees;

    const resultat = await pool.query(
      `UPDATE voyageurs SET
        nom = $1, prenom = $2, email = $3, contact_urgence = $4,
        langue = $5, mode_sombre = $6, mode_eco_donnees = $7,
        dernier_changement_nom = ${nomChange ? 'NOW()' : 'dernier_changement_nom'},
        mis_a_jour_le = NOW()
       WHERE id = $8
       RETURNING id, nom, prenom, email, contact_urgence, langue, mode_sombre, mode_eco_donnees, points_fidelite`,
      [nouveauNom, nouveauPrenom, nouvelEmail, nouveauContact, nouvelleLangue, nouveauModeSombre, nouveauModeEco, voyageurId]
    );

    res.json({
      message: 'Profil mis à jour',
      voyageur: resultat.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// HISTORIQUE DES VOYAGES (voyageur connecté)
// ═══════════════════════════════════════════════════
async function historiqueVoyages(req, res) {
  try {
    const voyageurId = req.utilisateur.id;

    const resultat = await pool.query(
      `SELECT DISTINCT
          b.id AS billet_id, b.numero, b.statut, b.prix_total_client,
          b.est_cadeau, b.qr_code, b.trajet_id, b.est_flexible,
          b.supplement_bagage, b.prix_agence, b.marge_jego,
          t.date_depart, t.heure_depart, t.heure_arrivee_reelle,
          t.heure_arrivee_estimee, t.categorie,
          t.statut AS statut_trajet,
          vd.nom_affiche AS depart, va.nom_affiche AS arrivee,
          a.id AS agence_id, a.nom AS nom_agence,
          bus.climatisation, bus.prises_usb, bus.wifi, bus.toilettes,
          s.numero AS siege,
          (b.est_cadeau = true AND p.voyageur_id != $1) AS recu_en_cadeau,
          (SELECT COUNT(*) FROM avis WHERE trajet_id = b.trajet_id AND voyageur_id = b.voyageur_id) > 0 AS deja_note
       FROM billets b
       JOIN trajets t ON t.id = b.trajet_id
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       JOIN agences a ON a.id = b.agence_id
       JOIN bus ON bus.id = t.bus_id
       JOIN sieges s ON s.id = b.siege_id
       LEFT JOIN paiements p ON p.billet_id = b.id
       WHERE b.voyageur_id = $1 OR p.voyageur_id = $1
       ORDER BY t.date_depart DESC, t.heure_depart DESC`,
      [voyageurId]
    );

    res.json({
      nombre_voyages: resultat.rows.length,
      voyages: resultat.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { inscription, connexion, monProfil, modifierProfil, historiqueVoyages };