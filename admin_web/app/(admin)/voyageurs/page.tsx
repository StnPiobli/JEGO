// ⚠️ DEMO — liste de voyageurs factice.
import { Topbar, Panel, Badge, BtnMini } from "@/components/ui";

const voyageurs = [
  { nom: "Jean Dupont", tel: "6 77 xx xx 12", voyages: 14, litiges: 0, statut: "Actif", color: "green" as const },
  { nom: "Aïcha Bello", tel: "6 90 xx xx 45", voyages: 3, litiges: 1, statut: "Actif", color: "green" as const },
  { nom: "Franck Mbida", tel: "6 55 xx xx 88", voyages: 9, litiges: 3, statut: "Banni commentaires", color: "red" as const },
];

export default function VoyageursPage() {
  return (
    <div>
      <Topbar title="Voyageurs" subtitle="4 218 comptes actifs" />
      <Panel
        title="Rechercher un voyageur"
        action={
          <input
            placeholder="Nom, téléphone, email…"
            className="px-2.5 py-1.5 border border-line rounded-lg text-xs w-56"
          />
        }
      >
        <table className="w-full">
          <thead>
            <tr>
              {["Voyageur", "Téléphone", "Voyages", "Litiges", "Statut", ""].map((h) => (
                <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {voyageurs.map((v) => (
              <tr key={v.nom} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]"><b>{v.nom}</b></td>
                <td className="px-[18px] py-2.5 text-[13px] font-mono">{v.tel}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{v.voyages}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{v.litiges}</td>
                <td className="px-[18px] py-2.5"><Badge color={v.color}>{v.statut}</Badge></td>
                <td className="px-[18px] py-2.5"><BtnMini>Voir le profil</BtnMini></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
