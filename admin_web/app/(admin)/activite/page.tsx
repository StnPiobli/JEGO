"use client";
// ⚠️ DEMO — chiffres factices, aucune table de sessions n'existe côté backend.

import { useState } from "react";
import { Panel, StatCard, Badge } from "@/components/ui";
import DateNav from "@/components/DateNav";
import HistoriqueButton from "@/components/HistoriqueButton";

type Periode = "24h" | "7j" | "30j";

const donnees: Record<Periode, { actifs: string; inscrits: string; nouvelles: string; connexions: string; deconnexions: string; retention: string; deltaActifs: string; deltaNouvelles: string }> = {
  "24h": { actifs: "312", inscrits: "4 218", nouvelles: "18", connexions: "540", deconnexions: "498", retention: "68%", deltaActifs: "+4%", deltaNouvelles: "+12%" },
  "7j": { actifs: "1 840", inscrits: "4 218", nouvelles: "96", connexions: "3 210", deconnexions: "3 040", retention: "61%", deltaActifs: "+9%", deltaNouvelles: "+7%" },
  "30j": { actifs: "3 512", inscrits: "4 218", nouvelles: "410", connexions: "14 800", deconnexions: "14 100", retention: "54%", deltaActifs: "+15%", deltaNouvelles: "+22%" },
};

const evenements = [
  { id: 8341, heure: "10:42", evenement: "Inscription", nom: "Sandrine K.", tel: "+237 6 82 xx xx 07", email: "s.kamga@gmail.com", ville: "Douala" },
  { id: 8340, heure: "10:38", evenement: "Connexion", nom: "Jean Dupont", tel: "+237 6 77 xx xx 12", email: "j.dupont@gmail.com", ville: "—" },
  { id: 8339, heure: "10:35", evenement: "Déconnexion", nom: "Aïcha Bello", tel: "+237 6 90 xx xx 45", email: "aicha.bello@yahoo.fr", ville: "—" },
  { id: 8338, heure: "10:29", evenement: "Inscription", nom: "Paul N.", tel: "+237 6 71 xx xx 90", email: "paul.n@outlook.com", ville: "Yaoundé" },
  { id: 8337, heure: "10:20", evenement: "Connexion", nom: "Franck Mbida", tel: "+237 6 55 xx xx 88", email: "f.mbida@outlook.com", ville: "—" },
];

export default function ActivitePage() {
  const [periode, setPeriode] = useState<Periode>("7j");
  const [date, setDate] = useState(new Date());
  const d = donnees[periode];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Utilisateurs & activité</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Démo — aucune table de sessions/analytics n&apos;existe encore côté backend</div>
        </div>
        <HistoriqueButton entrees={[{ heure: "maintenant", action: "Consultation des statistiques", auteur: "s.piobli" }]} />
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

      <div className="grid grid-cols-3 gap-3.5 mb-4">
        <StatCard num={d.actifs} label={`Utilisateurs actifs (${periode})`} delta={{ text: d.deltaActifs + " vs période précédente", up: true }} />
        <StatCard num={d.inscrits} label="Total de comptes inscrits" />
        <StatCard num={d.nouvelles} label={`Nouvelles inscriptions (${periode})`} delta={{ text: d.deltaNouvelles + " vs période précédente", up: true }} />
      </div>
      <div className="grid grid-cols-3 gap-3.5 mb-4">
        <StatCard num={d.connexions} label={`Connexions (${periode})`} />
        <StatCard num={d.deconnexions} label={`Déconnexions / fins de session (${periode})`} />
        <StatCard num={d.retention} label="Taux de retour (utilisateurs revenus)" />
      </div>

      <Panel title="Derniers événements">
        <div className="max-h-[420px] overflow-y-auto">
<table className="w-full">
          <thead>
            <tr>{["ID", "Heure", "Événement", "Utilisateur", "Téléphone", "Email", "Ville"].map((h) => <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {evenements.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[12px] font-mono text-ink-soft">#{e.id}</td>
                <td className="px-[18px] py-2.5 text-[13px] font-mono">{date.toLocaleDateString("fr-FR")} {e.heure}</td>
                <td className="px-[18px] py-2.5"><Badge color={e.evenement === "Inscription" ? "green" : e.evenement === "Connexion" ? "amber" : "grey"}>{e.evenement}</Badge></td>
                <td className="px-[18px] py-2.5 text-[13px]">{e.nom}</td>
                <td className="px-[18px] py-2.5 text-[12.5px] font-mono">{e.tel}</td>
                <td className="px-[18px] py-2.5 text-[12.5px]">{e.email}</td>
                <td className="px-[18px] py-2.5 text-[12.5px] text-ink-soft">{e.ville}</td>
              </tr>
            ))}
          </tbody>
        </table>
</div>
      </Panel>
    </div>
  );
}
