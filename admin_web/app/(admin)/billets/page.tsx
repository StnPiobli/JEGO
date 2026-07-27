// ⚠️ DEMO — trajets factices, à brancher sur la table trajets/reservations réelle.
import { Topbar, Panel, StatCard, Badge } from "@/components/ui";

const trajets = [
  { trajet: "Douala → Yaoundé", agence: "Touristique Express", depart: "15 jan. 07h00", occ: "29/32", statut: "En cours", color: "green" as const },
  { trajet: "Yaoundé → Bertoua", agence: "Nuit Express", depart: "15 jan. 21h00", occ: "18/32", statut: "Retard déclaré +45min", color: "amber" as const },
  { trajet: "Bafoussam → Douala", agence: "Voyages Étoile du Sud", depart: "16 jan. 06h30", occ: "—", statut: "À venir", color: "grey" as const },
];

export default function BilletsPage() {
  return (
    <div>
      <Topbar title="Billets & trajets" subtitle="Vue globale, toutes agences" />
      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <StatCard num="341" label="Trajets programmés — 7 prochains jours" />
        <StatCard num="78%" label="Taux de remplissage moyen" />
        <StatCard num="18" label="Agences avec programme < 2 semaines ⚠️" />
        <StatCard num="6" label="Trajets retardés aujourd'hui" />
      </div>
      <Panel>
        <table className="w-full">
          <thead>
            <tr>
              {["Trajet", "Agence", "Départ", "Occupation", "Statut"].map((h) => (
                <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trajets.map((t) => (
              <tr key={t.trajet + t.depart} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]">{t.trajet}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{t.agence}</td>
                <td className="px-[18px] py-2.5 text-[13px] font-mono">{t.depart}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{t.occ}</td>
                <td className="px-[18px] py-2.5"><Badge color={t.color}>{t.statut}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
