"use client";
// ⚠️ DEMO — "Forcer la déconnexion" retiré (aucune mécanique réelle possible,
// pas de système de révocation de token côté backend). Navigateur de date ajouté.

import { useState } from "react";
import { Panel } from "@/components/ui";
import DateNav from "@/components/DateNav";
import HistoriqueButton from "@/components/HistoriqueButton";

const logs = [
  { horodatage: "09:14", action: "Validation agence — Voyages Étoile du Sud", auteur: "s.piobli", ip: "41.202.x.x" },
  { horodatage: "08:52", action: "Désactivation d'urgence — chauffeur R. Fouda (côté agence)", auteur: "s.piobli", ip: "41.202.x.x" },
  { horodatage: "hier 22:03", action: "⚠️ Tentative de connexion échouée ×3 — compte Nuit Express", auteur: "—", ip: "102.88.x.x" },
];

export default function SecuritePage() {
  const [date, setDate] = useState(new Date());

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Sécurité & logs</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Actions irréfutables et non modifiables — démo</div>
        </div>
        <HistoriqueButton label="Historique complet" entrees={[
          { heure: "09:14", action: "Validation agence — Voyages Étoile du Sud", auteur: "s.piobli" },
          { heure: "hier 22:03", action: "Tentative de connexion échouée ×3 — compte Nuit Express", auteur: "—" },
        ]} />
      </div>
      <div className="mb-4"><DateNav date={date} onChange={setDate} /></div>

      <Panel title="Journal des actions sensibles">
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
          </tbody>
        </table>
</div>
      </Panel>
    </div>
  );
}
