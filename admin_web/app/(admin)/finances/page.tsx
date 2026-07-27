// ⚠️ DEMO — le mini graphe est purement visuel (barres statiques), pas de lib de charts branchée.
import Link from "next/link";
import { Topbar, Panel, StatCard } from "@/components/ui";

const bars = [55, 70, 48, 82, 65, 90, 100];

export default function FinancesPage() {
  return (
    <div>
      <Topbar title="Finances" subtitle="Commissionnement, remboursements, revenu JEGO" />
      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <StatCard num="4,82M F" label="Revenu net JEGO — janvier" delta={{ text: "12% vs décembre", up: true }} />
        <StatCard num="312 450 F" label="Revenu net — aujourd'hui" />
        <StatCard num="7%" label="Commission moyenne appliquée" />
        <StatCard num="184 000 F" label="Remboursements en cours" />
      </div>
      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Panel title="Revenu net — évolution 7 jours">
          <div className="px-[18px] py-4 flex items-end gap-2.5 h-[140px]">
            {bars.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-md ${i === bars.length - 1 ? "bg-green-500" : "bg-green-300"}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="px-[18px] pb-3.5 text-[11px] text-ink-soft">
            La grille de commissions se règle depuis{" "}
            <Link href="/frais" className="text-green-700 font-semibold">
              Configuration des frais →
            </Link>
          </div>
        </Panel>
        <Panel title="Dernière transaction">
          <div className="px-[18px] py-4">
            <div className="kv"><span>Client</span><span className="font-semibold">Jean Dupont</span></div>
            <div className="kv"><span>Agence</span><span className="font-semibold">Touristique Express</span></div>
            <div className="ticket-cut my-2.5" />
            <div className="kv"><span>Payé par client</span><span className="font-mono font-semibold">4 280 F</span></div>
            <div className="kv"><span>Versé à l&apos;agence</span><span className="font-mono font-semibold">4 000 F</span></div>
            <div className="kv"><span>Frais MoMo (1%)</span><span className="font-mono font-semibold">43 F</span></div>
            <div className="kv"><span><b>Marge JEGO nette</b></span><span className="font-mono font-bold">237 F</span></div>
            <div className="text-[11px] text-ink-soft font-mono mt-2">Réf. MTN-789456</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
