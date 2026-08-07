"use client";
// PRÊT À BRANCHER — journal des actions sensibles.
// Route attendue : GET /api/admin/logs?date=YYYY-MM-DD
// Réponse attendue : { logs: [{ horodatage, action, auteur, ip }] }

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui";
import DateNav from "@/components/DateNav";
import HistoriqueButton from "@/components/HistoriqueButton";

type Log = { horodatage: string; action: string; auteur: string; ip: string };

export default function SecuritePage() {
  const [date, setDate] = useState(new Date());
  const [logs, setLogs] = useState<Log[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    async function charger() {
      setChargement(true);
      try {
        // BRANCHEMENT :
        // const res = await apiFetch(`/api/admin/logs?date=${date.toISOString().slice(0, 10)}`);
        // if (!annule) setLogs(res.logs || []);
        if (!annule) setLogs([]);
        if (!annule) setErreur(null);
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : "Impossible de charger le journal.");
      } finally {
        if (!annule) setChargement(false);
      }
    }
    charger();
    return () => { annule = true; };
  }, [date]);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Sécurité &amp; logs</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Actions irréfutables et non modifiables</div>
        </div>
        <HistoriqueButton label="Historique complet" entrees={[]} />
      </div>
      <div className="mb-4"><DateNav date={date} onChange={setDate} /></div>

      <Panel title="Journal des actions sensibles">
        {erreur && <p className="px-[18px] py-4 text-[13px] text-red font-medium">{erreur}</p>}
        <div className="max-h-[420px] overflow-y-auto">
<table className="w-full">
          <thead><tr>{["Horodatage", "Action", "Auteur", "IP"].map((h) => <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px] font-mono">{date.toLocaleDateString("fr-FR")} {l.horodatage}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{l.action}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{l.auteur}</td>
                <td className="px-[18px] py-2.5 text-[13px] font-mono">{l.ip}</td>
              </tr>
            ))}
            {!chargement && logs.length === 0 && !erreur && (
              <tr><td colSpan={4} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Aucune action enregistrée pour cette date</td></tr>
            )}
            {chargement && (
              <tr><td colSpan={4} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Chargement…</td></tr>
            )}
          </tbody>
        </table>
</div>
      </Panel>
    </div>
  );
}
