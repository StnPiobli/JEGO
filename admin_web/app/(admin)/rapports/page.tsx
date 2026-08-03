"use client";
// ⚠️ DEMO — le PDF est réellement généré (jsPDF, même style visuel que
// l'export de agence_web/statistiques : filigrane JEGO, en-tête, KPI, graphe)
// mais avec des données factices. Pas de vraie route backend de génération
// de rapport agrégé n'a été vérifiée pour l'instant.

import { useState, useMemo } from "react";
import { jsPDF } from "jspdf";
import { Topbar, Panel, BtnMini, ToastDemo } from "@/components/ui";
import HistoriqueButton from "@/components/HistoriqueButton";

type Periode = "hebdo" | "mensuel" | "annuel";

const anneesDisponibles = [2026, 2025, 2024];

export default function RapportsPage() {
  const [toast, setToast] = useState<string | null>(null);
  const [periode, setPeriode] = useState<Periode>("mensuel");
  const [annee, setAnnee] = useState(2026);

  const serieRevenu = useMemo(() => {
    const labels =
      periode === "hebdo" ? ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] :
      periode === "mensuel" ? ["Sem 1", "Sem 2", "Sem 3", "Sem 4"] :
      ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    return labels.map((label, i) => ({ label, valeur: 200 + Math.round(Math.sin(i + annee) * 80 + i * 15) }));
  }, [periode, annee]);

  function notifier(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function genererPdf(nomRapport: string) {
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
      doc.text("Données de démonstration — espace Super Admin.", pageW - marge, pageH - 8, { align: "right" });
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
      const max = Math.max(...serieRevenu.map((d) => d.valeur), 1);
      const largeurBarre = (zoneW / serieRevenu.length) * 0.6;
      doc.setDrawColor(232, 237, 234);
      for (let i = 0; i <= 4; i++) doc.line(zoneX, zoneY + (zoneH * i) / 4, zoneX + zoneW, zoneY + (zoneH * i) / 4);
      serieRevenu.forEach((d, index) => {
        const hauteurBarre = (d.valeur / max) * (zoneH - 5);
        const bx = zoneX + (zoneW / serieRevenu.length) * index + (zoneW / serieRevenu.length - largeurBarre) / 2;
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
    carteKpi(marge, 46, largeurCarte, "Revenu net JEGO", "4,82M F", "+12%");
    carteKpi(marge + largeurCarte + 4, 46, largeurCarte, "Billets vendus", "1 204", "+8%");
    carteKpi(marge + (largeurCarte + 4) * 2, 46, largeurCarte, "Agences actives", "32", "+2");
    carteKpi(marge + (largeurCarte + 4) * 3, 46, largeurCarte, "Litiges résolus", "18", "+3", false);

    titreSection("Évolution du revenu", 84);
    graphiqueBarres(marge, 88, largeurUtile, 60);

    titreSection("Classement des agences", 160);
    const classement = [
      ["Touristique Express", "4.8 ★", "1 204 billets"],
      ["Nuit Express", "4.6 ★", "980 billets"],
      ["Général Voyages", "4.4 ★", "875 billets"],
    ];
    let yLigne = 168;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    classement.forEach((ligne, i) => {
      doc.setTextColor(20, 32, 26);
      doc.text(`${i + 1}. ${ligne[0]}`, marge, yLigne);
      doc.setTextColor(100, 116, 108);
      doc.text(`${ligne[1]}  ·  ${ligne[2]}`, marge + 90, yLigne);
      yLigne += 7;
    });

    doc.addPage();
    entete(nomRapport, `Détail par agence — Page 2`);

    titreSection("Comparatif des agences", 42);
    const agencesDetail = [
      { nom: "Touristique Express", id: "101", billets: "1 204", revenu: "1,9M F", note: "4.8", litiges: "2" },
      { nom: "Nuit Express", id: "102", billets: "980", revenu: "1,5M F", note: "4.6", litiges: "3" },
      { nom: "Général Voyages", id: "103", billets: "875", revenu: "1,4M F", note: "4.4", litiges: "5" },
    ];
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
    agencesDetail.forEach((a, i) => {
      if (i % 2 === 0) { doc.setFillColor(250, 252, 250); doc.rect(marge, yTab - 1, largeurUtile, 7, "F"); }
      doc.setTextColor(20, 32, 26);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      xCol = marge + 2;
      const valeurs = [a.id, a.nom, a.billets, a.revenu, a.note + " ★", a.litiges];
      valeurs.forEach((v, j) => { doc.text(v, xCol, yTab + 4); xCol += largeursCol[j]; });
      yTab += 7;
    });

    titreSection("Litiges du mois", yTab + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(20, 32, 26);
    const litigesResume = [
      "18 litiges traités — 12 niveau 1 (auto-résolu), 5 niveau 2 (médiation admin), 1 niveau 3",
      "Motif principal : retards non annoncés (7 cas) — conduite dangereuse (3 cas) — bagages (4 cas)",
      "Montant total remboursé sur litiges : 184 000 FCFA",
    ];
    let yLitige = yTab + 18;
    litigesResume.forEach((ligne) => {
      doc.text(`• ${ligne}`, marge, yLitige);
      yLitige += 6;
    });

    titreSection("Tendance sur 4 périodes précédentes", yLitige + 10);
    const tendance = [
      { label: "T-3", valeur: 3800000 }, { label: "T-2", valeur: 4100000 },
      { label: "T-1", valeur: 4350000 }, { label: "Actuel", valeur: 4820000 },
    ];
    const zoneX = marge + 10, zoneY = yLitige + 20, zoneW = largeurUtile - 20, zoneH = 40;
    doc.setDrawColor(226, 233, 228);
    doc.roundedRect(marge, yLitige + 14, largeurUtile, zoneH + 14, 3, 3, "D");
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

    doc.addPage();
    entete(nomRapport, "Paiements & synthèse — Page 3");

    titreSection("Répartition des moyens de paiement", 42);
    const paiements = [
      { label: "MTN Mobile Money", part: 58, couleur: [255, 204, 0] as [number, number, number] },
      { label: "Orange Money", part: 34, couleur: [255, 130, 0] as [number, number, number] },
      { label: "Autre / carte", part: 8, couleur: [140, 140, 140] as [number, number, number] },
    ];
    let courant = marge;
    const largeurBarrePaiement = largeurUtile;
    paiements.forEach((p) => {
      const l = (p.part / 100) * largeurBarrePaiement;
      doc.setFillColor(p.couleur[0], p.couleur[1], p.couleur[2]);
      doc.roundedRect(courant, 48, l, 10, 1.5, 1.5, "F");
      courant += l;
    });
    let yLegende = 66;
    paiements.forEach((p) => {
      doc.setFillColor(p.couleur[0], p.couleur[1], p.couleur[2]);
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
    const synthese = [
      "18 agences (56%) publient leur programme à jour, avec plus de 2 semaines d'avance.",
      "Général Voyages est en retard sur son programme — un rappel automatique a été envoyé.",
      "Le taux de litiges reste stable (2 sur 100 billets vendus environ).",
      "72% des billets sont vendus via l'app JEGO contre 28% au guichet agence.",
    ];
    let ySynthese = yLegende + 18;
    synthese.forEach((ligne) => {
      doc.text(`• ${ligne}`, marge, ySynthese);
      ySynthese += 6;
    });

    doc.save(`${nomRapport.toLowerCase().replaceAll(" ", "_")}_${periode}${periode === "annuel" ? "_" + annee : ""}.pdf`);
    notifier("PDF généré et téléchargé (démo)");
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Rapports & statistiques</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Génération automatique, export PDF réel — démo</div>
        </div>
        <HistoriqueButton entrees={[
          { heure: "09:02", action: "Rapport global décembre téléchargé (PDF)", auteur: "s.piobli" },
          { heure: "hier 18:40", action: "Classement agences décembre téléchargé (PDF)", auteur: "s.piobli" },
        ]} />
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
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line"
          >
            {anneesDisponibles.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Panel title="Rapports disponibles">
          <div className="max-h-[420px] overflow-y-auto">
<table className="w-full">
            <tbody>
              <tr className="border-t border-line first:border-t-0">
                <td className="px-[18px] py-2.5 text-[13px]">Rapport global — {periode === "annuel" ? annee : periode}</td>
                <td className="px-[18px] py-2.5"><BtnMini variant="primary" onClick={() => genererPdf("Rapport global")}>📄 Télécharger le PDF</BtnMini></td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]">Classement agences — {periode === "annuel" ? annee : periode}</td>
                <td className="px-[18px] py-2.5"><BtnMini variant="primary" onClick={() => genererPdf("Classement agences")}>📄 Télécharger le PDF</BtnMini></td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]">Rapport Touristique Express — {periode === "annuel" ? annee : periode}</td>
                <td className="px-[18px] py-2.5"><BtnMini variant="primary" onClick={() => genererPdf("Rapport agence")}>📄 Télécharger le PDF</BtnMini></td>
              </tr>
            </tbody>
          </table>
</div>
        </Panel>
        <Panel title={`Classement agences — ${periode === "annuel" ? annee : periode}`}>
          <div className="px-[18px] py-3.5">
            <div className="kv"><span>🥇 Touristique Express</span><span className="font-semibold">4.8 ★ · 1 204 billets</span></div>
            <div className="kv"><span>🥈 Nuit Express</span><span className="font-semibold">4.6 ★ · 980 billets</span></div>
            <div className="kv"><span>🥉 Général Voyages</span><span className="font-semibold">4.4 ★ · 875 billets</span></div>
          </div>
        </Panel>
      </div>
      <ToastDemo message={toast} />
    </div>
  );
}
