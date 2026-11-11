"use client";
// BRANCHÉ SUR LE VRAI BACKEND — finances.
//   GET /api/admin/finances/resume?periode=jour|mois|annee&date=YYYY-MM-DD
//   GET /api/admin/finances/serie?jours=7&date=YYYY-MM-DD
//   GET /api/admin/finances/detail?type=revenu|remboursements&periode=…&date=…
//
// UNE seule période à la fois (jour / mois / année) : tous les blocs
// affichent la même. Le revenu JEGO vient de escrow.montant_jego (déjà net
// des frais Mobile Money et des réductions en points).

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Panel, StatCard, Toast } from "@/components/ui";
import Calendrier from "@/components/Calendrier";
import { apiFetch } from "@/lib/api";

// Date au format AAAA-MM-JJ à partir des composants LOCAUX (pas toISOString,
// qui décale d'un jour dans les fuseaux à l'est de UTC).
const isoLocal = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

type Periode = "jour" | "mois" | "annee";
type PointSerie = { jour: string; valeur: number };
type Resume = {
  revenu: string; billets: string; verseAgences: string; encaisse: string;
  commissionMoyenne: string; remboursementsEnCours: string; remboursementsNb: string;
};
const resumeVide: Resume = {
  revenu: "—", billets: "—", verseAgences: "—", encaisse: "—",
  commissionMoyenne: "—", remboursementsEnCours: "—", remboursementsNb: "0",
};

// ── Détail cliquable : colonnes et mise en forme par type ──────────────
type TypeDetail = "revenu" | "remboursements";
type Colonne = { cle: string; libelle: string; type: "text" | "money" | "percent" | "date" };
type Ligne = Record<string, string | number | null>;

const COLONNES: Record<TypeDetail, Colonne[]> = {
  revenu: [
    { cle: "client", libelle: "Client", type: "text" },
    { cle: "agence", libelle: "Agence", type: "text" },
    { cle: "ref", libelle: "Référence", type: "text" },
    { cle: "paye", libelle: "Payé", type: "money" },
    { cle: "verse", libelle: "Versé agence", type: "money" },
    { cle: "marge", libelle: "Revenu JEGO", type: "money" },
    { cle: "taux", libelle: "Commission", type: "percent" },
    { cle: "date", libelle: "Date", type: "date" },
  ],
  remboursements: [
    { cle: "client", libelle: "Client", type: "text" },
    { cle: "agence", libelle: "Agence", type: "text" },
    { cle: "ref", libelle: "Billet", type: "text" },
    { cle: "motif", libelle: "Motif", type: "text" },
    { cle: "prixBillet", libelle: "Prix billet initial", type: "money" },
    { cle: "montant", libelle: "À rembourser", type: "money" },
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

const cleDate = (d: unknown) => {
  const m = String(d || "").match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  return m ? m[3] + m[2] + m[1] + m[4] + m[5] : "";
};

export default function FinancesPage() {
  const [toast] = useState<string | null>(null);
  const [periode, setPeriode] = useState<Periode>("jour");
  const [date, setDate] = useState(new Date());
  const [pickerOuvert, setPickerOuvert] = useState(false);
  const [resume, setResume] = useState<Resume>(resumeVide);
  const [serie, setSerie] = useState<PointSerie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // ── Modale de détail ──
  const [detail, setDetail] = useState<{ type: TypeDetail; titre: string } | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [detailChargement, setDetailChargement] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<{ cle: string; sens: "asc" | "desc" } | null>(null);

  const max = useMemo(() => Math.max(...serie.map((s) => s.valeur), 1), [serie]);

  const estAujourdhui = new Date().toDateString() === date.toDateString();
  const libellePeriode = useMemo(() => {
    if (periode === "jour") return estAujourdhui ? "aujourd'hui" : date.toLocaleDateString("fr-FR");
    if (periode === "mois") return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return String(date.getFullYear());
  }, [periode, date, estAujourdhui]);

  function decaler(sens: 1 | -1) {
    setDate((d) => {
      const n = new Date(d);
      if (periode === "jour") n.setDate(n.getDate() + sens);
      else if (periode === "mois") n.setMonth(n.getMonth() + sens);
      else n.setFullYear(n.getFullYear() + sens);
      return n;
    });
  }


  useEffect(() => {
    let annule = false;
    async function charger() {
      setChargement(true);
      try {
        const iso = isoLocal(date);
        const r = await apiFetch(`/api/admin/finances/resume?periode=${periode}&date=${iso}`);
        if (!annule) setResume({ ...resumeVide, ...r });
        // Tendance : toujours les 7 derniers jours jusqu'à aujourd'hui.
        const serieRes = await apiFetch(`/api/admin/finances/serie?jours=7&date=${isoLocal(new Date())}`);
        if (!annule) { setSerie(serieRes.serie || []); setErreur(null); }
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : "Impossible de charger les finances.");
      } finally {
        if (!annule) setChargement(false);
      }
    }
    charger();
    return () => { annule = true; };
  }, [periode, date]);

  async function ouvrirDetail(type: TypeDetail, titre: string) {
    setDetail({ type, titre });
    setRecherche("");
    setTri({ cle: "date", sens: "desc" });
    setDetailChargement(true);
    try {
      const iso = isoLocal(date);
      const r = await apiFetch(`/api/admin/finances/detail?type=${type}&periode=${periode}&date=${iso}`);
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
    const champ = detail.type === "remboursements" ? "montant" : "marge";
    return lignesAffichees.reduce((s, l) => s + Number(l[champ] ?? 0), 0);
  }, [detail, lignesAffichees]);

  function trierPar(cle: string) {
    setTri((t) => (t && t.cle === cle ? { cle, sens: t.sens === "asc" ? "desc" : "asc" } : { cle, sens: "desc" }));
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-[22px] tracking-tight">Finances</h1>
        <div className="text-ink-soft text-[13px] mt-0.5">Commissionnement, remboursements, revenu JEGO</div>
      </div>

      {/* Sélecteur de période unique + navigation */}
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {(["jour", "mois", "annee"] as Periode[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border ${periode === p ? "bg-green-700 text-white border-green-700" : "border-line text-ink-soft"}`}
            >
              {p === "jour" ? "Jour" : p === "mois" ? "Mois" : "Année"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => decaler(-1)} className="w-8 h-8 rounded-lg border border-line text-ink-soft hover:bg-off-white flex items-center justify-center">◀</button>

          {/* Date cliquable : ouvre un sélecteur précis selon la période */}
          <div className="relative">
            <button
              onClick={() => setPickerOuvert((o) => !o)}
              title="Choisir la date"
              className="min-w-[160px] px-2 py-1.5 rounded-lg border border-transparent hover:border-line hover:bg-off-white flex items-center justify-center gap-1.5 text-[13.5px] font-semibold capitalize"
            >
              {libellePeriode}
              <span className="text-ink-soft text-[10px] not-italic">▼</span>
            </button>
            {pickerOuvert && (
              <Calendrier
                mode={periode}
                value={date}
                onChange={(d) => { setDate(d); setPickerOuvert(false); }}
                onFermer={() => setPickerOuvert(false)}
              />
            )}
          </div>

          <button onClick={() => decaler(1)} className="w-8 h-8 rounded-lg border border-line text-ink-soft hover:bg-off-white flex items-center justify-center">▶</button>

          {/* Toujours présent (invisible aujourd'hui) : n'apparaît pas en décalant la date */}
          <button
            onClick={() => setDate(new Date())}
            className={`text-[12px] text-green-700 font-semibold hover:underline ml-1 whitespace-nowrap ${estAujourdhui ? "invisible pointer-events-none" : ""}`}
          >
            Revenir à aujourd&apos;hui
          </button>
        </div>
      </div>

      {erreur && <p className="mb-4 text-[13px] text-red font-medium">{erreur}</p>}

      <div className="grid grid-cols-4 gap-3.5 mb-4">
        {/* Revenu net JEGO — cliquable (détail avec commission par billet) */}
        <button onClick={() => ouvrirDetail("revenu", `Revenu net JEGO — ${libellePeriode}`)} className="text-left">
          <StatCard num={resume.revenu} label={`Revenu net JEGO — ${libellePeriode}`} />
        </button>
        {/* Billets vendus — informatif */}
        <StatCard num={resume.billets} label={`Billets vendus — ${libellePeriode}`} />
        {/* Commission moyenne — NON cliquable */}
        <StatCard num={resume.commissionMoyenne} label={`Commission moyenne — ${libellePeriode}`} />
        {/* Remboursements en cours — cliquable */}
        <button onClick={() => ouvrirDetail("remboursements", "Remboursements en cours")} className="text-left">
          <StatCard num={resume.remboursementsEnCours} label={`Remboursements en cours (${resume.remboursementsNb})`} />
        </button>
      </div>

      <Panel title="Revenu net — 7 derniers jours">
        <div className="px-[18px] py-4">
          {serie.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-ink-soft text-[12.5px]">
              {chargement ? "Chargement…" : "Aucune donnée sur la période"}
            </div>
          ) : (
            <svg viewBox="0 0 640 180" className="w-full h-[200px]">
              {[0, 1, 2, 3].map((i) => (
                <line key={i} x1="34" y1={14 + i * 40} x2="628" y2={14 + i * 40} style={{ stroke: "rgb(var(--c-line))" }} strokeWidth="1" />
              ))}
              {[0, 1, 2, 3].map((i) => (
                <text key={i} x="30" y={18 + i * 40} fontSize="9" style={{ fill: "rgb(var(--c-ink-soft))" }} textAnchor="end">
                  {Math.round((max * (3 - i)) / 3 / 1000)}k
                </text>
              ))}
              {serie.map((s, i) => {
                const w = 594 / serie.length;
                const h = (s.valeur / max) * 120;
                const x = 34 + i * w + w * 0.18;
                const y = 134 - h;
                return (
                  <g key={s.jour + i}>
                    <rect x={x} y={y} width={w * 0.64} height={h} fill={i === serie.length - 1 ? "#2E7D54" : "#6FBE94"} rx="3" />
                    <text x={x + w * 0.32} y="150" fontSize="9" style={{ fill: "rgb(var(--c-ink-soft))" }} textAnchor="middle">{s.jour}</text>
                  </g>
                );
              })}
              <line x1="34" y1="134" x2="628" y2="134" style={{ stroke: "rgb(var(--c-ink))" }} strokeWidth="1" />
              <line x1="34" y1="14" x2="34" y2="134" style={{ stroke: "rgb(var(--c-ink))" }} strokeWidth="1" />
            </svg>
          )}
        </div>
        <div className="px-[18px] pb-3.5 text-[11px] text-ink-soft">
          Axe vertical : revenu net (FCFA) — axe horizontal : jour. Grille de commissions : <Link href="/frais" className="text-green-700 font-semibold">Configuration des frais →</Link>
        </div>
      </Panel>

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 py-6 pr-6 pl-[264px]" onClick={() => setDetail(null)}>
          <div className="bg-paper rounded-2xl shadow-card w-full max-w-5xl max-h-[88vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div>
                <h3 className="font-display text-[15px] font-semibold">{detail.titre}</h3>
                <div className="text-[11.5px] text-ink-soft mt-0.5">
                  {lignesAffichees.length} ligne(s)
                  {totalMontant !== null && ` · ${detail.type === "remboursements" ? "à rembourser" : "revenu JEGO"} ${fmtMoney(totalMontant)}`}
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
