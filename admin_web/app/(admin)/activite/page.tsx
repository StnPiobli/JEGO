"use client";
// PRÊT À BRANCHER — statistiques d'activité utilisateurs.
// Aucune table de sessions/analytics n'existe côté backend aujourd'hui :
// il faudra la créer avant que cette page affiche autre chose que des tirets.
// Routes attendues :
//   GET /api/admin/activite?periode=24h|7j|30j
//     → { actifs, inscrits, nouvelles, connexions, deconnexions, retention,
//         deltaActifs, deltaNouvelles }
//   GET /api/admin/activite/evenements?date=YYYY-MM-DD
//     → { evenements: [{ id, heure, evenement, nom, tel, email, ville }] }

import { useEffect, useState } from "react";
import { Panel, StatCard, Badge } from "@/components/ui";
import DateNav from "@/components/DateNav";
import HistoriqueButton from "@/components/HistoriqueButton";

type Periode = "24h" | "7j" | "30j";

type Stats = {
  actifs: string; inscrits: string; nouvelles: string;
  connexions: string; deconnexions: string; retention: string;
  deltaActifs?: string; deltaNouvelles?: string;
};

type Evenement = {
  id: string; heure: string; evenement: string;
  nom: string; tel: string; email: string; ville: string;
};

const statsVides: Stats = {
  actifs: "—", inscrits: "—", nouvelles: "—",
  connexions: "—", deconnexions: "—", retention: "—",
};

export default function ActivitePage() {
  const [periode, setPeriode] = useState<Periode>("7j");
  const [date, setDate] = useState(new Date());
  const [stats, setStats] = useState<Stats>(statsVides);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    async function charger() {
      setChargement(true);
      try {
        // BRANCHEMENT :
        // const res = await apiFetch(`/api/admin/activite?periode=${periode}`);
        // if (!annule) setStats(res);
        // const ev = await apiFetch(`/api/admin/activite/evenements?date=${date.toISOString().slice(0, 10)}`);
        // if (!annule) setEvenements(ev.evenements || []);
        if (!annule) { setStats(statsVides); setEvenements([]); setErreur(null); }
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : "Impossible de charger les statistiques.");
      } finally {
        if (!annule) setChargement(false);
      }
    }
    charger();
    return () => { annule = true; };
  }, [periode, date]);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Utilisateurs &amp; activité</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Connexions, inscriptions et taux de retour</div>
        </div>
        <HistoriqueButton entrees={[]} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(["24h", "7j", "30j"] as Periode[]).map((p) => (
            <button key={p} onClick={() => setPeriode(p)} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${periode === p ? "bg-green-700 text-white border-green-700" : "border-line text-ink-soft"}`}>
              {p === "24h" ? "Dernières 24h" : p === "7j" ? "7 derniers jours" : "30 derniers jours"}
            </button>
          ))}
        </div>
        <DateNav date={date} onChange={setDate} />
      </div>

      {erreur && <p className="mb-4 text-[13px] text-red font-medium">{erreur}</p>}

      <div className="grid grid-cols-3 gap-3.5 mb-4">
        <StatCard num={stats.actifs} label={`Utilisateurs actifs (${periode})`} delta={stats.deltaActifs ? { text: stats.deltaActifs + " vs période précédente", up: true } : undefined} />
        <StatCard num={stats.inscrits} label="Total de comptes inscrits" />
        <StatCard num={stats.nouvelles} label={`Nouvelles inscriptions (${periode})`} delta={stats.deltaNouvelles ? { text: stats.deltaNouvelles + " vs période précédente", up: true } : undefined} />
      </div>
      <div className="grid grid-cols-3 gap-3.5 mb-4">
        <StatCard num={stats.connexions} label={`Connexions (${periode})`} />
        <StatCard num={stats.deconnexions} label={`Déconnexions / fins de session (${periode})`} />
        <StatCard num={stats.retention} label="Taux de retour (utilisateurs revenus)" />
      </div>

      <Panel title="Derniers événements">
        <div className="max-h-[420px] overflow-y-auto">
<table className="w-full">
          <thead>
            <tr>{["Heure", "Événement", "Utilisateur", "Téléphone", "Email", "Ville"].map((h) => <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {evenements.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px] font-mono">{date.toLocaleDateString("fr-FR")} {e.heure}</td>
                <td className="px-[18px] py-2.5"><Badge color={e.evenement === "Inscription" ? "green" : e.evenement === "Connexion" ? "amber" : "grey"}>{e.evenement}</Badge></td>
                <td className="px-[18px] py-2.5 text-[13px]">{e.nom}</td>
                <td className="px-[18px] py-2.5 text-[12.5px] font-mono">{e.tel}</td>
                <td className="px-[18px] py-2.5 text-[12.5px]">{e.email}</td>
                <td className="px-[18px] py-2.5 text-[12.5px] text-ink-soft">{e.ville}</td>
              </tr>
            ))}
            {!chargement && evenements.length === 0 && !erreur && (
              <tr><td colSpan={6} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Aucun événement pour cette date</td></tr>
            )}
            {chargement && (
              <tr><td colSpan={6} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Chargement…</td></tr>
            )}
          </tbody>
        </table>
</div>
      </Panel>
    </div>
  );
}
