// ⚠️ DEMO — connecter à la génération réelle des rapports (JSON existant + export PDF pdfkit à venir).
import { Topbar, Panel, BtnMini } from "@/components/ui";

export default function RapportsPage() {
  return (
    <div>
      <Topbar title="Rapports & statistiques" subtitle="Génération automatique, export PDF/CSV" />
      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Panel title="Rapports disponibles">
          <table className="w-full">
            <tbody>
              <tr className="border-t border-line first:border-t-0">
                <td className="px-[18px] py-2.5 text-[13px]">Rapport global — décembre 2025</td>
                <td className="px-[18px] py-2.5"><BtnMini>Export PDF</BtnMini><BtnMini>CSV</BtnMini></td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]">Classement agences — décembre 2025</td>
                <td className="px-[18px] py-2.5"><BtnMini>Export PDF</BtnMini><BtnMini>CSV</BtnMini></td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px]">Rapport Touristique Express — décembre</td>
                <td className="px-[18px] py-2.5"><BtnMini>Export PDF</BtnMini></td>
              </tr>
            </tbody>
          </table>
        </Panel>
        <Panel title="Classement agences — décembre">
          <div className="px-[18px] py-3.5">
            <div className="kv"><span>🥇 Touristique Express</span><span className="font-semibold">4.8 ★ · 1 204 billets</span></div>
            <div className="kv"><span>🥈 Nuit Express</span><span className="font-semibold">4.6 ★ · 980 billets</span></div>
            <div className="kv"><span>🥉 Général Voyages</span><span className="font-semibold">4.4 ★ · 875 billets</span></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
