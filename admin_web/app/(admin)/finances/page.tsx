"use client";
// ⚠️ DEMO — cartes dépliables (sauf commission), liste complète des
// transactions avec navigateur de date, graphe avec axes gradués.

import Link from "next/link";
import { useState, useMemo } from "react";
import { Panel, ExpandableCard, StatCard, ToastDemo } from "@/components/ui";
import DateNav from "@/components/DateNav";
import HistoriqueButton from "@/components/HistoriqueButton";

const serie7j = [
  { jour: "Lun", valeur: 210000 }, { jour: "Mar", valeur: 268000 }, { jour: "Mer", valeur: 184000 },
  { jour: "Jeu", valeur: 312000 }, { jour: "Ven", valeur: 248000 }, { jour: "Sam", valeur: 344000 }, { jour: "Dim", valeur: 312450 },
];

const transactionsDemo = [
  { client: "Jean Dupont", agence: "Touristique Express", paye: 4280, verse: 4000, frais: 43, marge: 237, ref: "MTN-789456" },
  { client: "Aïcha Bello", agence: "Nuit Express", paye: 3600, verse: 3348, frais: 36, marge: 216, ref: "OM-445210" },
  { client: "Franck Mbida", agence: "Général Voyages", paye: 5200, verse: 4836, frais: 52, marge: 312, ref: "MTN-789457" },
];

export default function FinancesPage() {
  const [toast, setToast] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const max = useMemo(() => Math.max(...serie7j.map((s) => s.valeur)), []);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Finances</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Commissionnement, remboursements, revenu JEGO — démo</div>
        </div>
        <HistoriqueButton label="Historique financier" entrees={[
          { heure: "10:41", action: "Relevé exporté (démo)", auteur: "s.piobli" },
          { heure: "hier 08:00", action: "Clôture financière du jour — 312 450 F", auteur: "système" },
        ]} />
      </div>
      <div className="mb-4"><DateNav date={date} onChange={setDate} /></div>

      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <ExpandableCard num="4,82M F" label="Revenu net JEGO — janvier">
          <table className="w-full text-[12px]"><tbody>
            <tr><td className="py-1">Touristique Express</td><td className="py-1 text-right font-mono">1,9M F</td></tr>
            <tr><td className="py-1">Nuit Express</td><td className="py-1 text-right font-mono">1,5M F</td></tr>
            <tr><td className="py-1">Général Voyages</td><td className="py-1 text-right font-mono">1,4M F</td></tr>
          </tbody></table>
        </ExpandableCard>
        <ExpandableCard num="312 450 F" label="Revenu net — aujourd'hui">
          <table className="w-full text-[12px]"><tbody>
            <tr><td className="py-1">Billets vendus</td><td className="py-1 text-right font-mono">73</td></tr>
            <tr><td className="py-1">Commission moyenne</td><td className="py-1 text-right font-mono">6,8%</td></tr>
          </tbody></table>
        </ExpandableCard>
        <StatCard num="7%" label="Commission moyenne appliquée" />
        <ExpandableCard num="184 000 F" label="Remboursements en cours">
          <table className="w-full text-[12px]"><tbody>
            <tr><td className="py-1">Annulations agence (100%)</td><td className="py-1 text-right font-mono">120 000 F</td></tr>
            <tr><td className="py-1">Retards &gt;2h (30%)</td><td className="py-1 text-right font-mono">64 000 F</td></tr>
          </tbody></table>
        </ExpandableCard>
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Panel title="Revenu net — évolution 7 jours">
          <div className="px-[18px] py-4">
            <svg viewBox="0 0 320 140" className="w-full h-[160px]">
              {[0, 1, 2, 3].map((i) => (
                <line key={i} x1="30" y1={10 + i * 30} x2="310" y2={10 + i * 30} style={{ stroke: "rgb(var(--c-line))" }} strokeWidth="1" />
              ))}
              {[0, 1, 2, 3].map((i) => (
                <text key={i} x="26" y={14 + i * 30} fontSize="7" style={{ fill: "rgb(var(--c-ink-soft))" }} textAnchor="end">
                  {Math.round((max * (3 - i)) / 3 / 1000)}k
                </text>
              ))}
              {serie7j.map((s, i) => {
                const w = 280 / serie7j.length;
                const h = (s.valeur / max) * 90;
                const x = 30 + i * w + w * 0.15;
                const y = 100 - h;
                return (
                  <g key={s.jour}>
                    <rect x={x} y={y} width={w * 0.7} height={h} fill={i === serie7j.length - 1 ? "#2E7D54" : "#6FBE94"} rx="2" />
                    <text x={x + w * 0.35} y="112" fontSize="7" style={{ fill: "rgb(var(--c-ink-soft))" }} textAnchor="middle">{s.jour}</text>
                  </g>
                );
              })}
              <line x1="30" y1="100" x2="310" y2="100" style={{ stroke: "rgb(var(--c-ink))" }} strokeWidth="1" />
              <line x1="30" y1="10" x2="30" y2="100" style={{ stroke: "rgb(var(--c-ink))" }} strokeWidth="1" />
            </svg>
          </div>
          <div className="px-[18px] pb-3.5 text-[11px] text-ink-soft">
            Axe vertical : revenu net (FCFA) — axe horizontal : jour. Grille de commissions : <Link href="/frais" className="text-green-700 font-semibold">Configuration des frais →</Link>
          </div>
        </Panel>

        <Panel title="Toutes les transactions">
          <div className="max-h-[280px] overflow-y-auto">
            {transactionsDemo.map((t, i) => (
              <div key={i} className="px-[18px] py-3 border-t border-dashed border-line first:border-t-0">
                <div className="flex justify-between text-[12.5px]"><b>{t.client}</b><span className="text-ink-soft">{t.agence}</span></div>
                <div className="flex justify-between text-[11.5px] text-ink-soft mt-1">
                  <span>Payé {t.paye} F · Versé {t.verse} F</span>
                  <span className="font-mono">Marge {t.marge} F</span>
                </div>
                <div className="text-[10.5px] text-ink-soft font-mono mt-0.5">{t.ref}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <ToastDemo message={toast} />
    </div>
  );
}
