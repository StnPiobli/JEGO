"use client";
// PRÊT À BRANCHER — statistiques d'activité utilisateurs.
// Aucune table de sessions/analytics n'existe côté backend aujourd'hui :
// il faudra la créer avant que cette page affiche autre chose que des tirets.
// Routes attendues :
//   GET /api/admin/activite?periode=24h|7j|30j
//     → { actifs, inscrits, nouvelles, connexions, deconnexions, retention,
//         deltaActifs, deltaNouvelles }
//   GET /api/admin/activite/evenements?date=YYYY-MM-DD
//     → { evenements: [{ id, heure, evenement, nom, tel, email, ville }] }

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatTelephone } from "@/lib/format";
import { Panel, StatCard, Badge } from "@/components/ui";
import DateNav from "@/components/DateNav";
import HistoriqueButton from "@/components/HistoriqueButton";

type Periode = "24h" | "7j" | "30j";

type Stats = {
  actifs: string; inscrits: string; nouvelles: string;
  connexions: string; deconnexions: string; retention: string;
  deltaActifs?: string; deltaNouvelles?: string;
};

type Evenement = {
  id: string; heure: string; evenement: string; moyen?: string | null;
  nom: string; tel: string; email: string; ville: string;
};

type LigneDetail = { nom: string; tel: string; email: string; moyen: string; lieu: string; date: string };

const statsVides: Stats = {
  actifs: "—", inscrits: "—", nouvelles: "—",
  connexions: "—", deconnexions: "—", retention: "—",
};

export default function ActivitePage() {
  const [periode, setPeriode] = useState<Periode>("7j");
  const [date, setDate] = useState(new Date());
  const [stats, setStats] = useState<Stats>(statsVides);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [detailOuvert, setDetailOuvert] = useState<{ type: string; titre: string } | null>(null);
  const [detailLignes, setDetailLignes] = useState<LigneDetail[]>([]);
  const [detailChargement, setDetailChargement] = useState(false);
  const [detailRecherche, setDetailRecherche] = useState("");
  const [detailTriDate, setDetailTriDate] = useState<"desc" | "asc" | null>(null);
  const [detailDate, setDetailDate] = useState("");
  const [toutVoir, setToutVoir] = useState(false);

  async function ouvrirDetail(type: string, titre: string) {
    setDetailOuvert({ type, titre });
    setDetailRecherche("");
    setDetailTriDate(null);
    setDetailDate("");
    setDetailChargement(true);
    try {
      const r = await apiFetch(`/api/admin/activite/detail?type=${type}&periode=${periode}`);
      setDetailLignes(r.lignes || []);
    } catch {
      setDetailLignes([]);
    } finally {
      setDetailChargement(false);
    }
  }

  useEffect(() => {
    let annule = false;
    async function charger() {
      setChargement(true);
      try {
        const res = await apiFetch(`/api/admin/activite?periode=${periode}`);
        if (!annule) setStats({ ...statsVides, ...res });
        const ev = await apiFetch(`/api/admin/activite/evenements?date=${date.toISOString().slice(0, 10)}`);
        if (!annule) { setEvenements(ev.evenements || []); setErreur(null); }
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : "Impossible de charger les statistiques.");
      } finally {
        if (!annule) setChargement(false);
      }
    }
    charger();
    return () => { annule = true; };
  }, [periode, date]);

  // Cle de tri a partir de "JJ/MM/AAAA HH:MM" -> "AAAAMMJJHHMM".
  const cleDate = (d: string) => {
    const m = (d || "").match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    return m ? m[3] + m[2] + m[1] + m[4] + m[5] : "";
  };
  const dateFr = detailDate ? detailDate.split("-").reverse().join("/") : "";
  const detailFiltre = detailLignes
    .filter((l) => {
      const q = detailRecherche.trim().toLowerCase();
      const okTexte = !q || [l.nom, l.tel, l.email, l.lieu].some((c) => (c || "").toLowerCase().includes(q));
      const okDate = !dateFr || (l.date || "").startsWith(dateFr);
      return okTexte && okDate;
    })
    .sort((a, b) => {
      if (!detailTriDate) return 0;
      const cmp = cleDate(a.date).localeCompare(cleDate(b.date));
      return detailTriDate === "desc" ? -cmp : cmp;
    });

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Utilisateurs &amp; activité</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Connexions, inscriptions et taux de retour</div>
        </div>
        <HistoriqueButton entrees={[]} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(["24h", "7j", "30j"] as Periode[]).map((p) => (
            <button key={p} onClick={() => setPeriode(p)} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${periode === p ? "bg-green-700 text-white border-green-700" : "border-line text-ink-soft"}`}>
              {p === "24h" ? "Dernières 24h" : p === "7j" ? "7 derniers jours" : "30 derniers jours"}
            </button>
          ))}
        </div>
        <DateNav date={date} onChange={setDate} />
      </div>

      {erreur && <p className="mb-4 text-[13px] text-red font-medium">{erreur}</p>}

      <div className="grid grid-cols-3 gap-3.5 mb-4">
        <button onClick={() => ouvrirDetail("actifs", `Utilisateurs actifs (${periode})`)} className="text-left"><StatCard num={stats.actifs} label={`Utilisateurs actifs (${periode})`} /></button>
        <button onClick={() => ouvrirDetail("inscrits", "Total de comptes inscrits")} className="text-left"><StatCard num={stats.inscrits} label="Total de comptes inscrits" /></button>
        <button onClick={() => ouvrirDetail("nouvelles", `Nouvelles inscriptions (${periode})`)} className="text-left"><StatCard num={stats.nouvelles} label={`Nouvelles inscriptions (${periode})`} /></button>
      </div>
      <div className="grid grid-cols-3 gap-3.5 mb-4">
        <button onClick={() => ouvrirDetail("connexions", `Connexions (${periode})`)} className="text-left"><StatCard num={stats.connexions} label={`Connexions (${periode})`} /></button>
        <button onClick={() => ouvrirDetail("deconnexions", `Déconnexions (${periode})`)} className="text-left"><StatCard num={stats.deconnexions} label={`Déconnexions / fins de session (${periode})`} /></button>
        <button onClick={() => ouvrirDetail("retention", "Utilisateurs revenus")} className="text-left"><StatCard num={stats.retention} label="Taux de retour (utilisateurs revenus)" /></button>
      </div>

      <Panel
        title="Derniers événements"
        action={
          <button
            onClick={() => setToutVoir((v) => !v)}
            className="text-[12px] font-semibold text-green-700 hover:underline"
          >
            {toutVoir ? "Voir moins" : "Voir plus"}
          </button>
        }
      >
        <div className={(toutVoir ? "max-h-[75vh]" : "max-h-[420px]") + " overflow-y-auto"}>
<table className="w-full">
          <thead>
            <tr>{["Heure", "Événement", "Inscription via", "Utilisateur", "Téléphone", "Email", "Lieu"].map((h) => <th key={h} className="text-left text-[10.5px] uppercase tracking-wide text-ink-soft px-[18px] py-2.5 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {evenements.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <td className="px-[18px] py-2.5 text-[13px] font-mono">{date.toLocaleDateString("fr-FR")} {e.heure}</td>
                <td className="px-[18px] py-2.5"><Badge color={e.evenement === "Inscription" ? "green" : e.evenement === "Connexion" ? "amber" : "grey"}>{e.evenement}</Badge></td>
                <td className="px-[18px] py-2.5 text-[12px]">{e.moyen ? <Badge color={e.moyen === "Google" ? "purple" : "grey"}>{e.moyen}</Badge> : <span className="text-ink-soft">—</span>}</td>
                <td className="px-[18px] py-2.5 text-[13px]">{e.nom}</td>
                <td className="px-[18px] py-2.5 text-[12.5px] font-mono whitespace-nowrap">{formatTelephone(e.tel)}</td>
                <td className="px-[18px] py-2.5 text-[12.5px]">{e.email}</td>
                <td className="px-[18px] py-2.5 text-[12.5px] text-ink-soft">{e.ville || "—"}</td>
              </tr>
            ))}
            {!chargement && evenements.length === 0 && !erreur && (
              <tr><td colSpan={7} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Aucun événement pour cette date</td></tr>
            )}
            {chargement && (
              <tr><td colSpan={7} className="px-[18px] py-6 text-center text-ink-soft text-[12.5px]">Chargement…</td></tr>
            )}
          </tbody>
        </table>
</div>
      </Panel>

      {detailOuvert && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6" onClick={() => setDetailOuvert(null)}>
          <div className="bg-paper rounded-2xl shadow-card w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="font-display text-[15px] font-semibold">{detailOuvert.titre} — {detailFiltre.length}{detailFiltre.length !== detailLignes.length ? ` / ${detailLignes.length}` : ""}</h3>
              <button onClick={() => setDetailOuvert(null)} className="text-ink-soft text-sm">✕</button>
            </div>
            <div className="px-5 py-3 border-b border-line flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-1 min-w-[180px] rounded-lg border border-line px-3 py-1.5">
                <span className="text-ink-soft text-[13px]">🔍</span>
                <input
                  value={detailRecherche}
                  onChange={(e) => setDetailRecherche(e.target.value)}
                  placeholder="Rechercher (nom, tel, email, lieu)"
                  className="flex-1 text-[12.5px] outline-none bg-transparent"
                />
              </div>
              <input
                type="date"
                value={detailDate}
                onChange={(e) => setDetailDate(e.target.value)}
                className="text-[12.5px] rounded-lg border border-line px-2.5 py-1.5 text-ink-soft"
              />
              {(detailRecherche || detailDate) && (
                <button onClick={() => { setDetailRecherche(""); setDetailDate(""); }} className="text-[12px] text-ink-soft underline">Effacer</button>
              )}
            </div>
            <div className="overflow-auto">
              {detailChargement ? (
                <div className="px-5 py-8 text-center text-ink-soft text-[13px]">Chargement…</div>
              ) : detailFiltre.length === 0 ? (
                <div className="px-5 py-8 text-center text-ink-soft text-[13px]">Aucun résultat.</div>
              ) : (
                <table className="w-full min-w-[760px]">
                  <thead><tr>
                    {["Utilisateur", "Inscription via", "Téléphone", "Email", "Lieu"].map((h) => <th key={h} className="text-left text-[10px] uppercase tracking-wide text-ink-soft px-4 py-2 font-semibold">{h}</th>)}
                    <th className="text-left text-[10px] uppercase tracking-wide text-ink-soft px-4 py-2 font-semibold">
                      <button onClick={() => setDetailTriDate((t) => (t === "desc" ? "asc" : "desc"))} className="uppercase tracking-wide flex items-center gap-1 hover:text-ink">
                        Date {detailTriDate === "desc" ? "\u2193" : detailTriDate === "asc" ? "\u2191" : "\u2195"}
                      </button>
                    </th>
                  </tr></thead>
                  <tbody>
                    {detailFiltre.map((l, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="px-4 py-2 text-[12.5px]">{l.nom}</td>
                        <td className="px-4 py-2"><Badge color={l.moyen === "Google" ? "purple" : "grey"}>{l.moyen}</Badge></td>
                        <td className="px-4 py-2 text-[12px] font-mono whitespace-nowrap">{formatTelephone(l.tel)}</td>
                        <td className="px-4 py-2 text-[12px]">{l.email}</td>
                        <td className="px-4 py-2 text-[12px] text-ink-soft">{l.lieu || "—"}</td>
                        <td className="px-4 py-2 text-[11.5px] text-ink-soft font-mono">{l.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
