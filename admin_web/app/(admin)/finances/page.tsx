"use client";
// BRANCHÉ SUR LE VRAI BACKEND — finances.
//   GET /api/admin/finances/resume?date=YYYY-MM-DD
//   GET /api/admin/finances/serie?jours=7
//   GET /api/admin/finances/transactions?date=YYYY-MM-DD
//
// Le revenu JEGO vient de escrow.montant_jego : déjà net des frais Mobile
// Money et des réductions en points appliquées au moment du paiement.
// La commission moyenne est celle RÉELLEMENT constatée sur les 30 derniers
// jours (marge / prix agence), pas le taux théorique de la grille.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Panel, ExpandableCard, StatCard, Toast } from "@/components/ui";
import DateNav from "@/components/DateNav";
import HistoriqueButton from "@/components/HistoriqueButton";
import { apiFetch } from "@/lib/api";

type PointSerie = { jour: string; valeur: number };
type Detail = { label: string; valeur: string };
type Transaction = {
  id: string; client: string; agence: string;
  paye: number; verse: number; frais: number; marge: number; ref: string;
};
type Resume = {
  revenuMois: string; revenuJour: string; commissionMoyenne: string; remboursementsEnCours: string;
  billetsMois?: string;
  detailRevenuMois: Detail[]; detailRevenuJour: Detail[]; detailRemboursements: Detail[];
};

const resumeVide: Resume = {
  revenuMois: "—", revenuJour: "—", commissionMoyenne: "—", remboursementsEnCours: "—",
  detailRevenuMois: [], detailRevenuJour: [], detailRemboursements: [],
};

function TableDetail({ lignes }: { lignes: Detail[] }) {
  if (lignes.length === 0) return <div className="text-[11px] text-ink-soft">Aucun détail disponible</div>;
  return (
    <table className="w-full text-[12px]"><tbody>
      {lignes.map((l) => (
        <tr key={l.label}><td className="py-1">{l.label}</td><td className="py-1 text-right font-mono">{l.valeur}</td></tr>
      ))}
    </tbody></table>
  );
}

export default function FinancesPage() {
  const [toast, setToast] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  // Mois choisi indépendamment du jour : on consulte souvent le revenu d'un
  // mois entier sans vouloir changer la journée affichée en dessous.
  const [mois, setMois] = useState(() => new Date().toISOString().slice(0, 7));
  const [resume, setResume] = useState<Resume>(resumeVide);
  const [serie, setSerie] = useState<PointSerie[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const max = useMemo(() => Math.max(...serie.map((s) => s.valeur), 1), [serie]);

  const libelleMois = useMemo(() => {
    const [a, m] = mois.split("-");
    return new Date(Number(a), Number(m) - 1, 1)
      .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }, [mois]);

  // "aujourd'hui" seulement si c'est vraiment aujourd'hui, sinon la date lue.
  const libelleJour = useMemo(() => {
    const auj = new Date().toDateString() === date.toDateString();
    return auj ? "aujourd'hui" : date.toLocaleDateString("fr-FR");
  }, [date]);

  useEffect(() => {
    let annule = false;
    async function charger() {
      setChargement(true);
      try {
        const iso = date.toISOString().slice(0, 10);
        const r = await apiFetch(`/api/admin/finances/resume?date=${iso}&mois=${mois}`);
        if (!annule) setResume({ ...resumeVide, ...r });
        const serieRes = await apiFetch(`/api/admin/finances/serie?jours=7&date=${iso}`);
        if (!annule) setSerie(serieRes.serie || []);
        const t = await apiFetch(`/api/admin/finances/transactions?date=${iso}`);
        if (!annule) { setTransactions(t.transactions || []); setErreur(null); }
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : "Impossible de charger les finances.");
      } finally {
        if (!annule) setChargement(false);
      }
    }
    charger();
    return () => { annule = true; };
  }, [date, mois]);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Finances</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Commissionnement, remboursements, revenu JEGO</div>
        </div>
        <HistoriqueButton label="Historique financier" entrees={[]} />
      </div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <DateNav date={date} onChange={setDate} />
        <label className="flex items-center gap-2 text-[12px] text-ink-soft">
          Mois analysé
          <input
            type="month"
            value={mois}
            onChange={(e) => setMois(e.target.value)}
            className="px-2.5 py-1.5 border border-line rounded-lg text-xs bg-transparent"
          />
        </label>
      </div>

      {erreur && <p className="mb-4 text-[13px] text-red font-medium">{erreur}</p>}

      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <ExpandableCard num={resume.revenuMois} label={`Revenu net JEGO — ${libelleMois}`}>
          <TableDetail
            lignes={[
              ...(resume.billetsMois ? [{ label: "Billets vendus", valeur: resume.billetsMois }] : []),
              ...resume.detailRevenuMois,
            ]}
          />
        </ExpandableCard>
        <ExpandableCard num={resume.revenuJour} label={`Revenu net — ${libelleJour}`}>
          <TableDetail lignes={resume.detailRevenuJour} />
        </ExpandableCard>
        <StatCard num={resume.commissionMoyenne} label="Commission moyenne appliquée" />
        <ExpandableCard num={resume.remboursementsEnCours} label="Remboursements en cours">
          <TableDetail lignes={resume.detailRemboursements} />
        </ExpandableCard>
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Panel title={`Revenu net — 7 jours jusqu'au ${date.toLocaleDateString("fr-FR")}`}>
          <div className="px-[18px] py-4">
            {serie.length === 0 ? (
              <div className="h-[160px] flex items-center justify-center text-ink-soft text-[12.5px]">
                {chargement ? "Chargement…" : "Aucune donnée sur la période"}
              </div>
            ) : (
              <svg viewBox="0 0 320 140" className="w-full h-[160px]">
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1="30" y1={10 + i * 30} x2="310" y2={10 + i * 30} style={{ stroke: "rgb(var(--c-line))" }} strokeWidth="1" />
                ))}
                {[0, 1, 2, 3].map((i) => (
                  <text key={i} x="26" y={14 + i * 30} fontSize="7" style={{ fill: "rgb(var(--c-ink-soft))" }} textAnchor="end">
                    {Math.round((max * (3 - i)) / 3 / 1000)}k
                  </text>
                ))}
                {serie.map((s, i) => {
                  const w = 280 / serie.length;
                  const h = (s.valeur / max) * 90;
                  const x = 30 + i * w + w * 0.15;
                  const y = 100 - h;
                  return (
                    <g key={s.jour}>
                      <rect x={x} y={y} width={w * 0.7} height={h} fill={i === serie.length - 1 ? "#2E7D54" : "#6FBE94"} rx="2" />
                      <text x={x + w * 0.35} y="112" fontSize="7" style={{ fill: "rgb(var(--c-ink-soft))" }} textAnchor="middle">{s.jour}</text>
                    </g>
                  );
                })}
                <line x1="30" y1="100" x2="310" y2="100" style={{ stroke: "rgb(var(--c-ink))" }} strokeWidth="1" />
                <line x1="30" y1="10" x2="30" y2="100" style={{ stroke: "rgb(var(--c-ink))" }} strokeWidth="1" />
              </svg>
            )}
          </div>
          <div className="px-[18px] pb-3.5 text-[11px] text-ink-soft">
            Axe vertical : revenu net (FCFA) — axe horizontal : jour. Grille de commissions : <Link href="/frais" className="text-green-700 font-semibold">Configuration des frais →</Link>
          </div>
        </Panel>

        <Panel title="Toutes les transactions">
          <div className="max-h-[280px] overflow-y-auto">
            {transactions.map((t) => (
              <div key={t.id} className="px-[18px] py-3 border-t border-dashed border-line first:border-t-0">
                <div className="flex justify-between text-[12.5px]"><b>{t.client}</b><span className="text-ink-soft">{t.agence}</span></div>
                <div className="flex justify-between text-[11.5px] text-ink-soft mt-1">
                  <span>Payé {t.paye} F · Versé {t.verse} F</span>
                  <span className="font-mono">Marge {t.marge} F</span>
                </div>
                <div className="text-[10.5px] text-ink-soft font-mono mt-0.5">{t.ref}</div>
              </div>
            ))}
            {!chargement && transactions.length === 0 && (
              <div className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Aucune transaction pour cette date</div>
            )}
          </div>
        </Panel>
      </div>
      <Toast message={toast} />
    </div>
  );
}
