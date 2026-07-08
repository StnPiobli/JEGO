const { calculerHorizon } = require('../services/programmationService');

// ═══════════════════════════════════════════════════
// VOIR SON HORIZON DE PROGRAMMATION (agence connectée)
// ═══════════════════════════════════════════════════
async function monHorizon(req, res) {
  try {
    const agenceId = req.utilisateur.id;
    const resultat = await calculerHorizon(agenceId);

    if (!resultat) {
      return res.status(404).json({ error: 'Agence introuvable' });
    }

    res.json(resultat);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { monHorizon };