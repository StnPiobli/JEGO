// ⚠️ DEMO — la désactivation d'urgence doit passer par une confirmation modale en vrai (action irréversible).
import { Topbar, Panel, Badge, BtnMini } from "@/components/ui";

const chauffeurs = [
  { nom: "Paul Eto'o", agence: "Touristique Express", trajet: "Douala → Yaoundé · 07h00", statut: "Actif", color: "green" as const, action: "desactiver" },
  { nom: "Samuel Nkodo", agence: "Nuit Express", trajet: "Yaoundé → Bertoua · 21h00", statut: "Retard signalé", color: "amber" as const, action: "desactiver" },
  { nom: "Robert Fouda", agence: "Rapid'Bus Cameroun", trajet: "—", statut: "Désactivé (urgence)", color: "red" as const, action: "reactiver" },
];

export default function ChauffeursPage() {
  return (
    <div>
      <Topbar title="Chauffeurs" subtitle="Comptes créés par les agences — désactivation d'urgence possible ici" />
      <Panel>
        <table className="w-full">
          <thead>
            <tr>
              {["Chauffeur", "Agence", "Trajet du jour", "Statut", ""].map((h) => (
                <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chauffeurs.map((c) => (
              <tr key={c.nom} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]"><b>{c.nom}</b></td>
                <td className="px-[18px] py-2.5 text-[13px]">{c.agence}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{c.trajet}</td>
                <td className="px-[18px] py-2.5"><Badge color={c.color}>{c.statut}</Badge></td>
                <td className="px-[18px] py-2.5">
                  {c.action === "desactiver" ? (
                    <BtnMini variant="danger">🚫 Désactivation d&apos;urgence</BtnMini>
                  ) : (
                    <BtnMini>Réactiver</BtnMini>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
