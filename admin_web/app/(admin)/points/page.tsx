"use client";
// PRÊT À BRANCHER — Points JEGO.
// Les paliers de reconversion sont réels (table parametres_systeme), mais
// aucune route "points" n'existe encore (pas de pointsRoutes.js).
// Routes attendues :
//   GET /api/admin/points/resume  → { totalCirculation, gagnes7j, reconvertis7j, paliers }
//   GET /api/admin/points/voyageurs?recherche=…
//     → { voyageurs: [{ id, nom, prenom, telephone, solde, gagnes, utilises }] }
//   GET /api/admin/points/usages  → { usages: [{ id, voyageur, action, type, points, date }] }

import { useEffect, useState } from "react";
import { Panel, Badge, StatCard } from "@/components/ui";
import HistoriqueButton from "@/components/HistoriqueButton";

type VoyageurPoints = {
  id: string; nom: string; prenom: string; telephone: string;
  solde: number; gagnes: number; utilises: number;
};

type Usage = {
  id: string; voyageur: string; action: string;
  type: string; points: number; date: string;
};

type Resume = { totalCirculation: string; gagnes7j: string; reconvertis7j: string; paliers: string };

const resumeVide: Resume = { totalCirculation: "—", gagnes7j: "—", reconvertis7j: "—", paliers: "—" };

export default function PointsPage() {
  const [recherche, setRecherche] = useState("");
  const [resume, setResume] = useState<Resume>(resumeVide);
  const [voyageurs, setVoyageurs] = useState<VoyageurPoints[]>([]);
  const [usages, setUsages] = useState<Usage[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    async function charger() {
      setChargement(true);
      try {
        // BRANCHEMENT :
        // const r = await apiFetch("/api/admin/points/resume");
        // if (!annule) setResume(r);
        // const v = await apiFetch(`/api/admin/points/voyageurs?recherche=${encodeURIComponent(recherche)}`);
        // if (!annule) setVoyageurs(v.voyageurs || []);
        // const u = await apiFetch("/api/admin/points/usages");
        // if (!annule) setUsages(u.usages || []);
        if (!annule) { setResume(resumeVide); setVoyageurs([]); setUsages([]); setErreur(null); }
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : "Impossible de charger les points.");
      } finally {
        if (!annule) setChargement(false);
      }
    }
    const t = setTimeout(charger, 300);
    return () => { annule = true; clearTimeout(t); };
  }, [recherche]);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Points JEGO</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Soldes, gains et reconversions</div>
        </div>
        <HistoriqueButton label="Historique des reconversions" entrees={[]} />
      </div>

      {erreur && <p className="mb-4 text-[13px] text-red font-medium">{erreur}</p>}

      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <StatCard num={resume.totalCirculation} label="Total points en circulation" />
        <StatCard num={resume.gagnes7j} label="Points gagnés — 7 derniers jours" />
        <StatCard num={resume.reconvertis7j} label="Points reconvertis — 7 derniers jours" />
        <StatCard num={resume.paliers} label="Paliers de reconversion (parametres_systeme)" />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Panel
          title="Points par voyageur"
          action={<input placeholder="Rechercher…" value={recherche} onChange={(e) => setRecherche(e.target.value)} className="px-2.5 py-1.5 border border-line rounded-lg text-xs w-48 bg-transparent" />}
        >
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr>{["Voyageur", "Téléphone", "Solde", "Gagnés", "Utilisés"].map((h) => <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {voyageurs.map((v) => (
                  <tr key={v.id} className="border-t border-line">
                    <td className="px-[18px] py-2.5 text-[13px]"><b>{v.prenom} {v.nom}</b></td>
                    <td className="px-[18px] py-2.5 text-[12px] font-mono">{v.telephone}</td>
                    <td className="px-[18px] py-2.5"><Badge color="green">{v.solde} pts</Badge></td>
                    <td className="px-[18px] py-2.5 text-[13px] font-mono">{v.gagnes}</td>
                    <td className="px-[18px] py-2.5 text-[13px] font-mono">{v.utilises}</td>
                  </tr>
                ))}
                {!chargement && voyageurs.length === 0 && !erreur && (
                  <tr><td colSpan={5} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Aucun voyageur</td></tr>
                )}
                {chargement && (
                  <tr><td colSpan={5} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Chargement…</td></tr>
                )}
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
            {!chargement && usages.length === 0 && (
              <div className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Aucun usage récent</div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
