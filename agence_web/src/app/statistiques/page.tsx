'use client';

// BRANCHÉ SUR LE VRAI BACKEND — GET /api/rapports/agence-detaille?periode=semaine|mois|annee&annee=YYYY
// "actions" (recommandations texte) reste vide côté backend : seuils
// métier non validés. Les catégories "Incidents"/"Contestations" du
// design original n'ont pas de donnée réelle correspondante dans le
// schéma — remplacées par les deux seules mesures réelles disponibles :
// litiges non résolus, litiges résolus sur 30 jours.
// Les périodes sont des fenêtres glissantes (7/30 derniers jours, 12
// derniers mois), pas des périodes calendaires closes — le texte reflète
// ça plutôt que de prétendre "mois précédent".

import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import LayoutAgence from '../components/LayoutAgence';
import { apiFetch } from '../lib/api';

type Periode = 'semaine' | 'mois' | 'annee';
type Serie = { label: string; valeur: number };

type RapportComplet = {
  periode: { debut: string; fin: string; type: Periode; debutComparaison: string; finComparaison: string };
  ventes: { nombre_billets: number; chiffre_affaires_client: number; montant_recu_escrow: number };
  trajets: { total: number; effectues: number; annules: number; en_retard: number };
  satisfaction: { note_moyenne: number | null; nombre_avis: number };
  litiges: number;
  comparaison: { chiffre_affaires_client: number; nombre_billets: number };
  serieCA: Serie[];
  comparaisonCA: Serie[];
  topDestinations: { route: string; reservations: number }[];
  repartitionStatuts: { statut: string; nombre: number }[];
  qualite: { service: number | null; conduite: number | null; horaires: number | null; confort: number | null };
  remplissage: { taux_pourcent: number; sieges_total: number; sieges_vendus: number };
  remplissageSerie: Serie[];
  retardsSerie: Serie[];
  indicateursQualite: {
    retardMoyen: { valeur: number; delta: number };
    tauxPonctualite: { valeur: number; delta: number };
    tauxReclamation: { valeur: number; delta: number };
    tempsResolution: { valeur: number; delta: number };
  };
  litigesResume: { nonResolus: number; resolus30j: number };
  litigesDetail: { numero: string; motif: string; statut: string; cree_le: string }[];
  actions: string[];
};

const LIBELLES_PERIODE: Record<Periode, string> = {
  semaine: 'Rapport hebdomadaire',
  mois: 'Rapport mensuel',
  annee: 'Rapport annuel',
};

const FENETRE_PERIODE: Record<Periode, string> = {
  semaine: '7 derniers jours',
  mois: '30 derniers jours',
  annee: '12 derniers mois',
};

const LIBELLE_STATUT_BILLET: Record<string, string> = {
  confirme: 'Confirmés', utilise: 'Utilisés', annule: 'Annulés', expire: 'Expirés',
};
const COULEUR_STATUT_BILLET: Record<string, [number, number, number]> = {
  confirme: [11, 158, 99], utilise: [20, 32, 26], annule: [217, 83, 79], expire: [230, 184, 76],
};

function formatDateFr(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatFcfa(valeur: number) {
  return `${valeur.toLocaleString('fr-FR')} FCFA`;
}

export default function Statistiques() {
  const [periode, setPeriode] = useState<Periode>('mois');
  const [anneeChoisie, setAnneeChoisie] = useState(new Date().getFullYear() - 1);
  const [donnees, setDonnees] = useState<RapportComplet | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [telechargement, setTelechargement] = useState<Periode | null>(null);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    const params = periode === 'annee' ? `periode=annee&annee=${anneeChoisie}` : `periode=${periode}`;
    apiFetch(`/api/rapports/agence-detaille?${params}`)
      .then((d) => { if (!annule) { setDonnees(d); setErreur(null); } })
      .catch((e) => { if (!annule) setErreur(e instanceof Error ? e.message : 'Impossible de charger les statistiques.'); })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [periode, anneeChoisie]);

  const maxCA = useMemo(() => Math.max(1, ...(donnees?.serieCA.map((d) => d.valeur) ?? [1])), [donnees]);
  const maxDest = useMemo(() => Math.max(1, ...(donnees?.topDestinations.map((d) => d.reservations) ?? [1])), [donnees]);

  const variation = useMemo(() => {
    if (!donnees || donnees.comparaison.chiffre_affaires_client === 0) return 0;
    return Math.round(((donnees.ventes.chiffre_affaires_client - donnees.comparaison.chiffre_affaires_client) / donnees.comparaison.chiffre_affaires_client) * 1000) / 10;
  }, [donnees]);

  const cartes = useMemo(() => {
    if (!donnees) return [];
    return [
      { titre: "Chiffre d'affaires", valeur: formatFcfa(donnees.ventes.chiffre_affaires_client), fond: 'bg-gradient-to-br from-ink to-green-700 text-white', second: 'text-white/70' },
      { titre: 'Réservations', valeur: `${donnees.ventes.nombre_billets}`, fond: 'bg-paper border border-line', second: 'text-ink-soft' },
      { titre: 'Taux de remplissage', valeur: `${donnees.remplissage.taux_pourcent}%`, fond: 'bg-paper border border-line', second: 'text-ink-soft' },
      { titre: 'Note moyenne', valeur: donnees.satisfaction.note_moyenne ? `⭐ ${donnees.satisfaction.note_moyenne.toFixed(1)}` : 'Aucun avis', fond: 'bg-paper border border-line', second: 'text-ink-soft' },
    ];
  }, [donnees]);

  async function genererPdf(periodePdf: Periode, anneeSurcharge?: number) {
    setTelechargement(periodePdf);
    try {
      const params = periodePdf === 'annee'
        ? `periode=annee&annee=${anneeSurcharge ?? anneeChoisie}`
        : `periode=${periodePdf}`;
      const data: RapportComplet = await apiFetch(`/api/rapports/agence-detaille?${params}`);

      const titre = LIBELLES_PERIODE[periodePdf];
      const sousTitre = `${FENETRE_PERIODE[periodePdf]} · du ${formatDateFr(data.periode.debut)} au ${formatDateFr(data.periode.fin)}`;
      const comparaisonLabel = `du ${formatDateFr(data.periode.debutComparaison)} au ${formatDateFr(data.periode.finComparaison)}`;
      const fichier = `rapport_jego_${periodePdf}_${data.periode.fin}`;

      const variationPdf = data.comparaison.chiffre_affaires_client > 0
        ? Math.round(((data.ventes.chiffre_affaires_client - data.comparaison.chiffre_affaires_client) / data.comparaison.chiffre_affaires_client) * 1000) / 10
        : 0;

      const totalStatuts = data.repartitionStatuts.reduce((s, x) => s + x.nombre, 0) || 1;
      const repartitionAffichage = data.repartitionStatuts.map((s) => ({
        label: LIBELLE_STATUT_BILLET[s.statut] ?? s.statut,
        valeur: Math.round((s.nombre / totalStatuts) * 100),
        couleur: (COULEUR_STATUT_BILLET[s.statut] ?? [100, 116, 108]) as [number, number, number],
      }));

      const q = data.indicateursQualite;
      const signe = (n: number) => (n >= 0 ? '+' : '');
      const indicateursLignes: [string, string, string][] = [
        ['Retard moyen', `${q.retardMoyen.valeur} min`, `${signe(q.retardMoyen.delta)}${q.retardMoyen.delta} min`],
        ['Taux de réclamation', `${q.tauxReclamation.valeur}%`, `${signe(q.tauxReclamation.delta)}${q.tauxReclamation.delta} pt`],
        ['Taux de ponctualité', `${q.tauxPonctualite.valeur}%`, `${signe(q.tauxPonctualite.delta)}${q.tauxPonctualite.delta} pt`],
        ['Temps de résolution', `${q.tempsResolution.valeur} j`, `${signe(q.tempsResolution.delta)}${q.tempsResolution.delta} j`],
      ];

      const litigesLignes: [string, string, string, string][] = [
        ['Litiges non résolus', String(data.litigesResume.nonResolus), '', 'Total actuellement ouvert, toutes périodes confondues'],
        ['Litiges résolus (30 j)', String(data.litigesResume.resolus30j), '', 'Fenêtre glissante des 30 derniers jours'],
      ];

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marge = 16;
      const largeurUtile = pageW - marge * 2;
      const dateGeneration = new Date();
      const referenceRapport = `RPT-${dateGeneration.toISOString().slice(0, 10).replaceAll('-', '')}-${periodePdf.toUpperCase()}`;

      function filigrane() {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(238, 245, 241);
        for (let y = 34; y < pageH - 10; y += 42) {
          for (let x = -5; x < pageW; x += 62) doc.text('JEGO', x, y, { angle: 28 });
        }
      }

      function entete(t: string, st: string, numeroPage: number) {
        filigrane();
        doc.setFillColor(20, 32, 26);
        doc.roundedRect(marge, 12, largeurUtile, 22, 4, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('JEGO', marge + 6, 22);
        doc.setFontSize(10);
        doc.text(t, marge + 34, 20.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(st, marge + 34, 26);
        doc.text(`Page ${numeroPage}`, pageW - marge - 6, 22, { align: 'right' });
        doc.setTextColor(100, 116, 108);
        doc.setFontSize(7);
        doc.text(`${referenceRapport} · Genere le ${dateGeneration.toLocaleDateString('fr-FR')} a ${dateGeneration.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, marge, pageH - 8);
      }

      function titreSection(texte: string, y: number) {
        doc.setTextColor(20, 32, 26);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(texte, marge, y);
        doc.setDrawColor(11, 158, 99);
        doc.setLineWidth(0.8);
        doc.line(marge, y + 2.2, marge + 28, y + 2.2);
      }

      function carteKpi(x: number, y: number, w: number, t: string, valeur: string, evolution: string, favorable = true) {
        doc.setFillColor(250, 252, 250);
        doc.setDrawColor(226, 233, 228);
        doc.roundedRect(x, y, w, 26, 3, 3, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 108);
        doc.text(t, x + 4, y + 7);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(20, 32, 26);
        doc.text(valeur, x + 4, y + 17);
        doc.setFontSize(7.5);
        const c: [number, number, number] = favorable ? [11, 158, 99] : [217, 83, 79];
        doc.setTextColor(c[0], c[1], c[2]);
        doc.text(evolution, x + w - 4, y + 17, { align: 'right' });
      }

      function graphiqueBarres(x: number, y: number, w: number, h: number, don: Serie[], t: string, formatValeur: (n: number) => string) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 233, 228);
        doc.roundedRect(x, y, w, h, 3, 3, 'FD');
        doc.setTextColor(20, 32, 26);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(t, x + 5, y + 8);
        const zoneX = x + 10;
        const zoneY = y + 15;
        const zoneW = w - 16;
        const zoneH = h - 25;
        const max = Math.max(...don.map((d) => d.valeur), 1);
        const largeurBarre = (zoneW / don.length) * 0.58;
        doc.setDrawColor(232, 237, 234);
        for (let i = 0; i <= 4; i++) {
          const gy = zoneY + (zoneH * i) / 4;
          doc.line(zoneX, gy, zoneX + zoneW, gy);
        }
        don.forEach((d, index) => {
          const hauteurBarre = Math.max(0, (d.valeur / max) * (zoneH - 5));
          const bx = zoneX + (zoneW / don.length) * index + (zoneW / don.length - largeurBarre) / 2;
          const by = zoneY + zoneH - hauteurBarre;
          doc.setFillColor(11, 158, 99);
          doc.roundedRect(bx, by, largeurBarre, hauteurBarre, 1, 1, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(don.length > 15 ? 4.6 : 6.2);
          doc.setTextColor(100, 116, 108);
          if (don.length <= 15 || index % 3 === 0) {
            doc.text(d.label, bx + largeurBarre / 2, zoneY + zoneH + 4, { align: 'center' });
          }
          doc.setFontSize(5.8);
          if (d.valeur > 0 && don.length <= 15) {
            doc.text(formatValeur(d.valeur), bx + largeurBarre / 2, Math.max(zoneY + 4, by - 1.5), { align: 'center' });
          }
        });
      }

      function graphiqueCourbe(x: number, y: number, w: number, h: number, don: Serie[], t: string, suffixe: string, couleur: [number, number, number]) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 233, 228);
        doc.roundedRect(x, y, w, h, 3, 3, 'FD');
        doc.setTextColor(20, 32, 26);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(t, x + 5, y + 8);
        const zoneX = x + 10;
        const zoneY = y + 16;
        const zoneW = w - 17;
        const zoneH = h - 27;
        const values = don.map((item) => item.valeur);
        const min = Math.min(...values, 0);
        const max = Math.max(...values, 1);
        const amplitude = Math.max(max - min, 1);
        doc.setDrawColor(232, 237, 234);
        for (let i = 0; i <= 4; i++) doc.line(zoneX, zoneY + (zoneH * i) / 4, zoneX + zoneW, zoneY + (zoneH * i) / 4);
        const points = don.map((item, index) => ({
          x: zoneX + (zoneW * index) / Math.max(don.length - 1, 1),
          y: zoneY + zoneH - ((item.valeur - min) / amplitude) * (zoneH - 6),
        }));
        doc.setDrawColor(...couleur);
        doc.setLineWidth(1.3);
        points.forEach((point, index) => {
          if (index === 0) return;
          const precedent = points[index - 1];
          doc.line(precedent.x, precedent.y, point.x, point.y);
        });
        points.forEach((point, index) => {
          if (don.length > 15 && index % 3 !== 0) return;
          doc.setFillColor(255, 255, 255);
          doc.circle(point.x, point.y, 1.7, 'FD');
          doc.setDrawColor(...couleur);
          doc.circle(point.x, point.y, 1.7);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(don.length > 15 ? 4.6 : 6);
          doc.setTextColor(100, 116, 108);
          doc.text(don[index].label, point.x, zoneY + zoneH + 4, { align: 'center' });
          if (don.length <= 15) {
            doc.text(`${don[index].valeur}${suffixe}`, point.x, Math.max(zoneY + 4, point.y - 3.5), { align: 'center' });
          }
        });
      }

      function graphiqueStatuts(x: number, y: number, w: number, h: number) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 233, 228);
        doc.roundedRect(x, y, w, h, 3, 3, 'FD');
        doc.setTextColor(20, 32, 26);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Repartition des statuts', x + 5, y + 8);
        if (repartitionAffichage.length === 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 108);
          doc.text('Aucun billet sur cette période.', x + 7, y + 22);
          return;
        }
        let courant = x + 7;
        const largeurBarre = w - 14;
        repartitionAffichage.forEach((item) => {
          const largeur = (item.valeur / 100) * largeurBarre;
          doc.setFillColor(...item.couleur);
          doc.roundedRect(courant, y + 17, largeur, 10, 1.5, 1.5, 'F');
          courant += largeur;
        });
        repartitionAffichage.forEach((item, index) => {
          const ligneY = y + 35 + index * 5.5;
          doc.setFillColor(...item.couleur);
          doc.circle(x + 9, ligneY - 1.3, 1.3, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(82, 98, 90);
          doc.text(`${item.label} · ${item.valeur}%`, x + 13, ligneY);
        });
      }

      function graphiqueHorizontal(x: number, y: number, w: number, h: number) {
        const don = data.topDestinations;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 233, 228);
        doc.roundedRect(x, y, w, h, 3, 3, 'FD');
        doc.setTextColor(20, 32, 26);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Top destinations', x + 5, y + 8);
        if (don.length === 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 108);
          doc.text('Aucune réservation sur cette période.', x + 7, y + 22);
          return;
        }
        const max = Math.max(...don.map((d) => d.reservations), 1);
        don.forEach((item, index) => {
          const ligneY = y + 18 + index * 11.5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(82, 98, 90);
          doc.text(item.route, x + 5, ligneY);
          doc.setFillColor(241, 244, 241);
          doc.roundedRect(x + 60, ligneY - 4, w - 78, 5, 1.5, 1.5, 'F');
          doc.setFillColor(11, 158, 99);
          doc.roundedRect(x + 60, ligneY - 4, ((w - 78) * item.reservations) / max, 5, 1.5, 1.5, 'F');
          doc.text(String(item.reservations), x + w - 5, ligneY, { align: 'right' });
        });
      }

      function tableau(x: number, y: number, largeurs: number[], headers: string[], rows: string[][], hauteurLigne = 8) {
        let courantX = x;
        doc.setFillColor(248, 250, 248);
        doc.setDrawColor(226, 233, 228);
        largeurs.forEach((largeur) => {
          doc.rect(courantX, y, largeur, hauteurLigne, 'FD');
          courantX += largeur;
        });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(20, 32, 26);
        let texteX = x;
        headers.forEach((header, index) => {
          doc.text(header, texteX + 2, y + 5.2);
          texteX += largeurs[index];
        });
        rows.forEach((row, rowIndex) => {
          const rowY = y + hauteurLigne + rowIndex * hauteurLigne;
          let cellX = x;
          largeurs.forEach((largeur) => {
            doc.rect(cellX, rowY, largeur, hauteurLigne);
            cellX += largeur;
          });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.6);
          doc.setTextColor(82, 98, 90);
          let texteCellX = x;
          row.forEach((cellule, index) => {
            doc.text(cellule, texteCellX + 2, rowY + 5.2, { maxWidth: largeurs[index] - 4 });
            texteCellX += largeurs[index];
          });
        });
      }

      // Page 1
      entete(titre, sousTitre, 1);
      titreSection('1. Synthese executive', 45);
      const kpiLargeur = (largeurUtile - 10) / 2;
      carteKpi(marge, 53, kpiLargeur, "Chiffre d'affaires", formatFcfa(data.ventes.chiffre_affaires_client), `${variationPdf >= 0 ? '+' : ''}${variationPdf}% vs période comparée`, variationPdf >= 0);
      carteKpi(marge + kpiLargeur + 10, 53, kpiLargeur, 'Reservations', String(data.ventes.nombre_billets), `comparaison : ${data.comparaison.nombre_billets}`, data.ventes.nombre_billets >= data.comparaison.nombre_billets);
      carteKpi(marge, 84, kpiLargeur, 'Taux de remplissage', `${data.remplissage.taux_pourcent}%`, `${data.remplissage.sieges_vendus}/${data.remplissage.sieges_total} sièges`);
      carteKpi(marge + kpiLargeur + 10, 84, kpiLargeur, 'Note moyenne', data.satisfaction.note_moyenne ? `⭐ ${data.satisfaction.note_moyenne.toFixed(1)}` : 'Aucun avis', `${data.satisfaction.nombre_avis} avis`);

      titreSection('Contexte du rapport', 122);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(82, 98, 90);
      const lignesContexte = [
        `Ce rapport couvre les ${FENETRE_PERIODE[periodePdf]} : du ${formatDateFr(data.periode.debut)} au ${formatDateFr(data.periode.fin)}.`,
        `Comparaison effectuee avec la periode precedente equivalente : ${comparaisonLabel}.`,
        `Toutes les valeurs de ce rapport sont calculees en direct depuis les donnees reelles de l'agence.`,
        `Les litiges affiches restent classes par anciennete ; "resolus (30 j)" utilise une fenetre glissante independante de la periode du rapport.`,
      ];
      lignesContexte.forEach((ligne, index) => doc.text(`• ${ligne}`, marge, 131 + index * 7));

      titreSection('Actions recommandées', 168);
      if (data.actions.length === 0) {
        doc.setFillColor(250, 252, 250);
        doc.setDrawColor(226, 233, 228);
        doc.roundedRect(marge, 177, largeurUtile, 10, 2, 2, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 108);
        doc.text('Aucune action automatique suggérée pour l\'instant.', marge + 3, 183.3);
      } else {
        data.actions.forEach((texte, index) => {
          const y = 177 + index * 14;
          doc.setFillColor(250, 252, 250);
          doc.setDrawColor(226, 233, 228);
          doc.roundedRect(marge, y, largeurUtile, 10, 2, 2, 'FD');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(82, 98, 90);
          doc.text(texte, marge + 3, y + 6.3, { maxWidth: largeurUtile - 6 });
        });
      }

      // Page 2
      doc.addPage();
      entete(titre, 'Performance financiere de la periode', 2);
      titreSection('2. Chiffre d’affaires par sous-periode', 45);
      graphiqueBarres(marge, 53, largeurUtile, 73, data.serieCA, 'Chiffre d’affaires de la periode', (n) => `${Math.round(n / 1000)}k`);
      graphiqueCourbe(marge, 132, largeurUtile, 65, data.comparaisonCA, `Reference de comparaison · ${comparaisonLabel}`, 'k', [20, 32, 26]);
      titreSection('Detail et comparaison', 207);
      const detailLignes = data.serieCA.map((item, index) => {
        const precedent = data.comparaisonCA[index]?.valeur ?? 0;
        const taux = precedent ? ((item.valeur - precedent) / precedent) * 100 : 0;
        return [item.label, `${item.valeur.toLocaleString('fr-FR')} FCFA`, `${precedent.toLocaleString('fr-FR')} FCFA`, `${taux >= 0 ? '+' : ''}${taux.toFixed(1)}%`];
      }).slice(0, 12);
      tableau(marge, 214, [31, 55, 55, 38], ['Periode', 'Courant', 'Comparaison', 'Evolution'], detailLignes, 8);

      // Page 3
      doc.addPage();
      entete(titre, 'Exploitation, retards et qualite', 3);
      titreSection('3. Performance operationnelle', 45);
      graphiqueCourbe(marge, 53, 87, 67, data.remplissageSerie, 'Taux de remplissage', '%', [11, 158, 99]);
      graphiqueCourbe(marge + 92, 53, 87, 67, data.retardsSerie, 'Retard moyen', ' min', [217, 83, 79]);
      graphiqueStatuts(marge, 126, largeurUtile, 58);
      titreSection('Indicateurs qualite', 196);
      tableau(marge, 203, [68, 48, 63], ['Indicateur', 'Valeur', 'Evolution'], indicateursLignes, 9);
      doc.setFillColor(248, 250, 248);
      doc.setDrawColor(226, 233, 228);
      doc.roundedRect(marge, 267, largeurUtile, 15, 3, 3, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(82, 98, 90);
      doc.text('Lecture : evolution comparee a la periode precedente equivalente de meme duree.', marge + 4, 276);

      // Page 4
      doc.addPage();
      entete(titre, 'Destinations, incidents et litiges', 4);
      titreSection('4. Destinations et experience client', 45);
      graphiqueHorizontal(marge, 53, largeurUtile, 78);
      titreSection('Litiges', 143);
      tableau(marge, 150, [46, 30, 36, 67], ['Categorie', 'Volume', '', 'Commentaire'], litigesLignes, 10);

      doc.save(`${fichier}.pdf`);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Impossible de générer le PDF.');
    } finally {
      window.setTimeout(() => setTelechargement(null), 1500);
    }
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-ink mb-1">Statistiques</h1>
        <p className="text-[13px] text-ink-soft mb-4">Vue d&apos;ensemble de ton activité.</p>

        <div className="flex items-center gap-2 mb-6">
          {(['semaine', 'mois', 'annee'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              className={`rounded-full px-4 py-1.5 text-[12px] font-bold transition-colors ${periode === p ? 'bg-ink text-white' : 'bg-off-white text-ink-soft border border-line'}`}
            >
              {LIBELLES_PERIODE[p].replace('Rapport ', '')}
            </button>
          ))}
          <span className="text-[11px] text-ink-soft ml-2">{donnees ? FENETRE_PERIODE[periode] : ''}</span>
        </div>

        {erreur && <div className="rounded-2xl p-3 mb-6 bg-red/6 border border-red/20"><p className="text-xs text-red">{erreur}</p></div>}

        {chargement || !donnees ? (
          <div className="text-center text-sm text-ink-soft py-16">Chargement…</div>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              {cartes.map((carte) => (
                <div key={carte.titre} className={`${carte.fond} rounded-2xl p-6`}>
                  <p className={`text-xs mb-1 ${carte.second}`}>{carte.titre}</p>
                  <p className={`text-2xl font-extrabold ${carte.fond.includes('text-white') ? 'text-white' : 'text-ink'}`}>{carte.valeur}</p>
                </div>
              ))}
            </div>

            <div className="bg-paper rounded-2xl border border-line p-5 mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-ink-soft mb-1">Variation vs période comparée</p>
                <p className="text-[22px] font-extrabold text-ink">{variation >= 0 ? '+' : ''}{variation}%</p>
              </div>
              <div className="text-[13px] text-ink-soft">
                Période actuelle : <strong className="text-ink">{formatFcfa(donnees.ventes.chiffre_affaires_client)}</strong> ·
                comparaison : <strong className="text-ink">{formatFcfa(donnees.comparaison.chiffre_affaires_client)}</strong>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-paper rounded-2xl border border-line p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-ink-soft">Évolution du chiffre d&apos;affaires</p>
                  <span className="text-[10px] text-ink-soft whitespace-nowrap">{formatDateFr(donnees.periode.debut)} → {formatDateFr(donnees.periode.fin)}</span>
                </div>
                <div className="flex items-end justify-between gap-1 h-36">
                  {donnees.serieCA.map((d, i) => (
                    <div key={i} className="flex-1 h-full flex flex-col items-center gap-2">
                      <div className="w-full flex-1 flex items-end">
                        <div className="w-full rounded-t-md bg-gradient-to-t from-green-700 to-green-500" style={{ height: `${(d.valeur / maxCA) * 100}%` }} />
                      </div>
                      {donnees.serieCA.length <= 12 && <p className="text-[9px] text-ink-soft">{d.label}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-paper rounded-2xl border border-line p-6">
                <p className="text-xs font-bold text-ink-soft mb-4">Top destinations</p>
                {donnees.topDestinations.length === 0 ? (
                  <p className="text-xs text-ink-soft">Aucune réservation sur cette période.</p>
                ) : (
                  <div className="space-y-3">
                    {donnees.topDestinations.map((d) => (
                      <div key={d.route}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-ink">{d.route}</span>
                          <span className="text-ink-soft">{d.reservations}</span>
                        </div>
                        <div className="h-2 rounded-full bg-off-white overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-green-700 to-green-500" style={{ width: `${(d.reservations / maxDest) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-paper rounded-2xl border border-line p-6">
              <p className="text-sm font-bold text-ink mb-1">Télécharger un rapport (PDF)</p>
              <p className="text-xs text-ink-soft mb-4">Rapport détaillé de 4 pages, sur la fenêtre choisie.</p>
              <div className="flex flex-wrap items-center gap-3">
                {([
                  { valeur: 'semaine', label: 'Hebdomadaire' },
                  { valeur: 'mois', label: 'Mensuel' },
                ] as const).map((p) => (
                  <button
                    key={p.valeur}
                    onClick={() => genererPdf(p.valeur)}
                    className="flex items-center gap-2 rounded-xl bg-green-700/10 hover:bg-green-700/20 text-green-700 font-bold text-sm px-4 py-2.5 transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {telechargement === p.valeur ? 'Généré !' : p.label}
                  </button>
                ))}

                <div className="flex items-center gap-1.5 rounded-xl bg-off-white border border-line pl-3 pr-1.5 py-1.5">
                  <span className="text-[11px] font-bold text-ink-soft">Annuel</span>
                  <select
                    value={anneeChoisie}
                    onChange={(e) => setAnneeChoisie(Number(e.target.value))}
                    className="text-[12px] font-bold text-ink bg-transparent rounded-lg px-1.5 py-1 w-[72px]"
                  >
                    {Array.from({ length: 12 }, (_, i) => anneeChoisie + 2 - i).map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => genererPdf('annee', anneeChoisie)}
                    className="flex items-center gap-1.5 rounded-lg bg-green-700 hover:bg-green-900 text-white font-bold text-[11px] px-3 py-2 transition-colors"
                  >
                    {telechargement === 'annee' ? 'Généré !' : 'Télécharger'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </LayoutAgence>
  );
}
