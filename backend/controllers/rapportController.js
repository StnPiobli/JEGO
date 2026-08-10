const pool = require('../config/database');
const { genererPdfRapportAgence, genererPdfRapportJego } = require('../utils/pdfRapport');

// ═══════════════════════════════════════════════════
// RAPPORT AGENCE (agence connectée, période libre)
// ═══════════════════════════════════════════════════
// Calcule les données du rapport agence. Partagé par la sortie JSON
// et la sortie PDF : une seule source de vérité, aucun risque de voir
// les deux formats diverger.
async function calculerRapportAgence(agenceId, date_debut, date_fin) {
  {

    const billets = await pool.query(
      `SELECT COUNT(*) AS nb_billets,
              COALESCE(SUM(prix_total_client), 0) AS ca_client
       FROM billets b JOIN trajets t ON t.id = b.trajet_id
       WHERE b.agence_id = $1 AND t.date_depart BETWEEN $2 AND $3
         AND b.statut IN ('confirme', 'utilise')`,
      [agenceId, date_debut, date_fin]
    );

    const escrowVerse = await pool.query(
      `SELECT COALESCE(SUM(e.montant_agence), 0) AS montant_recu
       FROM escrow e JOIN billets b ON b.id = e.billet_id JOIN trajets t ON t.id = b.trajet_id
       WHERE b.agence_id = $1 AND t.date_depart BETWEEN $2 AND $3 AND e.statut = 'verse'`,
      [agenceId, date_debut, date_fin]
    );

    const trajets = await pool.query(
      `SELECT
          COUNT(*) FILTER (WHERE statut = 'termine') AS effectues,
          COUNT(*) FILTER (WHERE statut = 'annule') AS annules,
          COUNT(*) FILTER (WHERE retard_minutes > 0) AS en_retard,
          COUNT(*) AS total
       FROM trajets WHERE agence_id = $1 AND date_depart BETWEEN $2 AND $3`,
      [agenceId, date_debut, date_fin]
    );

    const avis = await pool.query(
      `SELECT ROUND(AVG(note_globale), 2) AS note_moyenne, COUNT(*) AS nb_avis
       FROM avis WHERE agence_id = $1 AND cree_le BETWEEN $2 AND $3 AND statut = 'visible'`,
      [agenceId, date_debut, date_fin]
    );

    const litiges = await pool.query(
      `SELECT COUNT(*) AS nb_litiges FROM litiges WHERE agence_id = $1 AND cree_le BETWEEN $2 AND $3`,
      [agenceId, date_debut, date_fin]
    );

    return {
      periode: { debut: date_debut, fin: date_fin },
      ventes: {
        nombre_billets: parseInt(billets.rows[0].nb_billets),
        chiffre_affaires_client: parseInt(billets.rows[0].ca_client),
        montant_recu_escrow: parseInt(escrowVerse.rows[0].montant_recu)
      },
      trajets: {
        total: parseInt(trajets.rows[0].total),
        effectues: parseInt(trajets.rows[0].effectues),
        annules: parseInt(trajets.rows[0].annules),
        en_retard: parseInt(trajets.rows[0].en_retard)
      },
      satisfaction: {
        note_moyenne: avis.rows[0].note_moyenne ? parseFloat(avis.rows[0].note_moyenne) : null,
        nombre_avis: parseInt(avis.rows[0].nb_avis)
      },
      litiges: parseInt(litiges.rows[0].nb_litiges)
    };
  }
}

// ═══════════════════════════════════════════════════
// RAPPORT AGENCE — sortie JSON
// ═══════════════════════════════════════════════════
async function rapportAgence(req, res) {
  try {
    const { date_debut, date_fin } = req.query;
    if (!date_debut || !date_fin) {
      return res.status(400).json({ error: 'date_debut et date_fin sont obligatoires (format YYYY-MM-DD)' });
    }
    const donnees = await calculerRapportAgence(req.utilisateur.id, date_debut, date_fin);
    res.json(donnees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// RAPPORT AGENCE — sortie PDF
// ═══════════════════════════════════════════════════
async function rapportAgencePdf(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Réservé aux agences' });
    }
    const { date_debut, date_fin } = req.query;
    if (!date_debut || !date_fin) {
      return res.status(400).json({ error: 'date_debut et date_fin sont obligatoires (format YYYY-MM-DD)' });
    }

    const agenceId = req.utilisateur.id;
    const donnees = await calculerRapportAgence(agenceId, date_debut, date_fin);

    const infoAgence = await pool.query('SELECT nom FROM agences WHERE id = $1', [agenceId]);
    const nomAgence = infoAgence.rows[0]?.nom || 'Agence';

    const nomFichier = `JEGO_rapport_${nomAgence.replace(/[^a-zA-Z0-9]/g, '_')}_${date_debut}_${date_fin}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);

    const doc = genererPdfRapportAgence(donnees, nomAgence);
    doc.pipe(res);
    doc.end();

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// RAPPORT JEGO GLOBAL (admin) — période libre + classement
// agences par rentabilité + comparaison période précédente
// ═══════════════════════════════════════════════════
// Calcule les données du rapport global. Partagé JSON / PDF.
async function calculerRapportJego(date_debut, date_fin) {
  {

    // Calcul de la période précédente, de même durée, pour comparaison
    const dureeJours = Math.round((new Date(date_fin) - new Date(date_debut)) / 86400000) + 1;
    const finPrecedente = new Date(date_debut);
    finPrecedente.setDate(finPrecedente.getDate() - 1);
    const debutPrecedente = new Date(finPrecedente);
    debutPrecedente.setDate(debutPrecedente.getDate() - dureeJours + 1);
    const finPrecStr = finPrecedente.toISOString().slice(0,10);
    const debutPrecStr = debutPrecedente.toISOString().slice(0,10);

    // Requête réutilisable pour une période donnée
    async function financesSurPeriode(debut, fin) {
      const r = await pool.query(
        `SELECT
            COUNT(*) AS nb_billets,
            COALESCE(SUM(prix_total_client), 0) AS ca_total,
            COALESCE(SUM(e.montant_jego) FILTER (WHERE e.montant_jego > 0), 0) AS marge_positive,
            COALESCE(SUM(e.montant_jego) FILTER (WHERE e.montant_jego < 0), 0) AS cout_fidelite
         FROM billets b
         JOIN trajets t ON t.id = b.trajet_id
         LEFT JOIN escrow e ON e.billet_id = b.id
         WHERE t.date_depart BETWEEN $1 AND $2 AND b.statut IN ('confirme','utilise')`,
        [debut, fin]
      );
      return r.rows[0];
    }

    const actuel = await financesSurPeriode(date_debut, date_fin);
    const precedent = await financesSurPeriode(debutPrecStr, finPrecStr);

    const marginetteActuelle = parseInt(actuel.marge_positive) + parseInt(actuel.cout_fidelite);
    const marginettePrecedente = parseInt(precedent.marge_positive) + parseInt(precedent.cout_fidelite);
    const evolutionMarge = marginettePrecedente !== 0
      ? Math.round(((marginetteActuelle - marginettePrecedente) / Math.abs(marginettePrecedente)) * 100)
      : null;
    const evolutionBillets = parseInt(precedent.nb_billets) !== 0
      ? Math.round(((parseInt(actuel.nb_billets) - parseInt(precedent.nb_billets)) / parseInt(precedent.nb_billets)) * 100)
      : null;

    const agences = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE statut = 'actif') AS actives,
              COUNT(*) FILTER (WHERE statut = 'en_attente') AS en_attente,
              COUNT(*) FILTER (WHERE cree_le BETWEEN $1 AND $2) AS nouvelles
       FROM agences`,
      [date_debut, date_fin]
    );

    const litiges = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE statut IN ('ouvert','en_cours')) AS ouverts,
              COUNT(*) FILTER (WHERE statut = 'resolu' AND cree_le BETWEEN $1 AND $2) AS resolus
       FROM litiges`,
      [date_debut, date_fin]
    );

    // Classement des agences par rentabilité (marge JEGO générée) sur la période
    const classement = await pool.query(
      `SELECT a.id, a.nom,
              COUNT(b.id) AS nb_billets,
              COALESCE(SUM(e.montant_jego), 0) AS marge_generee
       FROM agences a
       LEFT JOIN billets b ON b.agence_id = a.id AND b.statut IN ('confirme','utilise')
       LEFT JOIN trajets t ON t.id = b.trajet_id AND t.date_depart BETWEEN $1 AND $2
       LEFT JOIN escrow e ON e.billet_id = b.id
       WHERE a.statut = 'actif' AND (b.id IS NULL OR t.id IS NOT NULL)
       GROUP BY a.id, a.nom
       ORDER BY marge_generee DESC`,
      [date_debut, date_fin]
    );

    return {
      periode: { debut: date_debut, fin: date_fin, jours: dureeJours },
      periode_comparee: { debut: debutPrecStr, fin: finPrecStr },
      finances: {
        nombre_billets: parseInt(actuel.nb_billets),
        chiffre_affaires_total: parseInt(actuel.ca_total),
        marge_jego_positive: parseInt(actuel.marge_positive),
        cout_programme_fidelite: parseInt(actuel.cout_fidelite),
        marge_nette: marginetteActuelle,
        evolution_vs_periode_precedente: {
          billets_pourcent: evolutionBillets,
          marge_nette_pourcent: evolutionMarge
        }
      },
      agences: {
        actives: parseInt(agences.rows[0].actives),
        en_attente: parseInt(agences.rows[0].en_attente),
        nouvelles_periode: parseInt(agences.rows[0].nouvelles)
      },
      litiges: {
        ouverts_actuellement: parseInt(litiges.rows[0].ouverts),
        resolus_periode: parseInt(litiges.rows[0].resolus)
      },
      classement_agences_par_rentabilite: classement.rows.map(a => ({
        agence: a.nom,
        nombre_billets: parseInt(a.nb_billets),
        marge_generee_jego: parseInt(a.marge_generee)
      }))
    };
  }
}

// ═══════════════════════════════════════════════════
// RAPPORT JEGO GLOBAL — sortie JSON
// ═══════════════════════════════════════════════════
async function rapportJego(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const { date_debut, date_fin } = req.query;
    if (!date_debut || !date_fin) {
      return res.status(400).json({ error: 'date_debut et date_fin sont obligatoires (format YYYY-MM-DD)' });
    }
    const donnees = await calculerRapportJego(date_debut, date_fin);
    res.json(donnees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════
// RAPPORT JEGO GLOBAL — sortie PDF
// ═══════════════════════════════════════════════════
async function rapportJegoPdf(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const { date_debut, date_fin } = req.query;
    if (!date_debut || !date_fin) {
      return res.status(400).json({ error: 'date_debut et date_fin sont obligatoires (format YYYY-MM-DD)' });
    }

    const donnees = await calculerRapportJego(date_debut, date_fin);

    const nomFichier = `JEGO_rapport_global_${date_debut}_${date_fin}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);

    const doc = genererPdfRapportJego(donnees);
    doc.pipe(res);
    doc.end();

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}

module.exports = { rapportAgence, rapportAgencePdf, rapportJego, rapportJegoPdf };