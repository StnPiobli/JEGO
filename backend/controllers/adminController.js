const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { genererToken } = require('../utils/jwt');
const { creerNotification } = require('../services/notificationService');

// ═══════════════════════════════════════════════════
// CONNEXION ADMIN
// ═══════════════════════════════════════════════════
async function connexion(req, res) {
  try {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const resultat = await pool.query('SELECT * FROM membres_admin WHERE email = $1', [email]);
    if (resultat.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const membre = resultat.rows[0];
    if (membre.statut !== 'actif') {
      return res.status(403).json({ error: 'Ce compte admin est désactivé' });
    }

    const motDePasseValide = await bcrypt.compare(mot_de_passe, membre.mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    await pool.query('UPDATE membres_admin SET derniere_connexion = NOW() WHERE id = $1', [membre.id]);

    const token = genererToken({ id: membre.id, type: 'admin' });

    res.json({
      message: 'Connexion réussie',
      membre: { id: membre.id, nom: membre.nom, prenom: membre.prenom, niveau: membre.niveau },
      token
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// LISTER LES AGENCES EN ATTENTE DE VALIDATION
// ═══════════════════════════════════════════════════
async function agencesEnAttente(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const resultat = await pool.query(
      `SELECT id, nom, email, telephone, adresse, ville, registre_commerce, cree_le
       FROM agences WHERE statut = 'en_attente'
       ORDER BY cree_le ASC`
    );

    res.json({ nombre: resultat.rows.length, agences: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// VALIDER UNE AGENCE
// ═══════════════════════════════════════════════════
async function validerAgence(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const agenceId = req.params.id;

    const check = await pool.query('SELECT id, nom, statut FROM agences WHERE id = $1', [agenceId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }
    if (check.rows[0].statut === 'actif') {
      return res.status(400).json({ error: 'Cette agence est déjà validée' });
    }

    await pool.query('UPDATE agences SET statut = $1, mis_a_jour_le = NOW() WHERE id = $2', ['actif', agenceId]);

    await creerNotification({
      destinataire_type: 'agence',
      destinataire_id: agenceId,
      type: 'agence_validee',
      titre: 'Agence validée',
      contenu: 'Votre agence a été validée par JEGO. Vous êtes désormais visible auprès des voyageurs.',
      canal: 'email'
    });

    res.json({ message: `Agence ${check.rows[0].nom} validée avec succès`, agence_id: agenceId });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// REFUSER UNE AGENCE (motif obligatoire)
// ═══════════════════════════════════════════════════
async function refuserAgence(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const agenceId = req.params.id;
    const { motif } = req.body;

    if (!motif || motif.trim().length === 0) {
      return res.status(400).json({ error: 'Le motif de refus est obligatoire' });
    }

    const check = await pool.query('SELECT id, nom FROM agences WHERE id = $1', [agenceId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    await pool.query('UPDATE agences SET statut = $1, mis_a_jour_le = NOW() WHERE id = $2', ['refuse', agenceId]);

    await creerNotification({
      destinataire_type: 'agence',
      destinataire_id: agenceId,
      type: 'agence_refusee',
      titre: 'Inscription refusée',
      contenu: `Votre inscription n'a pas été validée. Motif : ${motif}`,
      canal: 'email'
    });

    res.json({ message: `Agence ${check.rows[0].nom} refusée`, motif });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// LISTER TOUS LES PARAMÈTRES SYSTÈME (admin)
// ═══════════════════════════════════════════════════
async function listerParametres(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const { categorie } = req.query;

    let requete = `SELECT cle, valeur, type_valeur, categorie, description, mis_a_jour_le FROM parametres_systeme`;
    const params = [];
    if (categorie) {
      requete += ` WHERE categorie = $1`;
      params.push(categorie);
    }
    requete += ` ORDER BY categorie, cle`;

    const resultat = await pool.query(requete, params);
    res.json({ parametres: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// MODIFIER UN PARAMÈTRE SYSTÈME (admin) — traçabilité incluse
// ═══════════════════════════════════════════════════
async function modifierParametre(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const adminId = req.utilisateur.id;
    const { cle } = req.params;
    const { valeur } = req.body;

    if (valeur === undefined || valeur === null || valeur === '') {
      return res.status(400).json({ error: 'La nouvelle valeur est obligatoire' });
    }

    const check = await pool.query(`SELECT cle FROM parametres_systeme WHERE cle = $1`, [cle]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Paramètre introuvable' });
    }

    await pool.query(
      `UPDATE parametres_systeme SET valeur = $1, modifie_par = $2, mis_a_jour_le = NOW() WHERE cle = $3`,
      [String(valeur), adminId, cle]
    );

    res.json({ message: `Paramètre ${cle} mis à jour`, cle, nouvelle_valeur: valeur });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { connexion, agencesEnAttente, validerAgence, refuserAgence, listerParametres, modifierParametre };