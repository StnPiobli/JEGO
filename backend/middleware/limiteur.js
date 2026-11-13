// ═══════════════════════════════════════════════════
// LIMITER LES TENTATIVES RÉPÉTÉES
//
// Exemple concret : un inconnu essaie 10 000 mots de passe sur le compte
// de Bus Express. Sans limite, il peut le faire en quelques minutes.
// Avec ce garde-fou, après 10 essais ratés sur le même compte depuis la
// même adresse, il doit attendre 15 minutes.
//
// Compteur en mémoire : suffisant pour un seul serveur. À remplacer par
// un compteur partagé (Redis…) le jour où plusieurs serveurs tournent.
// ═══════════════════════════════════════════════════

/**
 * @param {object} o
 * @param {number} o.max          nombre d'essais permis dans la fenêtre
 * @param {number} o.fenetreMin   durée de la fenêtre, en minutes
 * @param {boolean} [o.echecsSeuls] ne compter que les réponses en erreur
 *        (connexion : un utilisateur qui réussit n'est jamais bloqué)
 * @param {(req) => string} [o.cle] ce qui identifie l'essai, en plus de l'adresse IP
 * @param {string} o.message
 */
function limiter({ max, fenetreMin, echecsSeuls = false, cle = () => '', message }) {
  const compteurs = new Map();
  const fenetreMs = fenetreMin * 60 * 1000;

  // Ménage régulier pour que la mémoire ne grossisse pas indéfiniment.
  setInterval(() => {
    const maintenant = Date.now();
    for (const [k, v] of compteurs) if (v.fin <= maintenant) compteurs.delete(k);
  }, fenetreMs).unref();

  return (req, res, next) => {
    const k = `${req.ip}|${String(cle(req) || '').toLowerCase().trim()}`;
    const maintenant = Date.now();
    let entree = compteurs.get(k);
    if (!entree || entree.fin <= maintenant) {
      entree = { n: 0, fin: maintenant + fenetreMs };
      compteurs.set(k, entree);
    }

    if (entree.n >= max) {
      const minutes = Math.ceil((entree.fin - maintenant) / 60000);
      res.setHeader('Retry-After', String(Math.ceil((entree.fin - maintenant) / 1000)));
      return res.status(429).json({ error: `${message} Réessayez dans ${minutes} min.` });
    }

    if (echecsSeuls) {
      res.on('finish', () => { if (res.statusCode >= 400) entree.n += 1; });
    } else {
      entree.n += 1;
    }
    next();
  };
}

// L'identifiant tapé (email, téléphone…) : on bloque ce compte depuis
// cette adresse, sans gêner les autres utilisateurs du même réseau.
const identifiant = (req) => {
  const b = req.body || {};
  return b.email || b.telephone || b.identifiant || b.login || '';
};

const limiteConnexion = limiter({
  max: 10, fenetreMin: 15, echecsSeuls: true, cle: identifiant,
  message: 'Trop de tentatives de connexion.',
});

const limiteMotDePasse = limiter({
  max: 5, fenetreMin: 60, cle: identifiant,
  message: 'Trop de demandes de réinitialisation.',
});

const limiteCodeReinit = limiter({
  max: 10, fenetreMin: 15, echecsSeuls: true, cle: identifiant,
  message: 'Trop de codes erronés.',
});

const limiteContact = limiter({
  max: 5, fenetreMin: 60,
  message: 'Trop de messages envoyés.',
});

const limiteRecuperationBillet = limiter({
  max: 30, fenetreMin: 15, echecsSeuls: true,
  message: 'Trop de numéros de billet erronés.',
});

module.exports = {
  limiter, limiteConnexion, limiteMotDePasse, limiteCodeReinit, limiteContact, limiteRecuperationBillet,
};
