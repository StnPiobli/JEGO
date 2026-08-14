const pool = require('../config/database');

// ═══════════════════════════════════════════════════
// CORRESPONDANCE DISPOSITION → TYPES DE PLACES
// Tout ce qui est à gauche du couloir = "gauche"
// Tout ce qui est à droite du couloir = "droit"
// ═══════════════════════════════════════════════════
const DISPOSITIONS = {
  '1+1': ['fenetre_gauche', 'fenetre_droite'],
  '2+1': ['fenetre_gauche', 'couloir_gauche', 'fenetre_droite'],
  '1+2': ['fenetre_gauche', 'couloir_droit', 'fenetre_droite'],
  '2+2': ['fenetre_gauche', 'couloir_gauche', 'couloir_droit', 'fenetre_droite'],
  '2+3': ['fenetre_gauche', 'couloir_gauche', 'couloir_droit', 'milieu', 'fenetre_droite'],
  '3+2': ['fenetre_gauche', 'milieu', 'couloir_gauche', 'couloir_droit', 'fenetre_droite'],
};

// Lettres pour la numérotation des sièges
const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F'];

// ═══════════════════════════════════════════════════
// CRÉER UN BUS + GÉNÉRER SES SIÈGES AUTOMATIQUEMENT
// ═══════════════════════════════════════════════════
async function creerBus(req, res) {
  const client = await pool.connect();
  try {
    const agenceId = req.utilisateur.id;
    const {
      nom, type_bus, disposition, nombre_rangees,
      toilettes, climatisation, prises_usb, wifi,
      sieges_inclinables, supplement_premium
    } = req.body;

    // Vérifier les champs obligatoires
    if (!nom || !type_bus || !disposition || !nombre_rangees) {
      return res.status(400).json({ error: 'Nom, type, disposition et nombre de rangées sont obligatoires' });
    }

    // Vérifier que la disposition est connue
    if (!DISPOSITIONS[disposition]) {
      return res.status(400).json({
        error: 'Disposition invalide. Valeurs acceptées : 1+1, 2+1, 1+2, 2+2, 2+3, 3+2'
      });
    }

    // Vérifier que le type est valide
    if (!['vip', 'standard', 'mixte'].includes(type_bus)) {
      return res.status(400).json({ error: 'Type invalide. Valeurs acceptées : vip, standard, mixte' });
    }

    // On démarre une transaction : soit tout réussit, soit rien
    await client.query('BEGIN');

    // 1. Créer le bus
    const busResult = await client.query(
      `INSERT INTO bus
        (agence_id, nom, type_bus, disposition, nombre_rangees,
         toilettes, climatisation, prises_usb, wifi, sieges_inclinables, supplement_premium)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, nom, type_bus, disposition, nombre_rangees`,
      [agenceId, nom, type_bus, disposition, nombre_rangees,
       toilettes || false, climatisation || false, prises_usb || false,
       wifi || false, sieges_inclinables || false, supplement_premium || 0]
    );

    const bus = busResult.rows[0];
    const schemaRangee = DISPOSITIONS[disposition];

    // 2. Générer tous les sièges
    let siegesCrees = 0;
    for (let rangee = 1; rangee <= nombre_rangees; rangee++) {
      for (let pos = 0; pos < schemaRangee.length; pos++) {
        const numero = `${rangee}${LETTRES[pos]}`;
        const typePosition = schemaRangee[pos];

        // VIP = tous premium, Standard = aucun, Mixte = aucun par défaut (réglé après)
        const estPremium = (type_bus === 'vip');

        await client.query(
          `INSERT INTO sieges
            (bus_id, numero, rangee, position, type_position, est_premium, statut)
           VALUES ($1, $2, $3, $4, $5, $6, 'disponible')`,
          [bus.id, numero, rangee, pos + 1, typePosition, estPremium]
        );
        siegesCrees++;
      }
    }

    // Valider la transaction
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Bus créé avec succès',
      bus: {
        ...bus,
        sieges_generes: siegesCrees
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════
// LISTER LES BUS DE L'AGENCE
// ═══════════════════════════════════════════════════
async function listerBus(req, res) {
  try {
    const agenceId = req.utilisateur.id;

    const resultat = await pool.query(
      `SELECT b.id, b.nom, b.type_bus, b.disposition, b.nombre_rangees,
              b.toilettes, b.climatisation, b.prises_usb, b.wifi,
              b.sieges_inclinables, b.supplement_premium, b.statut,
              COUNT(s.id) AS nombre_sieges
       FROM bus b
       LEFT JOIN sieges s ON s.bus_id = b.id
       WHERE b.agence_id = $1 AND b.statut != 'inactif'
       GROUP BY b.id
       ORDER BY b.cree_le DESC`,
      [agenceId]
    );

    res.json({ bus: resultat.rows });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function desactiverBus(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const { id } = req.params;

    const check = await pool.query('SELECT id FROM bus WHERE id = $1 AND agence_id = $2', [id, agenceId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Bus introuvable dans votre agence' });
    }

    await pool.query(`UPDATE bus SET statut = 'inactif' WHERE id = $1`, [id]);
    res.json({ message: 'Bus désactivé' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// VOIR LE PLAN D'UN BUS (tous ses sièges)
// ═══════════════════════════════════════════════════
async function voirPlanBus(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const busId = req.params.id;

    // Vérifier que le bus appartient bien à cette agence
    const busCheck = await pool.query(
      'SELECT id, nom, disposition FROM bus WHERE id = $1 AND agence_id = $2',
      [busId, agenceId]
    );
    if (busCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bus introuvable' });
    }

    // Récupérer les sièges
    const sieges = await pool.query(
      `SELECT id, numero, rangee, position, type_position, est_premium, statut
       FROM sieges WHERE bus_id = $1
       ORDER BY rangee, position`,
      [busId]
    );

    res.json({
      bus: busCheck.rows[0],
      sieges: sieges.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// MARQUER DES SIÈGES COMME TOILETTES (permanent)
// ═══════════════════════════════════════════════════
async function marquerToilettes(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const busId = req.params.id;
    const { sieges } = req.body; // liste de numéros : ["10C", "10D"]

    if (!sieges || !Array.isArray(sieges) || sieges.length === 0) {
      return res.status(400).json({ error: 'Fournir une liste de sièges à marquer' });
    }

    // Vérifier que le bus appartient à l'agence
    const busCheck = await pool.query(
      'SELECT id FROM bus WHERE id = $1 AND agence_id = $2',
      [busId, agenceId]
    );
    if (busCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bus introuvable' });
    }

    // Marquer les sièges comme supprimés (toilettes) - permanent
    const resultat = await pool.query(
      `UPDATE sieges SET statut = 'supprime_toilettes'
       WHERE bus_id = $1 AND numero = ANY($2)
       RETURNING numero`,
      [busId, sieges]
    );

    res.json({
      message: `${resultat.rows.length} siège(s) marqué(s) comme toilettes`,
      sieges_modifies: resultat.rows.map(r => r.numero)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// MARQUER DES SIÈGES COMME ABÎMÉS (réversible)
// ═══════════════════════════════════════════════════
async function marquerAbime(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const busId = req.params.id;
    const { sieges } = req.body;

    if (!sieges || !Array.isArray(sieges) || sieges.length === 0) {
      return res.status(400).json({ error: 'Fournir une liste de sièges à marquer' });
    }

    const busCheck = await pool.query(
      'SELECT id FROM bus WHERE id = $1 AND agence_id = $2',
      [busId, agenceId]
    );
    if (busCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bus introuvable' });
    }

    // On ne désactive pas un siège déjà supprimé par les toilettes
    const resultat = await pool.query(
      `UPDATE sieges SET statut = 'desactive'
       WHERE bus_id = $1 AND numero = ANY($2) AND statut != 'supprime_toilettes'
       RETURNING numero`,
      [busId, sieges]
    );

    res.json({
      message: `${resultat.rows.length} siège(s) désactivé(s)`,
      sieges_modifies: resultat.rows.map(r => r.numero)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// RÉACTIVER DES SIÈGES ABÎMÉS (réparés)
// ═══════════════════════════════════════════════════
async function reactiverSieges(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const busId = req.params.id;
    const { sieges } = req.body;

    if (!sieges || !Array.isArray(sieges) || sieges.length === 0) {
      return res.status(400).json({ error: 'Fournir une liste de sièges à réactiver' });
    }

    const busCheck = await pool.query(
      'SELECT id FROM bus WHERE id = $1 AND agence_id = $2',
      [busId, agenceId]
    );
    if (busCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bus introuvable' });
    }

    // On ne réactive que les sièges désactivés (jamais ceux des toilettes)
    const resultat = await pool.query(
      `UPDATE sieges SET statut = 'disponible'
       WHERE bus_id = $1 AND numero = ANY($2) AND statut = 'desactive'
       RETURNING numero`,
      [busId, sieges]
    );

    res.json({
      message: `${resultat.rows.length} siège(s) réactivé(s)`,
      sieges_modifies: resultat.rows.map(r => r.numero)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// MARQUER DES SIÈGES COMME PREMIUM (bus Mixte uniquement)
// ═══════════════════════════════════════════════════
async function marquerPremium(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const busId = req.params.id;
    const { sieges, supplement_premium } = req.body;

    if (!sieges || !Array.isArray(sieges) || sieges.length === 0) {
      return res.status(400).json({ error: 'Fournir une liste de sièges à marquer' });
    }

    // Vérifier le bus et son type
    const busCheck = await pool.query(
      'SELECT id, type_bus FROM bus WHERE id = $1 AND agence_id = $2',
      [busId, agenceId]
    );
    if (busCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bus introuvable' });
    }

    // Le premium par sélection n'a de sens que pour les bus Mixte
    if (busCheck.rows[0].type_bus !== 'mixte') {
      return res.status(400).json({
        error: 'Le marquage premium par sélection est réservé aux bus Mixte. Un bus VIP a tous ses sièges premium, un bus Standard aucun.'
      });
    }

    // Marquer les sièges comme premium
    const resultat = await pool.query(
      `UPDATE sieges SET est_premium = true
       WHERE bus_id = $1 AND numero = ANY($2)
       RETURNING numero`,
      [busId, sieges]
    );

    // Mettre à jour le supplément premium du bus si fourni
    if (supplement_premium !== undefined) {
      await pool.query(
        'UPDATE bus SET supplement_premium = $1 WHERE id = $2',
        [supplement_premium, busId]
      );
    }

    res.json({
      message: `${resultat.rows.length} siège(s) marqué(s) premium`,
      sieges_modifies: resultat.rows.map(r => r.numero)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { creerBus, listerBus, voirPlanBus, marquerToilettes, marquerAbime, reactiverSieges, marquerPremium, desactiverBus };