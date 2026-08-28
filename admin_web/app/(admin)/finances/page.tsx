"use client";
// BRANCHÉ SUR LE VRAI BACKEND — finances.
//   GET /api/admin/finances/resume?date=YYYY-MM-DD&mois=YYYY-MM
//   GET /api/admin/finances/serie?jours=7&date=YYYY-MM-DD
//   GET /api/admin/finances/transactions?date=YYYY-MM-DD
//   GET /api/admin/finances/detail?type=…&date=…&mois=…   ← liste complète cliquable
//
// Le revenu JEGO vient de escrow.montant_jego : déjà net des frais Mobile
// Money et des réductions en points appliquées au moment du paiement.
// La commission moyenne est celle RÉELLEMENT constatée sur les 30 derniers
// jours (marge / prix agence), pas le taux théorique de la grille.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Panel, StatCard, Toast } from "@/components/ui";
import DateNav from "@/components/DateNav";
import HistoriqueButton from "@/components/HistoriqueButton";
import { apiFetch } from "@/lib/api";

type PointSerie = { jour: string; valeur: number };
type Transaction = {
  id: string; client: string; agence: string;
  paye: number; verse: number; frais: number; marge: number; ref: string;
};
type Resume = {
  revenuMois: string; revenuJour: string; commissionMoyenne: string; remboursementsEnCours: string;
  billetsMois?: string;
};

const resumeVide: Resume = {
  revenuMois: "—", revenuJour: "—", commissionMoyenne: "—", remboursementsEnCours: "—",
};

// ── Détail cliquable : colonnes et mise en forme par type ──────────────
type TypeDetail = "revenu_mois" | "revenu_jour" | "commission" | "remboursements";
type Colonne = { cle: string; libelle: string; type: "text" | "money" | "percent" | "date" };
type Ligne = Record<string, string | number | null>;

const COLONNES: Record<TypeDetail, Colonne[]> = {
  revenu_mois: [
    { cle: "client", libelle: "Client", type: "text" },
    { cle: "agence", libelle: "Agence", type: "text" },
    { cle: "ref", libelle: "Référence", type: "text" },
    { cle: "paye", libelle: "Payé", type: "money" },
    { cle: "verse", libelle: "Versé agence", type: "money" },
    { cle: "marge", libelle: "Revenu JEGO", type: "money" },
    { cle: "date", libelle: "Date", type: "date" },
  ],
  revenu_jour: [
    { cle: "client", libelle: "Client", type: "text" },
    { cle: "agence", libelle: "Agence", type: "text" },
    { cle: "ref", libelle: "Référence", type: "text" },
    { cle: "paye", libelle: "Payé", type: "money" },
    { cle: "verse", libelle: "Versé agence", type: "money" },
    { cle: "marge", libelle: "Revenu JEGO", type: "money" },
    { cle: "date", libelle: "Date", type: "date" },
  ],
  commission: [
    { cle: "client", libelle: "Client", type: "text" },
    { cle: "agence", libelle: "Agence", type: "text" },
    { cle: "prixAgence", libelle: "Prix agence", type: "money" },
    { cle: "marge", libelle: "Revenu JEGO", type: "money" },
    { cle: "taux", libelle: "Commission", type: "percent" },
    { cle: "date", libelle: "Date", type: "date" },
  ],
  remboursements: [
    { cle: "client", libelle: "Client", type: "text" },
    { cle: "agence", libelle: "Agence", type: "text" },
    { cle: "ref", libelle: "Billet", type: "text" },
    { cle: "motif", libelle: "Motif", type: "text" },
    { cle: "montant", libelle: "Montant", type: "money" },
    { cle: "date", libelle: "Date", type: "date" },
  ],
};

const fmtMoney = (n: unknown) =>
  n === null || n === undefined || n === "" ? "—" : `${Number(n).toLocaleString("fr-FR")} F`;

function formatCell(col: Colonne, v: string | number | null): string {
  if (col.type === "money") return fmtMoney(v);
  if (col.type === "percent") return v === null || v === undefined ? "—" : `${v} %`;
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

// "JJ/MM/AAAA HH:MM" -> "AAAAMMJJHHMM" pour trier des dates textuelles.
const cleDate = (d: unknown) => {
  const m = String(d || "").match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  return m ? m[3] + m[2] + m[1] + m[4] + m[5] : "";
};

export default function FinancesPage() {
  const [toast] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [mois, setMois] = useState(() => new Date().toISOString().slice(0, 7));
  const [resume, setResume] = useState<Resume>(resumeVide);
  const [serie, setSerie] = useState<PointSerie[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // ── Modale de détail ──
  const [detail, setDetail] = useState<{ type: TypeDetail; titre: string } | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [detailChargement, setDetailChargement] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<{ cle: string; sens: "asc" | "desc" } | null>(null);

  const max = useMemo(() => Math.max(...serie.map((s) => s.valeur), 1), [serie]);

  const libelleMois = useMemo(() => {
    const [a, m] = mois.split("-");
    return new Date(Number(a), Number(m) - 1, 1)
      .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }, [mois]);

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

  async function ouvrirDetail(type: TypeDetail, titre: string) {
    setDetail({ type, titre });
    setRecherche("");
    setTri(type === "commission" ? { cle: "taux", sens: "desc" } : { cle: "date", sens: "desc" });
    setDetailChargement(true);
    try {
      const iso = date.toISOString().slice(0, 10);
      const r = await apiFetch(`/api/admin/finances/detail?type=${type}&date=${iso}&mois=${mois}`);
      setLignes(r.lignes || []);
    } catch {
      setLignes([]);
    } finally {
      setDetailChargement(false);
    }
  }

  const colonnes = detail ? COLONNES[detail.type] : [];
  const lignesAffichees = useMemo(() => {
    let res = lignes;
    const q = recherche.trim().toLowerCase();
    if (q) {
      const champsTexte = colonnes.filter((c) => c.type === "text").map((c) => c.cle);
      res = res.filter((l) => champsTexte.some((c) => String(l[c] ?? "").toLowerCase().includes(q)));
    }
    if (tri) {
      const col = colonnes.find((c) => c.cle === tri.cle);
      res = [...res].sort((a, b) => {
        let cmp: number;
        if (col?.type === "date") cmp = cleDate(a[tri.cle]).localeCompare(cleDate(b[tri.cle]));
        else if (col?.type === "money" || col?.type === "percent") cmp = Number(a[tri.cle] ?? -Infinity) - Number(b[tri.cle] ?? -Infinity);
        else cmp = String(a[tri.cle] ?? "").localeCompare(String(b[tri.cle] ?? ""));
        return tri.sens === "asc" ? cmp : -cmp;
      });
    }
    return res;
  }, [lignes, recherche, tri, colonnes]);

  const totalMontant = useMemo(() => {
    if (!detail) return null;
    const champ = detail.type === "remboursements" ? "montant" : detail.type === "commission" ? "marge" : "marge";
    return lignesAffichees.reduce((s, l) => s + Number(l[champ] ?? 0), 0);
  }, [detail, lignesAffichees]);

  function trierPar(cle: string) {
    setTri((t) => (t && t.cle === cle ? { cle, sens: t.sens === "asc" ? "desc" : "asc" } : { cle, sens: "desc" }));
  }

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
        <button onClick={() => ouvrirDetail("revenu_mois", `Revenu net JEGO — ${libelleMois}`)} className="text-left">
          <StatCard num={resume.revenuMois} label={`Revenu net JEGO — ${libelleMois}`} />
        </button>
        <button onClick={() => ouvrirDetail("revenu_jour", `Revenu net — ${libelleJour}`)} className="text-left">
          <StatCard num={resume.revenuJour} label={`Revenu net — ${libelleJour}`} />
        </button>
        <button onClick={() => ouvrirDetail("commission", "Commission par billet — 30 derniers jours")} className="text-left">
          <StatCard num={resume.commissionMoyenne} label="Commission moyenne appliquée" />
        </button>
        <button onClick={() => ouvrirDetail("remboursements", "Remboursements en cours")} className="text-left">
          <StatCard num={resume.remboursementsEnCours} label="Remboursements en cours" />
        </button>
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

        <Panel
          title="Toutes les transactions"
          action={
            <button onClick={() => ouvrirDetail("revenu_jour", `Revenu net — ${libelleJour}`)} className="text-[12px] font-semibold text-green-700 hover:underline">
              Voir tout →
            </button>
          }
        >
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

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6" onClick={() => setDetail(null)}>
          <div className="bg-paper rounded-2xl shadow-card w-full max-w-5xl max-h-[88vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div>
                <h3 className="font-display text-[15px] font-semibold">{detail.titre}</h3>
                <div className="text-[11.5px] text-ink-soft mt-0.5">
                  {lignesAffichees.length} ligne(s)
                  {detail.type !== "commission" && totalMontant !== null && ` · total ${fmtMoney(totalMontant)}`}
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="text-ink-soft text-sm">✕</button>
            </div>

            <div className="px-5 py-3 border-b border-line flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-1 min-w-[180px] rounded-lg border border-line px-3 py-1.5">
                <span className="text-ink-soft text-[13px]">🔍</span>
                <input
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher (client, agence, motif…)"
                  className="flex-1 text-[12.5px] outline-none bg-transparent"
                />
              </div>
              {recherche && (
                <button onClick={() => setRecherche("")} className="text-[12px] text-ink-soft underline">Effacer</button>
              )}
            </div>

            <div className="overflow-auto">
              {detailChargement ? (
                <div className="px-5 py-8 text-center text-ink-soft text-[13px]">Chargement…</div>
              ) : lignesAffichees.length === 0 ? (
                <div className="px-5 py-8 text-center text-ink-soft text-[13px]">Aucun résultat.</div>
              ) : (
                <table className="w-full min-w-[820px]">
                  <thead>
                    <tr>
                      {colonnes.map((c) => {
                        const triable = c.type !== "text";
                        const actif = tri?.cle === c.cle;
                        const fleche = !triable ? "" : !actif ? " ↕" : tri!.sens === "asc" ? " ↑" : " ↓";
                        return (
                          <th key={c.cle} className={`text-left text-[10px] uppercase tracking-wide text-ink-soft px-4 py-2 font-semibold ${c.type === "money" || c.type === "percent" ? "text-right" : ""}`}>
                            {triable ? (
                              <button onClick={() => trierPar(c.cle)} className="uppercase tracking-wide hover:text-ink">
                                {c.libelle}{fleche}
                              </button>
                            ) : c.libelle}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {lignesAffichees.map((l, i) => (
                      <tr key={i} className="border-t border-line">
                        {colonnes.map((c) => (
                          <td key={c.cle} className={`px-4 py-2 text-[12px] ${c.type === "money" || c.type === "percent" ? "text-right font-mono" : c.type === "date" ? "text-ink-soft font-mono whitespace-nowrap" : ""}`}>
                            {formatCell(c, l[c.cle])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      <Toast message={toast} />
    </div>
  );
}
