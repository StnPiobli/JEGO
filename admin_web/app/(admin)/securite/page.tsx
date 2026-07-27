// ⚠️ DEMO — logs factices. En vrai : actions irréfutables et non modifiables, écrites en base.
import { Topbar, Panel, BtnMini } from "@/components/ui";

const logs = [
  { horodatage: "15/01 09:14", action: "Validation agence — Voyages Étoile du Sud", auteur: "s.piobli", ip: "41.202.x.x" },
  { horodatage: "15/01 08:52", action: "Désactivation d'urgence — chauffeur R. Fouda", auteur: "s.piobli", ip: "41.202.x.x" },
  { horodatage: "14/01 22:03", action: "⚠️ Tentative de connexion échouée ×3 — compte Nuit Express", auteur: "—", ip: "102.88.x.x" },
];

export default function SecuritePage() {
  return (
    <div>
      <Topbar title="Sécurité & logs" subtitle="Actions irréfutables et non modifiables" />
      <Panel title="Journal des actions sensibles">
        <table className="w-full">
          <thead>
            <tr>
              {["Horodatage", "Action", "Auteur", "IP"].map((h) => (
                <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px] font-mono">{l.horodatage}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{l.action}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{l.auteur}</td>
                <td className="px-[18px] py-2.5 text-[13px] font-mono">{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-[18px] py-3">
          <BtnMini variant="danger">Forcer la déconnexion — compte Nuit Express</BtnMini>
        </div>
      </Panel>
    </div>
  );
}
