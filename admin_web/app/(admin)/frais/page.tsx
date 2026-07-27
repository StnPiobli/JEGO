// ⚠️ DEMO — inputs non branchés. Règle réelle : la valeur spécifique à une agence
// (table configuration_frais) prévaut toujours sur la valeur globale.
import { Topbar, Panel, Badge, BtnMini } from "@/components/ui";

export default function FraisPage() {
  return (
    <div>
      <Topbar
        title="Configuration des frais"
        subtitle="Table configuration_frais — la valeur spécifique à une agence prévaut toujours sur la globale"
      />

      <Panel
        title="Grille globale (toutes agences)"
        action={<span className="text-xs font-semibold text-green-700">🔒 Modification sensible — double validation N0 si N1</span>}
      >
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">Tranche de prix</th>
              <th className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">Commission JEGO</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["0 – 3 000 FCFA", "7%"],
              ["3 001 – 8 000 FCFA", "7%"],
              ["8 001 FCFA et +", "6%"],
            ].map(([tranche, val]) => (
              <tr key={tranche} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]">{tranche}</td>
                <td className="px-[18px] py-2.5">
                  <input defaultValue={val} className="w-[70px] px-1.5 py-1 border border-line rounded-md font-mono text-xs" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-[18px] py-3"><BtnMini variant="primary">Enregistrer la grille globale</BtnMini></div>
      </Panel>

      <div className="mt-4">
        <Panel title="Dérogations par agence" action={<span className="text-xs font-semibold text-green-700 cursor-pointer">+ Ajouter une dérogation</span>}>
          <table className="w-full">
            <thead>
              <tr>
                {["Agence", "Commission appliquée", "Motif", ""].map((h) => (
                  <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]"><b>Touristique Express</b></td>
                <td className="px-[18px] py-2.5 text-[13px] font-mono">6% <Badge color="amber">Dérogation</Badge></td>
                <td className="px-[18px] py-2.5 text-[13px]">Volume élevé — accord partenariat</td>
                <td className="px-[18px] py-2.5"><BtnMini>Modifier</BtnMini></td>
              </tr>
              <tr className="border-t border-line">
                <td colSpan={4} className="px-[18px] py-2.5 text-ink-soft text-xs">
                  Toutes les autres agences suivent la grille globale
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Frais annexes">
          <table className="w-full">
            <tbody>
              <tr className="border-t border-line first:border-t-0">
                <td className="px-[18px] py-2.5 text-[13px]">Frais de sélection de siège (part JEGO)</td>
                <td className="px-[18px] py-2.5"><input defaultValue="200 F" className="w-[70px] px-1.5 py-1 border border-line rounded-md font-mono text-xs" /></td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]">Majoration ticket flexible</td>
                <td className="px-[18px] py-2.5"><input defaultValue="500 F" className="w-[70px] px-1.5 py-1 border border-line rounded-md font-mono text-xs" /></td>
              </tr>
            </tbody>
          </table>
          <div className="px-[18px] py-3"><BtnMini variant="primary">Enregistrer</BtnMini></div>
        </Panel>
      </div>
    </div>
  );
}
