// ⚠️ DEMO — le compte à rebours doit être calculé réellement (deadline - now), pas codé en dur.
import { Topbar, Panel, Badge } from "@/components/ui";

export default function LitigesPage() {
  return (
    <div>
      <Topbar title="Litiges" subtitle="Résolution en 3 niveaux — Niveau 2 nécessite ton arbitrage" />
      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Panel title="Niveau 2 — Médiation guidée">
          <div className="px-[18px] py-3.5 space-y-3">
            <div className="border border-line rounded-xl p-3.5">
              <div className="flex justify-between">
                <b className="font-mono text-xs">#JG-L-0072</b>
                <span className="font-mono text-[11px] font-semibold text-red">Réponse agence : 22h restantes</span>
              </div>
              <div className="bg-[#EAE7DD] rounded-md h-1.5 mt-1.5 overflow-hidden">
                <div className="h-full bg-red" style={{ width: "78%" }} />
              </div>
              <p className="text-[13px] mt-2.5 mb-1">
                <b>Client :</b> le chauffeur roulait dangereusement, dépassements répétés.
              </p>
              <p className="text-[13px] text-ink-soft mb-2">
                Trajet : Douala → Yaoundé · Touristique Express · 3 signalements collectifs pendant le trajet (seuil atteint).
              </p>
              <button className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg bg-green-700 text-white">
                Examiner le dossier
              </button>
            </div>
            <div className="border border-line rounded-xl p-3.5">
              <div className="flex justify-between">
                <b className="font-mono text-xs">#JG-L-0069</b>
                <span className="font-mono text-[11px] font-semibold text-green-700">Réponse agence reçue</span>
              </div>
              <p className="text-[13px] mt-2.5 mb-1">
                <b>Client :</b> bus parti avec 1h30 de retard sans annonce.
              </p>
              <p className="text-[13px] text-ink-soft mb-2">
                Agence conteste : retard annoncé dans l&apos;app 20 min avant.
              </p>
              <button className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg bg-green-700 text-white">
                Trancher selon la grille
              </button>
            </div>
          </div>
        </Panel>

        <div>
          <Panel title="Niveau 1 — auto-résolu">
            <table className="w-full">
              <tbody>
                <tr className="border-t border-line first:border-t-0">
                  <td className="px-[18px] py-3 text-[13px]">
                    #JG-L-0065<br /><span className="text-ink-soft text-[11.5px]">Annulation agence</span>
                  </td>
                  <td className="px-[18px] py-3"><Badge color="green">Remboursé 100%</Badge></td>
                </tr>
                <tr className="border-t border-line">
                  <td className="px-[18px] py-3 text-[13px]">
                    #JG-L-0066<br /><span className="text-ink-soft text-[11.5px]">Retard &gt;2h</span>
                  </td>
                  <td className="px-[18px] py-3"><Badge color="green">Remboursé 30%</Badge></td>
                </tr>
                <tr className="border-t border-line">
                  <td className="px-[18px] py-3 text-[13px]">
                    #JG-L-0067<br /><span className="text-ink-soft text-[11.5px]">Client absent</span>
                  </td>
                  <td className="px-[18px] py-3"><Badge color="grey">0% — clos</Badge></td>
                </tr>
              </tbody>
            </table>
          </Panel>
          <div className="mt-4">
            <Panel title="Niveau 3 — cas extrêmes">
              <div className="px-5 py-8 text-center text-ink-soft text-[12.5px]">
                <div className="text-2xl mb-2">🛡️</div>
                Aucun cas extrême en cours
                <br />
                (accident, fraude, mise en danger)
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
