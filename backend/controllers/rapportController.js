const pool = require('../config/database');
const { genererPdfRapportAgence, genererPdfRapportJego } = require('../utils/pdfRapport');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RAPPORT AGENCE (agence connectÃ©e, pÃ©riode libre)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Calcule les donnÃ©es du rapport agence. PartagÃ© par la sortie JSON
// et la sortie PDF : une seule source de vÃ©ritÃ©, aucun risque de voir
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RAPPORT AGENCE â€” sortie JSON
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function rapportAgenceDetaille(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'Reserve aux agences' });
    }
    const agenceId = req.utilisateur.id;
    const periodeUi = req.query.periode || 'mois';
    const annee = req.query.annee ? parseInt(req.query.annee) : undefined;
    const periodeInterne = periodeUi === 'semaine' ? 'hebdo' : periodeUi === 'annee' ? 'annuel' : 'mensuel';
    const { debut, fin } = bornesPeriode(periodeInterne, annee);

    const base = await calculerRapportAgence(agenceId, debut, fin);

    const dureeJours = Math.round((new Date(fin) - new Date(debut)) / 86400000) + 1;
    const finPrec = new Date(new Date(debut).getTime() - 86400000);
    const debutPrec = new Date(finPrec.getTime() - (dureeJours - 1) * 86400000);
    const comparaison = await calculerRapportAgence(
      agenceId,
      debutPrec.toISOString().slice(0, 10),
      finPrec.toISOString().slice(0, 10)
    );

    let serieCA;
    if (periodeUi === 'annee') {
      const r = await pool.query(
        `SELECT TO_CHAR(m.mois, 'Mon') AS label,
                COALESCE(SUM(b.prix_total_client), 0)::int AS valeur
         FROM GENERATE_SERIES(DATE_TRUNC('year', $2::date), DATE_TRUNC('year', $2::date) + INTERVAL '11 months', '1 month') AS m(mois)
         LEFT JOIN trajets t ON DATE_TRUNC('month', t.date_depart) = m.mois AND t.agence_id = $1
         LEFT JOIN billets b ON b.trajet_id = t.id AND b.statut IN ('confirme','utilise')
         GROUP BY m.mois ORDER BY m.mois`,
        [agenceId, debut]
      );
      serieCA = r.rows;
    } else {
      const jours = periodeUi === 'semaine' ? 7 : 30;
      const r = await pool.query(
        `SELECT TO_CHAR(j.jour, 'DD/MM') AS label,
                COALESCE(SUM(b.prix_total_client), 0)::int AS valeur
         FROM GENERATE_SERIES($3::date - ($2::int - 1), $3::date, '1 day') AS j(jour)
         LEFT JOIN trajets t ON t.date_depart = j.jour AND t.agence_id = $1
         LEFT JOIN billets b ON b.trajet_id = t.id AND b.statut IN ('confirme','utilise')
         GROUP BY j.jour ORDER BY j.jour`,
        [agenceId, jours, fin]
      );
      serieCA = r.rows;
    }

    const destinations = await pool.query(
      `SELECT vd.nom_affiche || ' -> ' || va.nom_affiche AS route, COUNT(b.id) AS nb
       FROM billets b
       JOIN trajets t ON t.id = b.trajet_id
       JOIN lignes l ON l.id = t.ligne_id
       JOIN villes vd ON vd.code = l.ville_depart
       JOIN villes va ON va.code = l.ville_arrivee
       WHERE t.agence_id = $1 AND t.date_depart BETWEEN $2 AND $3 AND b.statut IN ('confirme','utilise')
       GROUP BY vd.nom_affiche, va.nom_affiche
       ORDER BY nb DESC LIMIT 5`,
      [agenceId, debut, fin]
    );

    const statuts = await pool.query(
      `SELECT b.statut, COUNT(*) AS nb
       FROM billets b JOIN trajets t ON t.id = b.trajet_id
       WHERE t.agence_id = $1 AND t.date_depart BETWEEN $2 AND $3
       GROUP BY b.statut`,
      [agenceId, debut, fin]
    );

    const qualite = await pool.query(
      `SELECT ROUND(AVG(note_service), 2) AS service, ROUND(AVG(note_conduite), 2) AS conduite,
              ROUND(AVG(note_horaires), 2) AS horaires, ROUND(AVG(note_confort), 2) AS confort
       FROM avis WHERE agence_id = $1 AND cree_le::date BETWEEN $2 AND $3 AND statut = 'visible'`,
      [agenceId, debut, fin]
    );

    const capacite = await pool.query(
      `SELECT COALESCE(SUM(
         (CASE regexp_replace(bu.disposition, '[^0-9]', '', 'g')
            WHEN '22' THEN 4 WHEN '21' THEN 3 WHEN '11' THEN 2 WHEN '23' THEN 5 ELSE 4
          END) * bu.nombre_rangees
       ), 0) AS sieges_total
       FROM trajets t JOIN bus bu ON bu.id = t.bus_id
       WHERE t.agence_id = $1 AND t.date_depart BETWEEN $2 AND $3`,
      [agenceId, debut, fin]
    );
    const vendus = await pool.query(
      `SELECT COUNT(*) AS nb FROM billets b JOIN trajets t ON t.id = b.trajet_id
       WHERE t.agence_id = $1 AND t.date_depart BETWEEN $2 AND $3 AND b.statut IN ('confirme','utilise')`,
      [agenceId, debut, fin]
    );
    const siegesTotal = parseInt(capacite.rows[0].sieges_total);
    const siegesVendus = parseInt(vendus.rows[0].nb);
    const tauxRemplissage = siegesTotal > 0 ? Math.round((siegesVendus / siegesTotal) * 1000) / 10 : 0;

    let comparaisonCA;
    const debutPrecStr = debutPrec.toISOString().slice(0, 10);
    const finPrecStr = finPrec.toISOString().slice(0, 10);
    if (periodeUi === 'annee') {
      const r = await pool.query(
        `SELECT TO_CHAR(m.mois, 'Mon') AS label,
                COALESCE(SUM(b.prix_total_client), 0)::int AS valeur
         FROM GENERATE_SERIES(DATE_TRUNC('year', $2::date), DATE_TRUNC('year', $2::date) + INTERVAL '11 months', '1 month') AS m(mois)
         LEFT JOIN trajets t ON DATE_TRUNC('month', t.date_depart) = m.mois AND t.agence_id = $1
         LEFT JOIN billets b ON b.trajet_id = t.id AND b.statut IN ('confirme','utilise')
         GROUP BY m.mois ORDER BY m.mois`,
        [agenceId, debutPrecStr]
      );
      comparaisonCA = r.rows;
    } else {
      const jours2 = periodeUi === 'semaine' ? 7 : 30;
      const r = await pool.query(
        `SELECT TO_CHAR(j.jour, 'DD/MM') AS label,
                COALESCE(SUM(b.prix_total_client), 0)::int AS valeur
         FROM GENERATE_SERIES($3::date - ($2::int - 1), $3::date, '1 day') AS j(jour)
         LEFT JOIN trajets t ON t.date_depart = j.jour AND t.agence_id = $1
         LEFT JOIN billets b ON b.trajet_id = t.id AND b.statut IN ('confirme','utilise')
         GROUP BY j.jour ORDER BY j.jour`,
        [agenceId, jours2, finPrecStr]
      );
      comparaisonCA = r.rows;
    }

    const litigesDetail = await pool.query(
      `SELECT numero, motif, statut, cree_le FROM litiges
       WHERE agence_id = $1 AND cree_le::date BETWEEN $2 AND $3
       ORDER BY cree_le DESC LIMIT 10`,
      [agenceId, debut, fin]
    );

    let remplissageSerie, retardsSerie;
    if (periodeUi === 'annee') {
      const r = await pool.query(
        `SELECT TO_CHAR(m.mois, 'Mon') AS label,
                COALESCE((
                  SELECT SUM((CASE regexp_replace(bu.disposition, '[^0-9]', '', 'g')
                                WHEN '22' THEN 4 WHEN '21' THEN 3 WHEN '11' THEN 2 WHEN '23' THEN 5 ELSE 4 END) * bu.nombre_rangees)
                  FROM trajets t2 JOIN bus bu ON bu.id = t2.bus_id
                  WHERE t2.agence_id = $1 AND DATE_TRUNC('month', t2.date_depart) = m.mois
                ), 0) AS capacite,
                COALESCE((
                  SELECT COUNT(*) FROM billets b JOIN trajets t3 ON t3.id = b.trajet_id
                  WHERE t3.agence_id = $1 AND DATE_TRUNC('month', t3.date_depart) = m.mois AND b.statut IN ('confirme','utilise')
                ), 0) AS vendus,
                COALESCE((
                  SELECT AVG(t4.retard_minutes) FROM trajets t4
                  WHERE t4.agence_id = $1 AND DATE_TRUNC('month', t4.date_depart) = m.mois AND t4.retard_minutes > 0
                ), 0) AS retard_moyen
         FROM GENERATE_SERIES(DATE_TRUNC('year', $2::date), DATE_TRUNC('year', $2::date) + INTERVAL '11 months', '1 month') AS m(mois)`,
        [agenceId, debut]
      );
      remplissageSerie = r.rows.map((row) => ({
        label: row.label,
        valeur: row.capacite > 0 ? Math.round((row.vendus / row.capacite) * 1000) / 10 : 0,
      }));
      retardsSerie = r.rows.map((row) => ({ label: row.label, valeur: Math.round(parseFloat(row.retard_moyen)) }));
    } else {
      const jours = periodeUi === 'semaine' ? 7 : 30;
      const r = await pool.query(
        `SELECT TO_CHAR(j.jour, 'DD/MM') AS label,
                COALESCE((
                  SELECT SUM((CASE regexp_replace(bu.disposition, '[^0-9]', '', 'g')
                                WHEN '22' THEN 4 WHEN '21' THEN 3 WHEN '11' THEN 2 WHEN '23' THEN 5 ELSE 4 END) * bu.nombre_rangees)
                  FROM trajets t2 JOIN bus bu ON bu.id = t2.bus_id
                  WHERE t2.agence_id = $1 AND t2.date_depart = j.jour
                ), 0) AS capacite,
                COALESCE((
                  SELECT COUNT(*) FROM billets b JOIN trajets t3 ON t3.id = b.trajet_id
                  WHERE t3.agence_id = $1 AND t3.date_depart = j.jour AND b.statut IN ('confirme','utilise')
                ), 0) AS vendus,
                COALESCE((
                  SELECT AVG(t4.retard_minutes) FROM trajets t4
                  WHERE t4.agence_id = $1 AND t4.date_depart = j.jour AND t4.retard_minutes > 0
                ), 0) AS retard_moyen
         FROM GENERATE_SERIES($3::date - ($2::int - 1), $3::date, '1 day') AS j(jour)`,
        [agenceId, jours, fin]
      );
      remplissageSerie = r.rows.map((row) => ({
        label: row.label,
        valeur: row.capacite > 0 ? Math.round((row.vendus / row.capacite) * 1000) / 10 : 0,
      }));
      retardsSerie = r.rows.map((row) => ({ label: row.label, valeur: Math.round(parseFloat(row.retard_moyen)) }));
    }

    async function indicateursPeriode(deb, fn) {
      const retard = await pool.query(
        `SELECT COALESCE(AVG(retard_minutes), 0) AS moyenne FROM trajets
         WHERE agence_id = $1 AND date_depart BETWEEN $2 AND $3 AND retard_minutes > 0`,
        [agenceId, deb, fn]
      );
      const ponctualite = await pool.query(
        `SELECT COUNT(*) FILTER (WHERE statut IN ('termine','en_cours') AND retard_minutes = 0) AS a_temps,
                COUNT(*) FILTER (WHERE statut IN ('termine','en_cours','retard')) AS total
         FROM trajets WHERE agence_id = $1 AND date_depart BETWEEN $2 AND $3`,
        [agenceId, deb, fn]
      );
      const reclamation = await pool.query(
        `SELECT
           (SELECT COUNT(*) FROM litiges WHERE agence_id = $1 AND cree_le::date BETWEEN $2 AND $3) AS litiges,
           (SELECT COUNT(*) FROM billets b JOIN trajets t ON t.id = b.trajet_id
            WHERE t.agence_id = $1 AND t.date_depart BETWEEN $2 AND $3 AND b.statut IN ('confirme','utilise')) AS billets`,
        [agenceId, deb, fn]
      );
      const resolution = await pool.query(
        `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (decide_le - cree_le)) / 86400), 0) AS jours
         FROM litiges WHERE agence_id = $1 AND decide_le IS NOT NULL AND decide_le::date BETWEEN $2 AND $3`,
        [agenceId, deb, fn]
      );
      const totalTrajets = parseInt(ponctualite.rows[0].total);
      const totalBillets = parseInt(reclamation.rows[0].billets);
      return {
        retardMoyen: Math.round(parseFloat(retard.rows[0].moyenne)),
        tauxPonctualite: totalTrajets > 0 ? Math.round((parseInt(ponctualite.rows[0].a_temps) / totalTrajets) * 1000) / 10 : 0,
        tauxReclamation: totalBillets > 0 ? Math.round((parseInt(reclamation.rows[0].litiges) / totalBillets) * 1000) / 10 : 0,
        tempsResolution: Math.round(parseFloat(resolution.rows[0].jours) * 10) / 10,
      };
    }
    const qualiteActuelle = await indicateursPeriode(debut, fin);
    const qualitePrecedente = await indicateursPeriode(
      debutPrec.toISOString().slice(0, 10),
      finPrec.toISOString().slice(0, 10)
    );

    const litigesNonResolus = await pool.query(
      `SELECT COUNT(*) AS nb FROM litiges WHERE agence_id = $1 AND statut NOT IN ('resolu', 'cloture')`,
      [agenceId]
    );
    const litigesResolus30j = await pool.query(
      `SELECT COUNT(*) AS nb FROM litiges
       WHERE agence_id = $1 AND statut IN ('resolu', 'cloture') AND decide_le >= NOW() - INTERVAL '30 days'`,
      [agenceId]
    );

    res.json({
      periode: { debut, fin, type: periodeUi, debutComparaison: debutPrecStr, finComparaison: finPrecStr },
      ventes: base.ventes,
      trajets: base.trajets,
      satisfaction: base.satisfaction,
      litiges: base.litiges,
      comparaison: {
        chiffre_affaires_client: comparaison.ventes.chiffre_affaires_client,
        nombre_billets: comparaison.ventes.nombre_billets,
      },
      serieCA,
      comparaisonCA,
      topDestinations: destinations.rows.map((d) => ({ route: d.route, reservations: parseInt(d.nb) })),
      repartitionStatuts: statuts.rows.map((s) => ({ statut: s.statut, nombre: parseInt(s.nb) })),
      qualite: {
        service: qualite.rows[0].service ? parseFloat(qualite.rows[0].service) : null,
        conduite: qualite.rows[0].conduite ? parseFloat(qualite.rows[0].conduite) : null,
        horaires: qualite.rows[0].horaires ? parseFloat(qualite.rows[0].horaires) : null,
        confort: qualite.rows[0].confort ? parseFloat(qualite.rows[0].confort) : null,
      },
      remplissage: { taux_pourcent: tauxRemplissage, sieges_total: siegesTotal, sieges_vendus: siegesVendus },
      remplissageSerie,
      retardsSerie,
      indicateursQualite: {
        retardMoyen: { valeur: qualiteActuelle.retardMoyen, delta: qualiteActuelle.retardMoyen - qualitePrecedente.retardMoyen },
        tauxPonctualite: { valeur: qualiteActuelle.tauxPonctualite, delta: Math.round((qualiteActuelle.tauxPonctualite - qualitePrecedente.tauxPonctualite) * 10) / 10 },
        tauxReclamation: { valeur: qualiteActuelle.tauxReclamation, delta: Math.round((qualiteActuelle.tauxReclamation - qualitePrecedente.tauxReclamation) * 10) / 10 },
        tempsResolution: { valeur: qualiteActuelle.tempsResolution, delta: Math.round((qualiteActuelle.tempsResolution - qualitePrecedente.tempsResolution) * 10) / 10 },
      },
      litigesResume: {
        nonResolus: parseInt(litigesNonResolus.rows[0].nb),
        resolus30j: parseInt(litigesResolus30j.rows[0].nb),
      },
      litigesDetail: litigesDetail.rows,
      actions: [],
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RAPPORT AGENCE â€” sortie PDF
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function rapportAgencePdf(req, res) {
  try {
    if (req.utilisateur.type !== 'agence') {
      return res.status(403).json({ error: 'RÃ©servÃ© aux agences' });
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RAPPORT JEGO GLOBAL (admin) â€” pÃ©riode libre + classement
// agences par rentabilitÃ© + comparaison pÃ©riode prÃ©cÃ©dente
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Calcule les donnÃ©es du rapport global. PartagÃ© JSON / PDF.
async function calculerRapportJego(date_debut, date_fin) {
  {

    // Calcul de la pÃ©riode prÃ©cÃ©dente, de mÃªme durÃ©e, pour comparaison
    const dureeJours = Math.round((new Date(date_fin) - new Date(date_debut)) / 86400000) + 1;
    const finPrecedente = new Date(date_debut);
    finPrecedente.setDate(finPrecedente.getDate() - 1);
    const debutPrecedente = new Date(finPrecedente);
    debutPrecedente.setDate(debutPrecedente.getDate() - dureeJours + 1);
    const finPrecStr = finPrecedente.toISOString().slice(0,10);
    const debutPrecStr = debutPrecedente.toISOString().slice(0,10);

    // RequÃªte rÃ©utilisable pour une pÃ©riode donnÃ©e
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

    // Classement des agences par rentabilitÃ© (marge JEGO gÃ©nÃ©rÃ©e) sur la pÃ©riode
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RAPPORT JEGO GLOBAL â€” sortie JSON
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function rapportJego(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'AccÃ¨s rÃ©servÃ© aux administrateurs' });
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RAPPORT JEGO GLOBAL â€” sortie PDF
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function rapportJegoPdf(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'AccÃ¨s rÃ©servÃ© aux administrateurs' });
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

// ═══════════════════════════════════════════════════
// RAPPORT ADMIN DÉTAILLÉ — écran "Rapports & statistiques"
// Enrichit calculerRapportJego avec : série temporelle, note moyenne par
// agence (vraie donnée issue de la table avis), détail par agence, litiges
// réels de la période, répartition des paiements par opérateur, et
// tendance sur les 4 périodes précédentes.
// "synthese" reste vide : ce sont des points d'attention textuels qui
// nécessitent des seuils métier validés avant d'être générés.
// ═══════════════════════════════════════════════════
function bornesPeriode(periode, annee) {
  const aujourdhui = new Date();
  let debut, fin;
  if (periode === 'hebdo') {
    fin = new Date(aujourdhui);
    debut = new Date(aujourdhui);
    debut.setDate(debut.getDate() - 6);
  } else if (periode === 'annuel') {
    const an = annee || aujourdhui.getFullYear();
    debut = new Date(`${an}-01-01`);
    fin = new Date(`${an}-12-31`);
    if (fin > aujourdhui) fin = aujourdhui;
  } else {
    fin = new Date(aujourdhui);
    debut = new Date(aujourdhui);
    debut.setDate(debut.getDate() - 29);
  }
  return { debut: debut.toISOString().slice(0, 10), fin: fin.toISOString().slice(0, 10) };
}

async function rapportAdminDetaille(req, res) {
  try {
    if (req.utilisateur.type !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const periode = req.query.periode || 'mensuel';
    const annee = req.query.annee ? parseInt(req.query.annee) : undefined;
    const { debut, fin } = bornesPeriode(periode, annee);

    const base = await calculerRapportJego(debut, fin);

    const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' F';
    const pct = (n) => (n === null || n === undefined ? '' : (n >= 0 ? '+' : '') + n + '%');

    let serieRevenu;
    if (periode === 'annuel') {
      const r = await pool.query(
        `SELECT TO_CHAR(m.mois, 'Mon') AS label,
                COALESCE(SUM(e.montant_jego), 0)::int AS valeur
         FROM GENERATE_SERIES(DATE_TRUNC('year', $1::date), DATE_TRUNC('year', $1::date) + INTERVAL '11 months', '1 month') AS m(mois)
         LEFT JOIN billets b ON DATE_TRUNC('month', b.cree_le) = m.mois AND b.statut IN ('confirme','utilise')
         LEFT JOIN escrow e ON e.billet_id = b.id
         GROUP BY m.mois ORDER BY m.mois`,
        [debut]
      );
      serieRevenu = r.rows;
    } else {
      const jours = periode === 'hebdo' ? 7 : 30;
      const r = await pool.query(
        `SELECT TO_CHAR(j.jour, 'DD/MM') AS label,
                COALESCE(SUM(e.montant_jego), 0)::int AS valeur
         FROM GENERATE_SERIES($2::date - ($1::int - 1), $2::date, '1 day') AS j(jour)
         LEFT JOIN billets b ON b.cree_le::date = j.jour AND b.statut IN ('confirme','utilise')
         LEFT JOIN escrow e ON e.billet_id = b.id
         GROUP BY j.jour ORDER BY j.jour`,
        [jours, fin]
      );
      serieRevenu = r.rows;
    }

    const classementBrut = await pool.query(
      `SELECT a.id, a.nom,
              COUNT(DISTINCT b.id) FILTER (WHERE b.statut IN ('confirme','utilise')) AS nb_billets,
              COALESCE(AVG(av.note_globale), 0) AS note
       FROM agences a
       LEFT JOIN billets b ON b.agence_id = a.id
       LEFT JOIN trajets t ON t.id = b.trajet_id AND t.date_depart BETWEEN $1 AND $2
       LEFT JOIN avis av ON av.agence_id = a.id AND av.cree_le::date BETWEEN $1 AND $2 AND av.statut = 'visible'
       WHERE a.statut = 'actif' AND (b.id IS NULL OR t.id IS NOT NULL)
       GROUP BY a.id, a.nom
       ORDER BY nb_billets DESC
       LIMIT 5`,
      [debut, fin]
    );
    const classement = classementBrut.rows.map(a => ({
      nom: a.nom,
      note: Number(a.note).toFixed(1) + ' ★',
      billets: `${a.nb_billets} billets`,
    }));

    const agencesDetailBrut = await pool.query(
      `SELECT a.id, a.nom,
              COUNT(DISTINCT b.id) FILTER (WHERE b.statut IN ('confirme','utilise')) AS nb_billets,
              COALESCE(SUM(e.montant_jego), 0) AS revenu,
              COALESCE(AVG(av.note_globale), 0) AS note,
              (SELECT COUNT(*) FROM litiges l WHERE l.agence_id = a.id AND l.cree_le::date BETWEEN $1 AND $2) AS nb_litiges
       FROM agences a
       LEFT JOIN billets b ON b.agence_id = a.id
       LEFT JOIN trajets t ON t.id = b.trajet_id AND t.date_depart BETWEEN $1 AND $2
       LEFT JOIN escrow e ON e.billet_id = b.id
       LEFT JOIN avis av ON av.agence_id = a.id AND av.cree_le::date BETWEEN $1 AND $2 AND av.statut = 'visible'
       WHERE a.statut = 'actif' AND (b.id IS NULL OR t.id IS NOT NULL)
       GROUP BY a.id, a.nom
       ORDER BY revenu DESC`,
      [debut, fin]
    );
    const agencesDetail = agencesDetailBrut.rows.map(a => ({
      id: String(a.id).slice(0, 8),
      nom: a.nom,
      billets: String(a.nb_billets),
      revenu: fmt(a.revenu),
      note: Number(a.note).toFixed(1),
      litiges: String(a.nb_litiges),
    }));

    const litigesPeriode = await pool.query(
      `SELECT l.numero, l.motif, l.statut, a.nom AS nom_agence
       FROM litiges l JOIN agences a ON a.id = l.agence_id
       WHERE l.cree_le::date BETWEEN $1 AND $2
       ORDER BY l.cree_le DESC LIMIT 10`,
      [debut, fin]
    );
    const libelleStatutLitige = { resolu: 'résolu', en_cours: 'en cours', ouvert: 'ouvert', cloture: 'clôturé', escalade: 'escaladé' };
    const litigesResume = litigesPeriode.rows.map(l =>
      `${l.numero} — ${l.nom_agence} — ${l.motif} (${libelleStatutLitige[l.statut] || l.statut})`
    );

    const paiementsBrut = await pool.query(
      `SELECT operateur, COUNT(*) AS nb
       FROM paiements
       WHERE type = 'paiement' AND statut = 'confirme'
         AND cree_le::date BETWEEN $1 AND $2
       GROUP BY operateur`,
      [debut, fin]
    );
    const totalPaiements = paiementsBrut.rows.reduce((s, r) => s + parseInt(r.nb), 0);
    const libelleOperateur = { mtn_momo: 'MTN Mobile Money', orange_money: 'Orange Money' };
    const paiements = paiementsBrut.rows.map(r => ({
      label: libelleOperateur[r.operateur] || r.operateur,
      part: totalPaiements > 0 ? Math.round((parseInt(r.nb) / totalPaiements) * 100) : 0,
    }));

    const dureeJours = Math.round((new Date(fin) - new Date(debut)) / 86400000) + 1;
    const tendance = [];
    for (let i = 3; i >= 0; i--) {
      const finPeriode = new Date(new Date(fin).getTime() - i * dureeJours * 86400000);
      const debutPeriode = new Date(finPeriode.getTime() - (dureeJours - 1) * 86400000);
      const finStr = finPeriode.toISOString().slice(0, 10);
      const debutStr = debutPeriode.toISOString().slice(0, 10);
      const r = await pool.query(
        `SELECT COALESCE(SUM(e.montant_jego), 0) AS revenu
         FROM billets b JOIN trajets t ON t.id = b.trajet_id
         LEFT JOIN escrow e ON e.billet_id = b.id
         WHERE t.date_depart BETWEEN $1 AND $2 AND b.statut IN ('confirme','utilise')`,
        [debutStr, finStr]
      );
      tendance.push({
        label: periode === 'annuel' ? String(finPeriode.getFullYear()) : finStr.slice(5),
        valeur: parseInt(r.rows[0].revenu),
      });
    }

    res.json({
      kpis: {
        revenuNet: fmt(base.finances.marge_nette),
        billetsVendus: String(base.finances.nombre_billets),
        agencesActives: String(base.agences.actives),
        litigesResolus: String(base.litiges.resolus_periode),
        deltaRevenu: pct(base.finances.evolution_vs_periode_precedente.marge_nette_pourcent),
        deltaBillets: pct(base.finances.evolution_vs_periode_precedente.billets_pourcent),
        deltaAgences: '',
        deltaLitiges: '',
      },
      serieRevenu,
      classement,
      agencesDetail,
      litigesResume,
      tendance,
      paiements,
      synthese: [],
      rapportsDisponibles: [
        { id: 'global', libelle: 'Rapport global JEGO', type: 'global' },
      ],
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { rapportAgence, rapportAgencePdf, rapportJego, rapportJegoPdf, rapportAdminDetaille, rapportAgenceDetaille };