"use client";
// PRÊT À BRANCHER — rapports & statistiques.
// La génération PDF (jsPDF) est réelle et conservée telle quelle : mise en
// page, filigrane JEGO, KPI, graphes. Seules les DONNÉES viennent désormais
// de l'état, alimenté par le backend.
// Routes attendues :
//   GET /api/admin/rapports?periode=hebdo|mensuel|annuel&annee=YYYY
//     → { kpis: { revenuNet, billetsVendus, agencesActives, litigesResolus,
//                 deltaRevenu, deltaBillets, deltaAgences, deltaLitiges },
//         serieRevenu: [{ label, valeur }],
//         classement: [{ nom, note, billets }],
//         agencesDetail: [{ id, nom, billets, revenu, note, litiges }],
//         litigesResume: [string],
//         tendance: [{ label, valeur }],
//         paiements: [{ label, part }],
//         synthese: [string],
//         rapportsDisponibles: [{ id, libelle, type }] }

import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { Panel, BtnMini, Toast } from "@/components/ui";
import HistoriqueButton from "@/components/HistoriqueButton";

type Periode = "hebdo" | "mensuel" | "annuel";

type Kpis = {
  revenuNet: string; billetsVendus: string; agencesActives: string; litigesResolus: string;
  deltaRevenu: string; deltaBillets: string; deltaAgences: string; deltaLitiges: string;
};
type PointSerie = { label: string; valeur: number };
type LigneClassement = { nom: string; note: string; billets: string };
type AgenceDetail = { id: string; nom: string; billets: string; revenu: string; note: string; litiges: string };
type Paiement = { label: string; part: number };
type RapportDispo = { id: string; libelle: string; type: string };

type DonneesRapport = {
  kpis: Kpis;
  serieRevenu: PointSerie[];
  classement: LigneClassement[];
  agencesDetail: AgenceDetail[];
  litigesResume: string[];
  tendance: PointSerie[];
  paiements: Paiement[];
  synthese: string[];
  rapportsDisponibles: RapportDispo[];
};

const kpisVides: Kpis = {
  revenuNet: "—", billetsVendus: "—", agencesActives: "—", litigesResolus: "—",
  deltaRevenu: "", deltaBillets: "", deltaAgences: "", deltaLitiges: "",
};

const donneesVides: DonneesRapport = {
  kpis: kpisVides,
  serieRevenu: [], classement: [], agencesDetail: [],
  litigesResume: [], tendance: [], paiements: [], synthese: [],
  rapportsDisponibles: [],
};

// Couleurs de légende des moyens de paiement (visuel uniquement).
const couleursPaiement: Record<string, [number, number, number]> = {
  "MTN Mobile Money": [255, 204, 0],
  "Orange Money": [255, 130, 0],
};
const couleurPaiementDefaut: [number, number, number] = [140, 140, 140];

const anneeCourante = new Date().getFullYear();
const anneesDisponibles = [anneeCourante, anneeCourante - 1, anneeCourante - 2];

export default function RapportsPage() {
  const [toast, setToast] = useState<string | null>(null);
  const [periode, setPeriode] = useState<Periode>("mensuel");
  const [annee, setAnnee] = useState(anneeCourante);
  const [donnees, setDonnees] = useState<DonneesRapport>(donneesVides);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const vide = useMemo(
    () => donnees.serieRevenu.length === 0 && donnees.agencesDetail.length === 0,
    [donnees]
  );

  useEffect(() => {
    let annule = false;
    async function charger() {
      setChargement(true);
      try {
        // BRANCHEMENT :
        // const res = await apiFetch(`/api/admin/rapports?periode=${periode}&annee=${annee}`);
        // if (!annule) setDonnees({ ...donneesVides, ...res });
        if (!annule) { setDonnees(donneesVides); setErreur(null); }
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : "Impossible de charger les rapports.");
      } finally {
        if (!annule) setChargement(false);
      }
    }
    charger();
    return () => { annule = true; };
  }, [periode, annee]);

  function notifier(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function genererPdf(nomRapport: string) {
    if (vide) {
      notifier("Aucune donnée à exporter pour cette période");
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marge = 16;
    const largeurUtile = pageW - marge * 2;
    const dateGeneration = new Date();
    const reference = `RPT-${dateGeneration.toISOString().slice(0, 10).replaceAll("-", "")}-${periode.toUpperCase()}`;

    function filigrane() {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(238, 245, 241);
      for (let y = 34; y < pageH - 10; y += 42) {
        for (let x = -5; x < pageW; x += 62) doc.text("JEGO", x, y, { angle: 28 });
      }
    }

    function entete(titre: string, sousTitre: string) {
      filigrane();
      doc.setFillColor(20, 32, 26);
      doc.roundedRect(marge, 12, largeurUtile, 22, 4, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("JEGO", marge + 6, 22);
      doc.setFontSize(10);
      doc.text(titre, marge + 34, 20.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(sousTitre, marge + 34, 26);
      doc.setTextColor(100, 116, 108);
      doc.setFontSize(7);
      doc.text(`${reference} · Généré le ${dateGeneration.toLocaleDateString("fr-FR")}`, marge, pageH - 8);
      doc.text("Espace Super Admin — document confidentiel.", pageW - marge, pageH - 8, { align: "right" });
    }

    function titreSection(texte: string, y: number) {
      doc.setTextColor(20, 32, 26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(texte, marge, y);
      doc.setDrawColor(11, 158, 99);
      doc.setLineWidth(0.8);
      doc.line(marge, y + 2.2, marge + 28, y + 2.2);
    }

    function carteKpi(x: number, y: number, w: number, titre: string, valeur: string, evolution: string, favorable = true) {
      doc.setFillColor(250, 252, 250);
      doc.setDrawColor(226, 233, 228);
      doc.roundedRect(x, y, w, 26, 3, 3, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 108);
      doc.text(titre, x + 4, y + 7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(20, 32, 26);
      doc.text(valeur, x + 4, y + 17);
      doc.setFontSize(7.5);
      const couleurEvolution: [number, number, number] = favorable ? [11, 158, 99] : [217, 83, 79];
      doc.setTextColor(couleurEvolution[0], couleurEvolution[1], couleurEvolution[2]);
      doc.text(evolution, x + w - 4, y + 17, { align: "right" });
    }

    function graphiqueBarres(x: number, y: number, w: number, h: number) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 233, 228);
      doc.roundedRect(x, y, w, h, 3, 3, "FD");
      doc.setTextColor(20, 32, 26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`Revenu net JEGO — ${periode === "annuel" ? annee : periode}`, x + 5, y + 8);
      const zoneX = x + 10, zoneY = y + 15, zoneW = w - 16, zoneH = h - 25;
      const serie = donnees.serieRevenu;
      if (serie.length === 0) return;
      const max = Math.max(...serie.map((d) => d.valeur), 1);
      const largeurBarre = (zoneW / serie.length) * 0.6;
      doc.setDrawColor(232, 237, 234);
      for (let i = 0; i <= 4; i++) doc.line(zoneX, zoneY + (zoneH * i) / 4, zoneX + zoneW, zoneY + (zoneH * i) / 4);
      serie.forEach((d, index) => {
        const hauteurBarre = (d.valeur / max) * (zoneH - 5);
        const bx = zoneX + (zoneW / serie.length) * index + (zoneW / serie.length - largeurBarre) / 2;
        const by = zoneY + zoneH - hauteurBarre;
        doc.setFillColor(11, 158, 99);
        doc.roundedRect(bx, by, largeurBarre, hauteurBarre, 1, 1, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.2);
        doc.setTextColor(100, 116, 108);
        doc.text(d.label, bx + largeurBarre / 2, zoneY + zoneH + 4, { align: "center" });
      });
    }

    entete(nomRapport, `Période : ${periode === "annuel" ? annee : periode === "mensuel" ? "Mois en cours" : "Semaine en cours"}`);
    titreSection("Vue d'ensemble", 42);
    const largeurCarte = (largeurUtile - 12) / 4;
    const k = donnees.kpis;
    carteKpi(marge, 46, largeurCarte, "Revenu net JEGO", k.revenuNet, k.deltaRevenu);
    carteKpi(marge + largeurCarte + 4, 46, largeurCarte, "Billets vendus", k.billetsVendus, k.deltaBillets);
    carteKpi(marge + (largeurCarte + 4) * 2, 46, largeurCarte, "Agences actives", k.agencesActives, k.deltaAgences);
    carteKpi(marge + (largeurCarte + 4) * 3, 46, largeurCarte, "Litiges résolus", k.litigesResolus, k.deltaLitiges, false);

    titreSection("Évolution du revenu", 84);
    graphiqueBarres(marge, 88, largeurUtile, 60);

    titreSection("Classement des agences", 160);
    let yLigne = 168;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    donnees.classement.forEach((ligne, i) => {
      doc.setTextColor(20, 32, 26);
      doc.text(`${i + 1}. ${ligne.nom}`, marge, yLigne);
      doc.setTextColor(100, 116, 108);
      doc.text(`${ligne.note}  ·  ${ligne.billets}`, marge + 90, yLigne);
      yLigne += 7;
    });

    doc.addPage();
    entete(nomRapport, `Détail par agence — Page 2`);

    titreSection("Comparatif des agences", 42);
    let yTab = 50;
    doc.setFillColor(20, 32, 26);
    doc.rect(marge, yTab, largeurUtile, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const colonnes = ["ID", "Agence", "Billets", "Revenu", "Note", "Litiges"];
    const largeursCol = [16, 62, 26, 30, 20, 22];
    let xCol = marge + 2;
    colonnes.forEach((col, i) => { doc.text(col, xCol, yTab + 5); xCol += largeursCol[i]; });
    yTab += 9;
    donnees.agencesDetail.forEach((a, i) => {
      if (i % 2 === 0) { doc.setFillColor(250, 252, 250); doc.rect(marge, yTab - 1, largeurUtile, 7, "F"); }
      doc.setTextColor(20, 32, 26);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      xCol = marge + 2;
      const valeurs = [a.id, a.nom, a.billets, a.revenu, a.note + " ★", a.litiges];
      valeurs.forEach((v, j) => { doc.text(v, xCol, yTab + 4); xCol += largeursCol[j]; });
      yTab += 7;
    });

    titreSection("Litiges de la période", yTab + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(20, 32, 26);
    let yLitige = yTab + 18;
    donnees.litigesResume.forEach((ligne) => {
      doc.text(`• ${ligne}`, marge, yLitige);
      yLitige += 6;
    });

    titreSection("Tendance sur 4 périodes précédentes", yLitige + 10);
    const tendance = donnees.tendance;
    const zoneX = marge + 10, zoneY = yLitige + 20, zoneW = largeurUtile - 20, zoneH = 40;
    doc.setDrawColor(226, 233, 228);
    doc.roundedRect(marge, yLitige + 14, largeurUtile, zoneH + 14, 3, 3, "D");
    if (tendance.length > 1) {
      const maxT = Math.max(...tendance.map((t) => t.valeur));
      const minT = Math.min(...tendance.map((t) => t.valeur));
      const points = tendance.map((t, i) => ({
        x: zoneX + (zoneW * i) / (tendance.length - 1),
        y: zoneY + zoneH - ((t.valeur - minT) / Math.max(maxT - minT, 1)) * (zoneH - 6),
      }));
      doc.setDrawColor(11, 158, 99);
      doc.setLineWidth(1.3);
      points.forEach((p, i) => { if (i > 0) doc.line(points[i - 1].x, points[i - 1].y, p.x, p.y); });
      points.forEach((p, i) => {
        doc.setFillColor(255, 255, 255);
        doc.circle(p.x, p.y, 1.7, "FD");
        doc.setDrawColor(11, 158, 99);
        doc.circle(p.x, p.y, 1.7);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 108);
        doc.text(tendance[i].label, p.x, zoneY + zoneH + 6, { align: "center" });
      });
    }

    doc.addPage();
    entete(nomRapport, "Paiements & synthèse — Page 3");

    titreSection("Répartition des moyens de paiement", 42);
    let courant = marge;
    const largeurBarrePaiement = largeurUtile;
    donnees.paiements.forEach((p) => {
      const couleur = couleursPaiement[p.label] ?? couleurPaiementDefaut;
      const l = (p.part / 100) * largeurBarrePaiement;
      doc.setFillColor(couleur[0], couleur[1], couleur[2]);
      doc.roundedRect(courant, 48, l, 10, 1.5, 1.5, "F");
      courant += l;
    });
    let yLegende = 66;
    donnees.paiements.forEach((p) => {
      const couleur = couleursPaiement[p.label] ?? couleurPaiementDefaut;
      doc.setFillColor(couleur[0], couleur[1], couleur[2]);
      doc.circle(marge + 2, yLegende - 1.3, 1.5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(20, 32, 26);
      doc.text(`${p.label} — ${p.part}%`, marge + 6, yLegende);
      yLegende += 6;
    });

    titreSection("Synthèse & points d'attention", yLegende + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(20, 32, 26);
    let ySynthese = yLegende + 18;
    donnees.synthese.forEach((ligne) => {
      doc.text(`• ${ligne}`, marge, ySynthese);
      ySynthese += 6;
    });

    doc.save(`${nomRapport.toLowerCase().replaceAll(" ", "_")}_${periode}${periode === "annuel" ? "_" + annee : ""}.pdf`);
    notifier("PDF généré et téléchargé");
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Rapports &amp; statistiques</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Génération automatique, export PDF</div>
        </div>
        <HistoriqueButton entrees={[]} />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1.5">
          {(["hebdo", "mensuel", "annuel"] as Periode[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                periode === p ? "bg-green-700 text-white border-green-700" : "border-line text-ink-soft"
              }`}
            >
              {p === "hebdo" ? "Hebdomadaire" : p === "mensuel" ? "Mensuel" : "Annuel"}
            </button>
          ))}
        </div>
        {periode === "annuel" && (
          <select
            value={annee}
            onChange={(e) => setAnnee(Number(e.target.value))}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line bg-transparent"
          >
            {anneesDisponibles.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>

      {erreur && <p className="mb-4 text-[13px] text-red font-medium">{erreur}</p>}

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Panel title="Rapports disponibles">
          <div className="max-h-[420px] overflow-y-auto">
<table className="w-full">
            <tbody>
              {donnees.rapportsDisponibles.map((r) => (
                <tr key={r.id} className="border-t border-line first:border-t-0">
                  <td className="px-[18px] py-2.5 text-[13px]">{r.libelle} — {periode === "annuel" ? annee : periode}</td>
                  <td className="px-[18px] py-2.5"><BtnMini variant="primary" onClick={() => genererPdf(r.libelle)}>📄 Télécharger le PDF</BtnMini></td>
                </tr>
              ))}
              {!chargement && donnees.rapportsDisponibles.length === 0 && (
                <tr><td colSpan={2} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Aucun rapport disponible pour cette période</td></tr>
              )}
              {chargement && (
                <tr><td colSpan={2} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Chargement…</td></tr>
              )}
            </tbody>
          </table>
</div>
        </Panel>
        <Panel title={`Classement agences — ${periode === "annuel" ? annee : periode}`}>
          <div className="px-[18px] py-3.5">
            {donnees.classement.map((c, i) => (
              <div key={c.nom} className="kv">
                <span>{["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`} {c.nom}</span>
                <span className="font-semibold">{c.note} · {c.billets}</span>
              </div>
            ))}
            {!chargement && donnees.classement.length === 0 && (
              <div className="text-center text-ink-soft text-[12.5px] py-4">Aucun classement disponible</div>
            )}
          </div>
        </Panel>
      </div>
      <Toast message={toast} />
    </div>
  );
}
