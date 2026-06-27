const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// CRÉER UN TRAJET
// ═══════════════════════════════════════════════════
async function creerTrajet(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const {
      ligne_id, bus_id, date_depart, heure_depart,
      heure_arrivee_estimee, prix_base, categorie
    } = req.body;

    // Vérifier les champs obligatoires
    if (!ligne_id || !bus_id || !date_depart || !heure_depart || !prix_base) {
      return res.status(400).json({
        error: 'Ligne, bus, date, heure de départ et prix sont obligatoires'
      });
    }

    // Vérifier que la ligne appartient à l'agence
    const ligneCheck = await pool.query(
      'SELECT id FROM lignes WHERE id = $1 AND agence_id = $2',
      [ligne_id, agenceId]
    );
    if (ligneCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ligne introuvable ou n\'appartient pas à votre agence' });
    }

    // Vérifier que le bus appartient à l'agence
    const busCheck = await pool.query(
      'SELECT id FROM bus WHERE id = $1 AND agence_id = $2',
      [bus_id, agenceId]
    );
    if (busCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bus introuvable ou n\'appartient pas à votre agence' });
    }

    // Vérifier la catégorie
    const categorieValide = categorie || 'standard';
    if (!['standard', 'vip', 'express', 'nuit'].includes(categorieValide)) {
      return res.status(400).json({ error: 'Catégorie invalide : standard, vip, express ou nuit' });
    }

    // Créer le trajet
    const resultat = await pool.query(
      `INSERT INTO trajets
        (agence_id, ligne_id, bus_id, date_depart, heure_depart,
         heure_arrivee_estimee, prix_base, categorie, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'programme')
       RETURNING id, date_depart, heure_depart, heure_arrivee_estimee, prix_base, categorie, statut`,
      [agenceId, ligne_id, bus_id, date_depart, heure_depart,
       heure_arrivee_estimee || null, prix_base, categorieValide]
    );

    res.status(201).json({
      message: 'Trajet créé avec succès',
      trajet: resultat.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// LISTER LES TRAJETS DE L'AGENCE
// ═══════════════════════════════════════════════════
async function listerTrajets(req, res) {
  try {
    const agenceId = req.utilisateur.id;

    const resultat = await pool.query(
      `SELECT t.id, t.date_depart, t.heure_depart, t.heure_arrivee_estimee,
              t.prix_base, t.categorie, t.statut,
              l.ville_depart, l.ville_arrivee,
              b.nom AS nom_bus, b.disposition
       FROM trajets t
       JOIN lignes l ON l.id = t.ligne_id
       JOIN bus b ON b.id = t.bus_id
       WHERE t.agence_id = $1
       ORDER BY t.date_depart, t.heure_depart`,
      [agenceId]
    );

    res.json({ trajets: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { creerTrajet, listerTrajets };