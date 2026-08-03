'use client';

import { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import LayoutAgence from '../components/LayoutAgence';

type Periode = 'semaine' | 'mois' | 'annee';
type Serie = { label: string; valeur: number };

type RapportDonnees = {
  titre: string;
  sousTitre: string;
  fichier: string;
  comparaisonLabel: string;
  chiffreAffaires: number;
  reservations: number;
  tauxRemplissage: number;
  noteMoyenne: number;
  variation: number;
  evolutionCA: Serie[];
  comparaisonCA: Serie[];
  remplissage: Serie[];
  retards: Serie[];
  topDestinations: { route: string; reservations: number }[];
  repartitionStatuts: { label: string; valeur: number; couleur: [number, number, number] }[];
  incidentsLitiges: [string, string, string, string][];
  indicateursQualite: [string, string, string][];
  actions: [string, string][];
};

const RAPPORTS: Record<Periode, RapportDonnees> = {
  semaine: {
    titre: 'Rapport hebdomadaire',
    sousTitre: 'Semaine precedente · du 20/07/2026 au 26/07/2026',
    fichier: 'rapport_jego_hebdo_semaine_precedente',
    comparaisonLabel: 'Semaine du 13/07/2026 au 19/07/2026',
    chiffreAffaires: 1124000,
    reservations: 148,
    tauxRemplissage: 81,
    noteMoyenne: 4.7,
    variation: 9,
    evolutionCA: [
      { label: 'Lun', valeur: 134000 }, { label: 'Mar', valeur: 151000 }, { label: 'Mer', valeur: 147000 },
      { label: 'Jeu', valeur: 158000 }, { label: 'Ven', valeur: 166000 }, { label: 'Sam', valeur: 201000 }, { label: 'Dim', valeur: 167000 },
    ],
    comparaisonCA: [
      { label: 'Lun', valeur: 119000 }, { label: 'Mar', valeur: 143000 }, { label: 'Mer', valeur: 139000 },
      { label: 'Jeu', valeur: 149000 }, { label: 'Ven', valeur: 157000 }, { label: 'Sam', valeur: 184000 }, { label: 'Dim', valeur: 143000 },
    ],
    remplissage: [
      { label: 'Lun', valeur: 74 }, { label: 'Mar', valeur: 78 }, { label: 'Mer', valeur: 76 },
      { label: 'Jeu', valeur: 80 }, { label: 'Ven', valeur: 82 }, { label: 'Sam', valeur: 88 }, { label: 'Dim', valeur: 84 },
    ],
    retards: [
      { label: 'Lun', valeur: 16 }, { label: 'Mar', valeur: 13 }, { label: 'Mer', valeur: 15 },
      { label: 'Jeu', valeur: 14 }, { label: 'Ven', valeur: 11 }, { label: 'Sam', valeur: 9 }, { label: 'Dim', valeur: 10 },
    ],
    topDestinations: [
      { route: 'Douala → Yaounde', reservations: 52 },
      { route: 'Yaounde → Douala', reservations: 33 },
      { route: 'Douala → Bafoussam', reservations: 24 },
      { route: 'Douala → Kribi', reservations: 21 },
      { route: 'Yaounde → Garoua', reservations: 18 },
    ],
    repartitionStatuts: [
      { label: 'Termines', valeur: 71, couleur: [11, 158, 99] },
      { label: 'Programmes', valeur: 14, couleur: [20, 32, 26] },
      { label: 'En retard', valeur: 10, couleur: [230, 184, 76] },
      { label: 'Annules', valeur: 5, couleur: [217, 83, 79] },
    ],
    incidentsLitiges: [
      ['Incidents ouverts', '4', '-20%', 'Semaine precedente uniquement, majoritairement retards.'],
      ['Incidents resolus', '12', '+9%', 'Clotures sur la meme semaine precedente.'],
      ['Litiges non resolus', '3', '-1', 'Classement par anciennete conserve.'],
      ['Litiges resolus / 30 j', '18', '+2', 'Affichage recent non melange au rapport hebdo.'],
      ['Contestations', '1', 'Stable', 'Une seule contestation possible par decision defavorable.'],
    ],
    indicateursQualite: [
      ['Retard moyen', '12 min', '-3 min'],
      ['Taux de reclamation', '1,5%', '-0,2 pt'],
      ['Taux de ponctualite', '89%', '+4 pt'],
      ['Temps de resolution', '2,4 j', '-0,4 j'],
    ],
    actions: [
      ['Sous 24 h', 'Suivre en direct les trajets depassant 10 minutes de retard.'],
      ['Sous 48 h', 'Traiter les 3 litiges non resolus du plus ancien au plus recent.'],
      ['Cette semaine', 'Documenter chaque incident avec date, heure et numero de voyage.'],
      ['Maintenant', 'Conserver la dynamique de ponctualite sur Douala → Yaounde.'],
    ],
  },
  mois: {
    titre: 'Rapport mensuel',
    sousTitre: 'Mois precedent · juin 2026',
    fichier: 'rapport_jego_mensuel_mois_precedent',
    comparaisonLabel: 'Mai 2026',
    chiffreAffaires: 4628000,
    reservations: 638,
    tauxRemplissage: 79,
    noteMoyenne: 4.6,
    variation: 7,
    evolutionCA: [
      { label: 'S1', valeur: 1082000 }, { label: 'S2', valeur: 1126000 }, { label: 'S3', valeur: 1165000 }, { label: 'S4', valeur: 1255000 },
    ],
    comparaisonCA: [
      { label: 'S1', valeur: 1014000 }, { label: 'S2', valeur: 1041000 }, { label: 'S3', valeur: 1088000 }, { label: 'S4', valeur: 1113000 },
    ],
    remplissage: [
      { label: 'S1', valeur: 74 }, { label: 'S2', valeur: 77 }, { label: 'S3', valeur: 80 }, { label: 'S4', valeur: 84 },
    ],
    retards: [
      { label: 'S1', valeur: 18 }, { label: 'S2', valeur: 16 }, { label: 'S3', valeur: 14 }, { label: 'S4', valeur: 12 },
    ],
    topDestinations: [
      { route: 'Douala → Yaounde', reservations: 211 },
      { route: 'Yaounde → Douala', reservations: 154 },
      { route: 'Douala → Bafoussam', reservations: 109 },
      { route: 'Douala → Kribi', reservations: 97 },
      { route: 'Yaounde → Garoua', reservations: 67 },
    ],
    repartitionStatuts: [
      { label: 'Termines', valeur: 69, couleur: [11, 158, 99] },
      { label: 'Programmes', valeur: 17, couleur: [20, 32, 26] },
      { label: 'En retard', valeur: 9, couleur: [230, 184, 76] },
      { label: 'Annules', valeur: 5, couleur: [217, 83, 79] },
    ],
    incidentsLitiges: [
      ['Incidents ouverts', '11', '-18%', 'Uniquement sur juin 2026.'],
      ['Incidents resolus', '37', '+11%', 'Aucune donnee hebdo melangee.'],
      ['Litiges non resolus', '3', 'Stable', 'Toujours ordonnes par anciennete.'],
      ['Litiges resolus / 30 j', '18', '+4', 'Uniquement fenetre glissante recente.'],
      ['Contestations', '2', '+1', 'Seulement pour les decisions defavorables.'],
    ],
    indicateursQualite: [
      ['Retard moyen', '15 min', '-2 min'],
      ['Taux de reclamation', '1,8%', '-0,1 pt'],
      ['Taux de ponctualite', '86%', '+3 pt'],
      ['Temps de resolution', '2,7 j', '-0,3 j'],
    ],
    actions: [
      ['Sous 24 h', 'Analyser la quatrieme semaine, la plus rentable du mois precedent.'],
      ['Sous 48 h', 'Renforcer les capacites sur les lignes les plus chargees.'],
      ['Ce mois', 'Poursuivre la baisse des retards amorcee en juin 2026.'],
      ['Priorite', 'Maintenir le tri des incidents par numero de voyage.'],
    ],
  },
  annee: {
    titre: 'Rapport annuel',
    sousTitre: 'Annee precedente · 2025',
    fichier: 'rapport_jego_annuel_annee_precedente',
    comparaisonLabel: '2024',
    chiffreAffaires: 54120000,
    reservations: 7814,
    tauxRemplissage: 77,
    noteMoyenne: 4.5,
    variation: 12,
    evolutionCA: [
      { label: 'Jan', valeur: 3920000 }, { label: 'Fev', valeur: 4010000 }, { label: 'Mar', valeur: 4180000 }, { label: 'Avr', valeur: 4300000 },
      { label: 'Mai', valeur: 4480000 }, { label: 'Juin', valeur: 4620000 }, { label: 'Juil', valeur: 4770000 }, { label: 'Aou', valeur: 4560000 },
      { label: 'Sep', valeur: 4410000 }, { label: 'Oct', valeur: 4520000 }, { label: 'Nov', valeur: 4680000 }, { label: 'Dec', valeur: 4950000 },
    ],
    comparaisonCA: [
      { label: 'Jan', valeur: 3520000 }, { label: 'Fev', valeur: 3610000 }, { label: 'Mar', valeur: 3790000 }, { label: 'Avr', valeur: 3880000 },
      { label: 'Mai', valeur: 4010000 }, { label: 'Juin', valeur: 4140000 }, { label: 'Juil', valeur: 4320000 }, { label: 'Aou', valeur: 4230000 },
      { label: 'Sep', valeur: 4090000 }, { label: 'Oct', valeur: 4170000 }, { label: 'Nov', valeur: 4280000 }, { label: 'Dec', valeur: 4520000 },
    ],
    remplissage: [
      { label: 'T1', valeur: 72 }, { label: 'T2', valeur: 75 }, { label: 'T3', valeur: 79 }, { label: 'T4', valeur: 82 },
    ],
    retards: [
      { label: 'T1', valeur: 19 }, { label: 'T2', valeur: 17 }, { label: 'T3', valeur: 15 }, { label: 'T4', valeur: 13 },
    ],
    topDestinations: [
      { route: 'Douala → Yaounde', reservations: 2440 },
      { route: 'Yaounde → Douala', reservations: 1908 },
      { route: 'Douala → Bafoussam', reservations: 1390 },
      { route: 'Douala → Kribi', reservations: 1118 },
      { route: 'Yaounde → Garoua', reservations: 958 },
    ],
    repartitionStatuts: [
      { label: 'Termines', valeur: 67, couleur: [11, 158, 99] },
      { label: 'Programmes', valeur: 19, couleur: [20, 32, 26] },
      { label: 'En retard', valeur: 9, couleur: [230, 184, 76] },
      { label: 'Annules', valeur: 5, couleur: [217, 83, 79] },
    ],
    incidentsLitiges: [
      ['Incidents ouverts', '38', '-16%', 'Uniquement sur l’annee 2025.'],
      ['Incidents resolus', '181', '+14%', 'Donnees annuelles consolidees.'],
      ['Litiges non resolus', '3', '-2', 'Stock de fin d’annee.'],
      ['Litiges resolus / 30 j', '18', 'Memo', 'Fenetre recente suivie a part, sans confusion avec l’annuel.'],
      ['Contestations', '9', '+2', 'Une seule contestation par decision defavorable.'],
    ],
    indicateursQualite: [
      ['Retard moyen', '16 min', '-4 min'],
      ['Taux de reclamation', '2,1%', '-0,4 pt'],
      ['Taux de ponctualite', '84%', '+5 pt'],
      ['Temps de resolution', '2,9 j', '-0,5 j'],
    ],
    actions: [
      ['T1 suivant', 'Capitaliser sur la progression annuelle de 2025.'],
      ['T1 suivant', 'Investir davantage sur les lignes a forte regularite.'],
      ['Annee suivante', 'Continuer la baisse structurelle des retards par trimestre.'],
      ['Controle', 'Garder la coherence des rapports par periode complete precedente.'],
    ],
  },
};

const statsAccueil = {
  chiffreAffaires: 2845000,
  reservationsTotal: 312,
  tauxRemplissage: 78,
  noteMoyenne: 4.6,
  topDestinations: RAPPORTS.semaine.topDestinations,
};

function formatFcfa(valeur: number) {
  return `${valeur.toLocaleString('fr-FR')} FCFA`;
}

export default function Statistiques() {
  const [telechargement, setTelechargement] = useState<Periode | null>(null);
  const [anneeChoisie, setAnneeChoisie] = useState(new Date().getFullYear() - 1);

  const rapportHebdo = RAPPORTS.semaine;
  const maxCA = Math.max(...rapportHebdo.evolutionCA.map((d) => d.valeur));
  const maxDest = Math.max(...statsAccueil.topDestinations.map((d) => d.reservations));
  const totalSemaine = rapportHebdo.evolutionCA.reduce((s, item) => s + item.valeur, 0);
  const totalSemainePrecedente = rapportHebdo.comparaisonCA.reduce((s, item) => s + item.valeur, 0);

  const cartes = useMemo(() => ([
    { titre: "Chiffre d'affaires", valeur: formatFcfa(statsAccueil.chiffreAffaires), fond: 'bg-gradient-to-br from-ink to-green-700 text-white', second: 'text-white/70' },
    { titre: 'Reservations', valeur: `${statsAccueil.reservationsTotal}`, fond: 'bg-paper border border-line', second: 'text-ink-soft' },
    { titre: 'Taux de remplissage', valeur: `${statsAccueil.tauxRemplissage}%`, fond: 'bg-paper border border-line', second: 'text-ink-soft' },
    { titre: 'Note moyenne', valeur: `⭐ ${statsAccueil.noteMoyenne}`, fond: 'bg-paper border border-line', second: 'text-ink-soft' },
  ]), []);

  function genererPdf(periode: Periode, anneeSurcharge?: number) {
    setTelechargement(periode);
    const data = periode === 'annee' && anneeSurcharge
      ? { ...RAPPORTS.annee, titre: `Rapport annuel ${anneeSurcharge}`, sousTitre: `Année ${anneeSurcharge}`, comparaisonLabel: String(anneeSurcharge - 1), fichier: `rapport_jego_annuel_${anneeSurcharge}` }
      : RAPPORTS[periode];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marge = 16;
    const largeurUtile = pageW - marge * 2;
    const dateGeneration = new Date();
    const referenceRapport = `RPT-${dateGeneration.toISOString().slice(0, 10).replaceAll('-', '')}-${periode.toUpperCase()}`;

    function filigrane() {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(238, 245, 241);
      for (let y = 34; y < pageH - 10; y += 42) {
        for (let x = -5; x < pageW; x += 62) doc.text('JEGO', x, y, { angle: 28 });
      }
    }

    function entete(titre: string, sousTitre: string, numeroPage: number) {
      filigrane();
      doc.setFillColor(20, 32, 26);
      doc.roundedRect(marge, 12, largeurUtile, 22, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('JEGO', marge + 6, 22);
      doc.setFontSize(10);
      doc.text(titre, marge + 34, 20.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(sousTitre, marge + 34, 26);
      doc.text(`Page ${numeroPage}`, pageW - marge - 6, 22, { align: 'right' });
      doc.setTextColor(100, 116, 108);
      doc.setFontSize(7);
      doc.text(`${referenceRapport} · Genere le ${dateGeneration.toLocaleDateString('fr-FR')} a ${dateGeneration.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, marge, pageH - 8);
      doc.text('Donnees de demonstration — periode precedente uniquement.', pageW - marge, pageH - 8, { align: 'right' });
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

    function carteKpi(x: number, y: number, w: number, titre: string, valeur: string, evolution: string, favorable = true) {
      doc.setFillColor(250, 252, 250);
      doc.setDrawColor(226, 233, 228);
      doc.roundedRect(x, y, w, 26, 3, 3, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 108);
      doc.text(titre, x + 4, y + 7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(20, 32, 26);
      doc.text(valeur, x + 4, y + 17);
      doc.setFontSize(7.5);
      const couleurEvolution: [number, number, number] = favorable ? [11, 158, 99] : [217, 83, 79];
      doc.setTextColor(couleurEvolution[0], couleurEvolution[1], couleurEvolution[2]);
      doc.text(evolution, x + w - 4, y + 17, { align: 'right' });
    }

    function graphiqueBarres(x: number, y: number, w: number, h: number, donnees: Serie[], titre: string, formatValeur: (n: number) => string) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 233, 228);
      doc.roundedRect(x, y, w, h, 3, 3, 'FD');
      doc.setTextColor(20, 32, 26);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(titre, x + 5, y + 8);
      const zoneX = x + 10;
      const zoneY = y + 15;
      const zoneW = w - 16;
      const zoneH = h - 25;
      const max = Math.max(...donnees.map((d) => d.valeur), 1);
      const largeurBarre = zoneW / donnees.length * 0.58;
      doc.setDrawColor(232, 237, 234);
      for (let i = 0; i <= 4; i++) {
        const gy = zoneY + (zoneH * i) / 4;
        doc.line(zoneX, gy, zoneX + zoneW, gy);
      }
      donnees.forEach((d, index) => {
        const hauteurBarre = (d.valeur / max) * (zoneH - 5);
        const bx = zoneX + (zoneW / donnees.length) * index + (zoneW / donnees.length - largeurBarre) / 2;
        const by = zoneY + zoneH - hauteurBarre;
        doc.setFillColor(11, 158, 99);
        doc.roundedRect(bx, by, largeurBarre, hauteurBarre, 1, 1, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(100, 116, 108);
        doc.text(d.label, bx + largeurBarre / 2, zoneY + zoneH + 4, { align: 'center' });
        doc.setFontSize(5.8);
        doc.text(formatValeur(d.valeur), bx + largeurBarre / 2, Math.max(zoneY + 4, by - 1.5), { align: 'center' });
      });
    }

    function graphiqueCourbe(x: number, y: number, w: number, h: number, donnees: Serie[], titre: string, suffixe: string, couleur: [number, number, number]) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 233, 228);
      doc.roundedRect(x, y, w, h, 3, 3, 'FD');
      doc.setTextColor(20, 32, 26);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(titre, x + 5, y + 8);
      const zoneX = x + 10;
      const zoneY = y + 16;
      const zoneW = w - 17;
      const zoneH = h - 27;
      const values = donnees.map((item) => item.valeur);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const amplitude = Math.max(max - min, 1);
      doc.setDrawColor(232, 237, 234);
      for (let i = 0; i <= 4; i++) doc.line(zoneX, zoneY + (zoneH * i) / 4, zoneX + zoneW, zoneY + (zoneH * i) / 4);
      const points = donnees.map((item, index) => ({
        x: zoneX + (zoneW * index) / Math.max(donnees.length - 1, 1),
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
        doc.setFillColor(255, 255, 255);
        doc.circle(point.x, point.y, 1.7, 'FD');
        doc.setDrawColor(...couleur);
        doc.circle(point.x, point.y, 1.7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 108);
        doc.text(donnees[index].label, point.x, zoneY + zoneH + 4, { align: 'center' });
        doc.text(`${donnees[index].valeur}${suffixe}`, point.x, Math.max(zoneY + 4, point.y - 3.5), { align: 'center' });
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
      const total = data.repartitionStatuts.reduce((s, item) => s + item.valeur, 0);
      let courant = x + 7;
      const largeurBarre = w - 14;
      data.repartitionStatuts.forEach((item) => {
        const largeur = (item.valeur / total) * largeurBarre;
        doc.setFillColor(...item.couleur);
        doc.roundedRect(courant, y + 17, largeur, 10, 1.5, 1.5, 'F');
        courant += largeur;
      });
      data.repartitionStatuts.forEach((item, index) => {
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
      const donnees = data.topDestinations;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 233, 228);
      doc.roundedRect(x, y, w, h, 3, 3, 'FD');
      doc.setTextColor(20, 32, 26);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Top destinations', x + 5, y + 8);
      const max = Math.max(...donnees.map((d) => d.reservations), 1);
      donnees.forEach((item, index) => {
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
    entete(data.titre, data.sousTitre, 1);
    titreSection('1. Synthese executive', 45);
    const kpiLargeur = (largeurUtile - 10) / 2;
    carteKpi(marge, 53, kpiLargeur, "Chiffre d'affaires", formatFcfa(data.chiffreAffaires), `${data.variation >= 0 ? '+' : ''}${data.variation}% vs ${data.comparaisonLabel}`);
    carteKpi(marge + kpiLargeur + 10, 53, kpiLargeur, 'Reservations', String(data.reservations), `${data.comparaisonLabel}`, true);
    carteKpi(marge, 84, kpiLargeur, 'Taux de remplissage', `${data.tauxRemplissage}%`, 'periode precedente complete');
    carteKpi(marge + kpiLargeur + 10, 84, kpiLargeur, 'Note moyenne', `⭐ ${data.noteMoyenne.toFixed(1)}`, 'retours clients');

    titreSection('Contexte du rapport', 122);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(82, 98, 90);
    const lignesContexte = [
      `Ce rapport utilise uniquement la periode precedente complete : ${data.sousTitre.toLowerCase()}.`,
      `Comparaison effectuee avec : ${data.comparaisonLabel}.`,
      `Aucune donnee hebdomadaire, mensuelle ou annuelle n'est melangee entre les rapports.`,
      `Les litiges restent classes par anciennete, et les litiges resolus affichent toujours les 30 derniers jours separement.`,
    ];
    lignesContexte.forEach((ligne, index) => doc.text(`• ${ligne}`, marge, 131 + index * 7));

    titreSection('Priorites recommandees', 168);
    data.actions.forEach(([niveau, texte], index) => {
      const y = 177 + index * 14;
      doc.setFillColor(250, 252, 250);
      doc.setDrawColor(226, 233, 228);
      doc.roundedRect(marge, y, largeurUtile, 10, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(20, 32, 26);
      doc.text(niveau, marge + 3, y + 6.3);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(82, 98, 90);
      doc.text(texte, marge + 29, y + 6.3, { maxWidth: largeurUtile - 34 });
    });

    // Page 2
    doc.addPage();
    entete(data.titre, 'Performance financiere de la periode precedente', 2);
    titreSection('2. Chiffre d’affaires par sous-periode', 45);
    graphiqueBarres(marge, 53, largeurUtile, 73, data.evolutionCA, 'Chiffre d’affaires de la periode', (n) => `${Math.round(n / 1000)}k`);
    graphiqueCourbe(marge, 132, largeurUtile, 65, data.comparaisonCA, `Reference de comparaison · ${data.comparaisonLabel}`, 'k', [20, 32, 26]);
    titreSection('Detail et comparaison', 207);
    const detailLignes = data.evolutionCA.map((item, index) => {
      const precedent = data.comparaisonCA[index]?.valeur || item.valeur;
      const taux = precedent ? ((item.valeur - precedent) / precedent) * 100 : 0;
      return [item.label, `${item.valeur.toLocaleString('fr-FR')} FCFA`, `${precedent.toLocaleString('fr-FR')} FCFA`, `${taux >= 0 ? '+' : ''}${taux.toFixed(1)}%`];
    });
    tableau(marge, 214, [31, 55, 55, 38], ['Periode', 'Courant', 'Comparaison', 'Evolution'], detailLignes, 8);

    // Page 3
    doc.addPage();
    entete(data.titre, 'Exploitation, retards et qualite', 3);
    titreSection('3. Performance operationnelle', 45);
    graphiqueCourbe(marge, 53, 87, 67, data.remplissage, 'Taux de remplissage', '%', [11, 158, 99]);
    graphiqueCourbe(marge + 92, 53, 87, 67, data.retards, 'Retard moyen', ' min', [217, 83, 79]);
    graphiqueStatuts(marge, 126, largeurUtile, 58);
    titreSection('Indicateurs qualite', 196);
    tableau(marge, 203, [68, 48, 63], ['Indicateur', 'Valeur', 'Evolution'], data.indicateursQualite, 9);
    doc.setFillColor(248, 250, 248);
    doc.setDrawColor(226, 233, 228);
    doc.roundedRect(marge, 267, largeurUtile, 15, 3, 3, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(82, 98, 90);
    doc.text('Lecture : les retards et le remplissage affiches ici concernent uniquement la meme periode precedente complete.', marge + 4, 276);

    // Page 4
    doc.addPage();
    entete(data.titre, 'Destinations, incidents et litiges', 4);
    titreSection('4. Destinations et experience client', 45);
    graphiqueHorizontal(marge, 53, largeurUtile, 78);
    titreSection('Incidents et litiges', 143);
    tableau(marge, 150, [46, 30, 36, 67], ['Categorie', 'Volume', 'Evolution', 'Commentaire'], data.incidentsLitiges, 10);
    titreSection('Plan d’action', 218);
    data.actions.forEach(([delai, action], index) => {
      const y = 227 + index * 13;
      doc.setFillColor(250, 252, 250);
      doc.setDrawColor(226, 233, 228);
      doc.roundedRect(marge, y, largeurUtile, 9, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(11, 158, 99);
      doc.text(delai, marge + 3, y + 5.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(82, 98, 90);
      doc.text(action, marge + 29, y + 5.8, { maxWidth: largeurUtile - 34 });
    });

    doc.save(`${data.fichier}.pdf`);
    window.setTimeout(() => setTelechargement(null), 1500);
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-ink mb-1">Statistiques</h1>
        <p className="text-[13px] text-ink-soft mb-2">Vue d&apos;ensemble de ton activite.</p>

        <div className="rounded-2xl p-3 mb-6 bg-red/6 border border-red/20">
          <p className="text-xs text-ink-soft">
            Les rapports sont maintenant strictement separes : hebdomadaire = semaine precedente,
            mensuel = mois precedent, annuel = annee precedente.
          </p>
        </div>

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
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-soft mb-1">Variation sur la semaine precedente</p>
            <p className="text-[22px] font-extrabold text-ink">+{rapportHebdo.variation}%</p>
          </div>
          <div className="text-[13px] text-ink-soft">
            Semaine precedente : <strong className="text-ink">{formatFcfa(totalSemaine)}</strong> ·
            comparaison : <strong className="text-ink">{formatFcfa(totalSemainePrecedente)}</strong>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-paper rounded-2xl border border-line p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-ink-soft">Evolution du chiffre d&apos;affaires (semaine precedente)</p>
              <span className="text-[10px] text-ink-soft whitespace-nowrap">20/07 → 26/07</span>
            </div>
            <div className="flex items-end justify-between gap-2 h-36">
              {rapportHebdo.evolutionCA.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <div className="w-full rounded-t-md bg-gradient-to-t from-green-700 to-green-500" style={{ height: `${(d.valeur / maxCA) * 100}%` }} />
                  </div>
                  <p className="text-[9px] text-ink-soft">{d.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-paper rounded-2xl border border-line p-6">
            <p className="text-xs font-bold text-ink-soft mb-4">Top destinations</p>
            <div className="space-y-3">
              {statsAccueil.topDestinations.map((d) => (
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
          </div>
        </div>

        <div className="bg-paper rounded-2xl border border-line p-6">
          <p className="text-sm font-bold text-ink mb-1">Telecharger un rapport (PDF)</p>
          <p className="text-xs text-ink-soft mb-4">Rapports detailles de 4 pages, chacun limite a sa periode precedente complete.</p>
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
                {telechargement === p.valeur ? 'Telecharge !' : p.label}
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
                {telechargement === 'annee' ? 'Telecharge !' : 'Telecharger'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </LayoutAgence>
  );
}
