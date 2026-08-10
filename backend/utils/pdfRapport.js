const PDFDocument = require('pdfkit');

// ═══════════════════════════════════════════════════
// GÉNÉRATION PDF DES RAPPORTS JEGO
//
// Mise en page maison : bandeau de titre, cartouches de chiffres
// clés, tableaux zébrés, pied de page paginé. Aucun template
// externe — tout est dessiné ici pour garder la main sur le rendu.
//
// Les montants sont formatés en FCFA avec séparateur d'espace
// insécable, conformément à l'usage local.
// ═══════════════════════════════════════════════════

// Palette JEGO
const VERT        = '#0F7B4F';
const VERT_CLAIR  = '#E8F3ED';
const NOIR        = '#111111';
const GRIS        = '#6B7280';
const GRIS_LIGNE  = '#E5E7EB';
const ROUGE       = '#B42318';

const MARGE = 45;

function fcfa(n) {
  const v = Number(n) || 0;
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + '\u00A0FCFA';
}

function nombre(n) {
  return (Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}

function dateFr(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Bandeau de titre ──────────────────────────────
function enTete(doc, titre, sousTitre) {
  const l = doc.page.width - MARGE * 2;

  doc.rect(0, 0, doc.page.width, 96).fill(NOIR);
  doc.rect(0, 92, doc.page.width, 4).fill(VERT);

  doc.fillColor('#FFFFFF').fontSize(26).font('Helvetica-Bold')
     .text('JEGO', MARGE, 26);
  doc.fillColor(VERT).fontSize(8).font('Helvetica-Bold')
     .text('RÉSERVATION DE BUS — CAMEROUN', MARGE, 56, { characterSpacing: 1.2 });

  doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold')
     .text(titre, MARGE, 30, { width: l, align: 'right' });
  doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica')
     .text(sousTitre, MARGE, 50, { width: l, align: 'right' });

  doc.y = 125;
  doc.fillColor(NOIR);
}

// ─── Titre de section ──────────────────────────────
function section(doc, texte) {
  if (doc.y > doc.page.height - 140) doc.addPage();
  doc.moveDown(0.6);
  const y = doc.y;
  doc.rect(MARGE, y, 3, 14).fill(VERT);
  doc.fillColor(NOIR).fontSize(11.5).font('Helvetica-Bold')
     .text(texte.toUpperCase(), MARGE + 10, y + 1, { characterSpacing: 0.6 });
  doc.moveDown(0.8);
  doc.fillColor(NOIR).font('Helvetica');
}

// ─── Cartouches de chiffres clés ───────────────────
// cartes : [{ label, valeur, accent }]
function cartouches(doc, cartes) {
  const l = doc.page.width - MARGE * 2;
  const parLigne = cartes.length >= 4 ? Math.ceil(cartes.length / 2) : cartes.length;
  const ecart = 10;
  const largeur = (l - ecart * (parLigne - 1)) / parLigne;
  const hauteur = 52;

  let x = MARGE, y = doc.y, compteur = 0;

  for (const c of cartes) {
    if (compteur > 0 && compteur % parLigne === 0) {
      x = MARGE;
      y += hauteur + ecart;
    }
    doc.roundedRect(x, y, largeur, hauteur, 5).fill(VERT_CLAIR);
    doc.fillColor(GRIS).fontSize(7.5).font('Helvetica-Bold')
       .text(String(c.label).toUpperCase(), x + 10, y + 9,
             { width: largeur - 20, characterSpacing: 0.4 });
    doc.fillColor(c.accent || VERT).fontSize(13).font('Helvetica-Bold')
       .text(String(c.valeur), x + 10, y + 25, { width: largeur - 20 });
    x += largeur + ecart;
    compteur++;
  }

  doc.y = y + hauteur + 14;
  doc.fillColor(NOIR).font('Helvetica');
}

// ─── Tableau zébré ─────────────────────────────────
// colonnes : [{ titre, cle, largeur (ratio), align }]
function tableau(doc, colonnes, lignes, options = {}) {
  const l = doc.page.width - MARGE * 2;
  const total = colonnes.reduce((s, c) => s + (c.largeur || 1), 0);
  const hLigne = 20;

  function entete() {
    const y = doc.y;
    doc.rect(MARGE, y, l, 22).fill(NOIR);
    let x = MARGE;
    for (const c of colonnes) {
      const w = l * ((c.largeur || 1) / total);
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
         .text(c.titre, x + 7, y + 7, { width: w - 14, align: c.align || 'left' });
      x += w;
    }
    doc.y = y + 22;
  }

  entete();

  if (!lignes || lignes.length === 0) {
    doc.rect(MARGE, doc.y, l, hLigne).fill('#FAFAFA');
    doc.fillColor(GRIS).fontSize(8.5).font('Helvetica-Oblique')
       .text(options.vide || 'Aucune donnée sur cette période', MARGE + 7, doc.y + 6,
             { width: l - 14 });
    doc.y += hLigne + 6;
    doc.fillColor(NOIR).font('Helvetica');
    return;
  }

  let alterne = false;
  for (const ligne of lignes) {
    if (doc.y > doc.page.height - 90) {
      doc.addPage();
      entete();
      alterne = false;
    }
    const y = doc.y;
    if (alterne) doc.rect(MARGE, y, l, hLigne).fill('#F9FAFB');
    let x = MARGE;
    for (const c of colonnes) {
      const w = l * ((c.largeur || 1) / total);
      const valeur = ligne[c.cle];
      doc.fillColor(c.couleur ? c.couleur(ligne) : NOIR)
         .fontSize(8.5).font(c.gras ? 'Helvetica-Bold' : 'Helvetica')
         .text(valeur === null || valeur === undefined ? '—' : String(valeur),
               x + 7, y + 6, { width: w - 14, align: c.align || 'left', ellipsis: true, height: 12 });
      x += w;
    }
    doc.moveTo(MARGE, y + hLigne).lineTo(MARGE + l, y + hLigne)
       .lineWidth(0.5).strokeColor(GRIS_LIGNE).stroke();
    doc.y = y + hLigne;
    alterne = !alterne;
  }
  doc.y += 8;
  doc.fillColor(NOIR).font('Helvetica');
}

// ─── Pieds de page numérotés ───────────────────────
function piedsDePage(doc) {
  const plage = doc.bufferedPageRange();
  for (let i = plage.start; i < plage.start + plage.count; i++) {
    doc.switchToPage(i);

    // Le pied de page s'écrit volontairement SOUS la marge basse.
    // Sans neutraliser cette marge, pdfkit considère le texte comme
    // débordant et ajoute une page vide à chaque pied de page.
    const margeBasse = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const y = doc.page.height - 42;
    const l = doc.page.width - MARGE * 2;

    doc.moveTo(MARGE, y).lineTo(MARGE + l, y)
       .lineWidth(0.5).strokeColor(GRIS_LIGNE).stroke();

    doc.fillColor(GRIS).fontSize(7.5).font('Helvetica')
       .text('Document confidentiel — généré automatiquement par JEGO',
             MARGE, y + 8, { width: l / 2, lineBreak: false });
    doc.fillColor(GRIS).fontSize(7.5)
       .text(`Page ${i - plage.start + 1} / ${plage.count}`,
             MARGE + l / 2, y + 8, { width: l / 2, align: 'right', lineBreak: false });

    doc.page.margins.bottom = margeBasse;
  }
}

// ═══════════════════════════════════════════════════
// RAPPORT AGENCE — PDF
// ═══════════════════════════════════════════════════
function genererPdfRapportAgence(donnees, nomAgence) {
  const doc = new PDFDocument({ size: 'A4', margin: MARGE, bufferPages: true });

  const periode = `${dateFr(donnees.periode.debut)} — ${dateFr(donnees.periode.fin)}`;
  enTete(doc, 'Rapport d\'activité', nomAgence || 'Agence');

  doc.fillColor(GRIS).fontSize(9).font('Helvetica')
     .text(`Période analysée : ${periode}`, MARGE, doc.y);
  doc.moveDown(1);

  // ── Ventes
  section(doc, 'Ventes');
  cartouches(doc, [
    { label: 'Billets vendus',      valeur: nombre(donnees.ventes.nombre_billets) },
    { label: 'Chiffre d\'affaires', valeur: fcfa(donnees.ventes.chiffre_affaires_client) },
    { label: 'Reversé à l\'agence', valeur: fcfa(donnees.ventes.montant_recu_escrow) },
  ]);

  // ── Trajets
  section(doc, 'Trajets');
  const t = donnees.trajets;
  const tauxPonctualite = t.total > 0
    ? Math.round(((t.total - t.en_retard) / t.total) * 100)
    : null;
  cartouches(doc, [
    { label: 'Programmés', valeur: nombre(t.total) },
    { label: 'Effectués',  valeur: nombre(t.effectues) },
    { label: 'Annulés',    valeur: nombre(t.annules), accent: t.annules > 0 ? ROUGE : VERT },
    { label: 'En retard',  valeur: nombre(t.en_retard), accent: t.en_retard > 0 ? ROUGE : VERT },
  ]);

  if (tauxPonctualite !== null) {
    doc.fillColor(GRIS).fontSize(9).font('Helvetica')
       .text(`Taux de ponctualité sur la période : ${tauxPonctualite}\u00A0%`, MARGE, doc.y);
    doc.moveDown(0.5);
  }

  // ── Satisfaction
  section(doc, 'Satisfaction client');
  const note = donnees.satisfaction.note_moyenne;
  cartouches(doc, [
    {
      label: 'Note moyenne',
      valeur: note !== null && note !== undefined ? `${note} / 5` : 'Aucun avis',
      accent: note === null || note === undefined ? GRIS : (note >= 4 ? VERT : (note >= 3 ? '#B45309' : ROUGE))
    },
    { label: 'Avis reçus', valeur: nombre(donnees.satisfaction.nombre_avis) },
    { label: 'Litiges ouverts', valeur: nombre(donnees.litiges),
      accent: donnees.litiges > 0 ? ROUGE : VERT },
  ]);

  // ── Lecture
  section(doc, 'Points d\'attention');
  const points = [];
  if (t.annules > 0) {
    points.push(`${t.annules} trajet(s) annulé(s) : chaque annulation entraîne un remboursement intégral au client et une perte de commission pour JEGO.`);
  }
  if (t.en_retard > 0) {
    points.push(`${t.en_retard} trajet(s) en retard : au-delà de 2 h de retard constaté à l'arrivée, un remboursement partiel est dû au client.`);
  }
  if (donnees.litiges > 0) {
    points.push(`${donnees.litiges} litige(s) sur la période. Une réponse sous 48 h évite l'escalade automatique.`);
  }
  if (note !== null && note !== undefined && note < 3.5) {
    points.push(`Note moyenne de ${note}/5 : en dessous de 3,5, votre visibilité dans les résultats de recherche se dégrade.`);
  }
  if (points.length === 0) {
    points.push('Aucun point d\'attention sur cette période. Trajets honorés, pas de litige ouvert.');
  }
  for (const p of points) {
    doc.fillColor(NOIR).fontSize(9).font('Helvetica')
       .text('•  ' + p, MARGE, doc.y, { width: doc.page.width - MARGE * 2, align: 'justify' });
    doc.moveDown(0.4);
  }

  piedsDePage(doc);
  return doc;
}

// ═══════════════════════════════════════════════════
// RAPPORT JEGO GLOBAL — PDF (admin)
// ═══════════════════════════════════════════════════
function genererPdfRapportJego(donnees) {
  const doc = new PDFDocument({ size: 'A4', margin: MARGE, bufferPages: true });

  const periode = `${dateFr(donnees.periode.debut)} — ${dateFr(donnees.periode.fin)}`;
  enTete(doc, 'Rapport global', 'Direction JEGO');

  doc.fillColor(GRIS).fontSize(9).font('Helvetica')
     .text(`Période analysée : ${periode}  (${donnees.periode.jours} jours)`, MARGE, doc.y);
  doc.fillColor(GRIS).fontSize(8)
     .text(`Comparée à : ${dateFr(donnees.periode_comparee.debut)} — ${dateFr(donnees.periode_comparee.fin)}`,
           MARGE, doc.y + 2);
  doc.moveDown(1.2);

  // ── Finances
  section(doc, 'Finances');
  const f = donnees.finances;
  const evoB = f.evolution_vs_periode_precedente.billets_pourcent;
  const evoM = f.evolution_vs_periode_precedente.marge_nette_pourcent;

  cartouches(doc, [
    { label: 'Billets vendus',   valeur: nombre(f.nombre_billets) },
    { label: 'CA total',         valeur: fcfa(f.chiffre_affaires_total) },
    { label: 'Marge nette JEGO', valeur: fcfa(f.marge_nette),
      accent: f.marge_nette >= 0 ? VERT : ROUGE },
    { label: 'Coût fidélité',    valeur: fcfa(Math.abs(f.cout_programme_fidelite)) },
  ]);

  const evolution = [];
  if (evoB !== null) evolution.push(`Billets : ${evoB >= 0 ? '+' : ''}${evoB}\u00A0%`);
  if (evoM !== null) evolution.push(`Marge nette : ${evoM >= 0 ? '+' : ''}${evoM}\u00A0%`);
  if (evolution.length > 0) {
    doc.fillColor(GRIS).fontSize(9).font('Helvetica')
       .text('Évolution vs période précédente — ' + evolution.join('   ·   '), MARGE, doc.y);
    doc.moveDown(0.6);
  }

  // ── Réseau
  section(doc, 'Réseau d\'agences');
  cartouches(doc, [
    { label: 'Agences actives',  valeur: nombre(donnees.agences.actives) },
    { label: 'En attente',       valeur: nombre(donnees.agences.en_attente),
      accent: donnees.agences.en_attente > 0 ? '#B45309' : VERT },
    { label: 'Nouvelles',        valeur: nombre(donnees.agences.nouvelles_periode) },
  ]);

  // ── Litiges
  section(doc, 'Litiges');
  cartouches(doc, [
    { label: 'Ouverts actuellement', valeur: nombre(donnees.litiges.ouverts_actuellement),
      accent: donnees.litiges.ouverts_actuellement > 0 ? ROUGE : VERT },
    { label: 'Résolus sur la période', valeur: nombre(donnees.litiges.resolus_periode) },
  ]);

  // ── Classement
  section(doc, 'Agences par rentabilité');
  const classement = (donnees.classement_agences_par_rentabilite || []).map((a, i) => ({
    rang: `${i + 1}`,
    agence: a.agence,
    billets: nombre(a.nombre_billets),
    marge: fcfa(a.marge_generee_jego),
    _marge: a.marge_generee_jego
  }));
  tableau(doc, [
    { titre: '#',              cle: 'rang',    largeur: 0.5, align: 'center' },
    { titre: 'Agence',         cle: 'agence',  largeur: 3.5, gras: true },
    { titre: 'Billets',        cle: 'billets', largeur: 1.2, align: 'right' },
    { titre: 'Marge générée',  cle: 'marge',   largeur: 2,   align: 'right',
      couleur: (l) => (l._marge >= 0 ? VERT : ROUGE) },
  ], classement, { vide: 'Aucune agence active sur cette période' });

  piedsDePage(doc);
  return doc;
}

module.exports = { genererPdfRapportAgence, genererPdfRapportJego };
