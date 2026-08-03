"use client";
// ⚠️ DEMO COMPLÈTE — aucune route backend "points" n'existe (pas de
// pointsRoutes.js). Les seuils de conversion (500/1000 pts) sont réels
// (table parametres_systeme), mais les soldes et l'historique d'usage
// par voyageur sont entièrement factices.

import { useState } from "react";
import { Panel, Badge, StatCard } from "@/components/ui";
import HistoriqueButton from "@/components/HistoriqueButton";

const voyageursPoints = [
  { id: 5001, nom: "Jean Dupont", tel: "+237 6 77 xx xx 12", solde: 1240, gagnes: 2100, utilises: 860 },
  { id: 5002, nom: "Aïcha Bello", tel: "+237 6 90 xx xx 45", solde: 320, gagnes: 320, utilises: 0 },
  { id: 5003, nom: "Franck Mbida", tel: "+237 6 55 xx xx 88", solde: 980, gagnes: 1500, utilises: 520 },
];

const usages = [
  { id: 9001, voyageur: "Jean Dupont", action: "Reconversion palier 1000", type: "Utilisation normale", points: -1000, date: "12 jan. 2026" },
  { id: 9002, voyageur: "Franck Mbida", action: "Billet cadeau offert à un proche", type: "Billet gratuit", points: -500, date: "10 jan. 2026" },
  { id: 9003, voyageur: "Jean Dupont", action: "Points gagnés — trajet Douala→Yaoundé", type: "Gain", points: 140, date: "15 jan. 2026" },
  { id: 9004, voyageur: "Aïcha Bello", action: "Points gagnés — trajet Yaoundé→Bertoua", type: "Gain", points: 320, date: "14 jan. 2026" },
];

export default function PointsPage() {
  const [recherche, setRecherche] = useState("");
  const filtres = voyageursPoints.filter((v) => v.nom.toLowerCase().includes(recherche.toLowerCase()));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Points JEGO</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Démo — aucune route backend dédiée n&apos;existe encore</div>
        </div>
        <HistoriqueButton label="Historique des reconversions" entrees={[
          { heure: "hier 14:20", action: "Jean Dupont — reconversion 1000 pts", auteur: "système" },
          { heure: "10 jan.", action: "Franck Mbida — billet cadeau (500 pts)", auteur: "système" },
        ]} />
      </div>

      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <StatCard num="48 200" label="Total points en circulation" />
        <StatCard num="2 540" label="Points gagnés — 7 derniers jours" />
        <StatCard num="1 360" label="Points reconvertis — 7 derniers jours" />
        <StatCard num="500 / 1000" label="Paliers de reconversion (parametres_systeme)" />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Panel
          title="Points par voyageur"
          action={<input placeholder="Rechercher…" value={recherche} onChange={(e) => setRecherche(e.target.value)} className="px-2.5 py-1.5 border border-line rounded-lg text-xs w-48 bg-transparent" />}
        >
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr>{["ID", "Voyageur", "Téléphone", "Solde", "Gagnés", "Utilisés"].map((h) => <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtres.map((v) => (
                  <tr key={v.id} className="border-t border-line">
                    <td className="px-[18px] py-2.5 text-[12px] font-mono text-ink-soft">#{v.id}</td>
                    <td className="px-[18px] py-2.5 text-[13px]"><b>{v.nom}</b></td>
                    <td className="px-[18px] py-2.5 text-[12px] font-mono">{v.tel}</td>
                    <td className="px-[18px] py-2.5"><Badge color="green">{v.solde} pts</Badge></td>
                    <td className="px-[18px] py-2.5 text-[13px] font-mono">{v.gagnes}</td>
                    <td className="px-[18px] py-2.5 text-[13px] font-mono">{v.utilises}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Derniers usages">
          <div className="max-h-[380px] overflow-y-auto">
            {usages.map((u) => (
              <div key={u.id} className="px-[18px] py-3 border-t border-dashed border-line first:border-t-0">
                <div className="flex justify-between text-[12.5px]">
                  <b>{u.voyageur}</b>
                  <span className={`font-mono font-semibold ${u.points < 0 ? "text-red" : "text-green-700"}`}>
                    {u.points > 0 ? "+" : ""}{u.points} pts
                  </span>
                </div>
                <div className="text-[11.5px] text-ink-soft mt-0.5">{u.action} · {u.date}</div>
                <div className="mt-1"><Badge color={u.type === "Billet gratuit" ? "purple" : u.type === "Gain" ? "green" : "amber"}>{u.type}</Badge></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
