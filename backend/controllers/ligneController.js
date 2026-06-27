const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// CRÉER UNE LIGNE
// L'agence envoie les CODES de villes (ex: "douala", "yaounde")
// ═══════════════════════════════════════════════════
async function creerLigne(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const { ville_depart, ville_arrivee, est_direct, arrets, distance_km } = req.body;

    // Vérifier les champs obligatoires
    if (!ville_depart || !ville_arrivee) {
      return res.status(400).json({ error: 'Ville de départ et ville d\'arrivée sont obligatoires' });
    }

    // Empêcher une ligne qui part et arrive au même endroit
    if (ville_depart === ville_arrivee) {
      return res.status(400).json({ error: 'La ville de départ et d\'arrivée ne peuvent pas être identiques' });
    }

    // Vérifier que les deux villes existent dans la table villes
    const villesCheck = await pool.query(
      'SELECT code FROM villes WHERE code = ANY($1) AND actif = true',
      [[ville_depart, ville_arrivee]]
    );
    if (villesCheck.rows.length !== 2) {
      return res.status(400).json({
        error: 'Ville de départ ou d\'arrivée inconnue. Utilisez un code de ville valide.'
      });
    }

    // Créer la ligne (on stocke les codes)
    const resultat = await pool.query(
      `INSERT INTO lignes
        (agence_id, ville_depart, ville_arrivee, est_direct, arrets, distance_km)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, ville_depart, ville_arrivee, est_direct, arrets, distance_km`,
      [agenceId, ville_depart, ville_arrivee,
       est_direct !== undefined ? est_direct : true,
       arrets || null, distance_km || null]
    );

    res.status(201).json({
      message: 'Ligne créée avec succès',
      ligne: resultat.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// LISTER LES LIGNES DE L'AGENCE
// ═══════════════════════════════════════════════════
async function listerLignes(req, res) {
  try {
    const agenceId = req.utilisateur.id;

    const resultat = await pool.query(
      `SELECT id, ville_depart, ville_arrivee, est_direct, arrets, distance_km, cree_le
       FROM lignes WHERE agence_id = $1
       ORDER BY cree_le DESC`,
      [agenceId]
    );

    res.json({ lignes: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// SUPPRIMER UNE LIGNE
// ═══════════════════════════════════════════════════
async function supprimerLigne(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const ligneId = req.params.id;

    // Vérifier que la ligne appartient à l'agence
    const ligneCheck = await pool.query(
      'SELECT id FROM lignes WHERE id = $1 AND agence_id = $2',
      [ligneId, agenceId]
    );
    if (ligneCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ligne introuvable' });
    }

    // Vérifier qu'aucun trajet n'utilise cette ligne
    const trajetsCheck = await pool.query(
      'SELECT id FROM trajets WHERE ligne_id = $1 LIMIT 1',
      [ligneId]
    );
    if (trajetsCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'Impossible de supprimer : des trajets utilisent cette ligne'
      });
    }

    await pool.query('DELETE FROM lignes WHERE id = $1', [ligneId]);

    res.json({ message: 'Ligne supprimée' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { creerLigne, listerLignes, supprimerLigne };