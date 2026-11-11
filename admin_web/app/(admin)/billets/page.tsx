"use client";
// BRANCHÉ SUR LE VRAI BACKEND — vue globale billets & trajets, toutes agences.
//   GET /api/admin/trajets?date=YYYY-MM-DD
//   GET /api/admin/trajets/resume?date=YYYY-MM-DD
//
// Le "trajet associé" d'un passager est le tronçon qu'il a réellement
// réservé : sur une ligne à arrêts, tous les passagers d'un même bus ne
// font pas le même segment.

import { useEffect, useState } from "react";
import { Panel, Badge, ExpandableCard } from "@/components/ui";
import DateNav from "@/components/DateNav";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatTelephone, dateISOLocale } from "@/lib/format";

type Passager = {
  nom: string; tel: string; siege: string;
  vente: "app" | "site";
  paiement: string | null; // null si vente au guichet
  origine: "Acheté" | "Billet cadeau";
  trajetAssocie: string; // tronçon réellement réservé
};

type Signalement = { passager: string; motif: string; heure: string };

type Avis = { passager: string; note: number; commentaire: string | null; date: string };

type Trajet = {
  id: string; numero?: string; trajet: string; agence: string; depart: string; arrivee: string;
  occ: string; statut: string; statutCode?: string; color: "green" | "amber" | "grey";
  app: number; site: number;
  signalements: Signalement[];
  avis: Avis[];
  passagers: Passager[];
  categorie: "standard" | "mixte" | "vip";
  nom_bus: string;
  chauffeur: string | null;
  prix_base: number;
  prix_bagage_supplementaire: number | null;
  distribution_nourriture: boolean;
  supplement_premium: number | null;
  points_detail: { ville: string; lieu: string | null; heure: string | null }[];
  prix_sections: { depart: string; arrivee: string; prix: number }[];
  nb_litiges?: number;
};

function estDeNuit(heureDepart: string): boolean {
  const heure = parseInt(heureDepart.slice(0, 2), 10);
  return heure >= 22 || heure < 3;
}
function estExpress(t: Trajet): boolean {
  return t.points_detail.length <= 2;
}
const hhmm = (h: string | null | undefined) => (h ? h.slice(0, 5) : "");
function chaineHoraires(t: Trajet): string {
  const heures = [hhmm(t.depart)];
  if (t.points_detail.length > 2) {
    for (let i = 1; i < t.points_detail.length - 1; i++) {
      const h = t.points_detail[i].heure;
      if (h) heures.push(hhmm(h));
    }
  }
  if (t.arrivee) heures.push(hhmm(t.arrivee));
  return heures.filter(Boolean).join(" → ");
}
const libellesCategorie: Record<Trajet["categorie"], string> = { standard: "Standard", mixte: "Mixte", vip: "VIP" };

type Detail = { label: string; valeur: string };
type Resume = {
  tauxRemplissage: string;
  agencesProgrammeCourt: string;
  seuilAlerteJours?: number;
  detailRemplissage: Detail[];
  detailProgrammeCourt: Detail[];
};

const resumeVide: Resume = {
  tauxRemplissage: "—", agencesProgrammeCourt: "—",
  detailRemplissage: [], detailProgrammeCourt: [],
};

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
// De trois ans en arriere a un an devant : de quoi consulter l'historique
// sans dérouler une liste interminable.
const ANNEES = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i);

type Tri = "recent" | "ancien";

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

export default function BilletsPage() {
  const [date, setDate] = useState(new Date());
  const [tri, setTri] = useState<Tri>("ancien");
  const [filtreStatut, setFiltreStatut] = useState<string>("tous");
  const [filtreAgence, setFiltreAgence] = useState<string>("toutes");
  const [trajetVuId, setTrajetVuId] = useState<string | null>(null);
  const [periodeRemplissage, setPeriodeRemplissage] = useState<"jour" | "mois" | "annee">("jour");
  const [moisRemplissage, setMoisRemplissage] = useState(new Date().getMonth());
  const [anneeRemplissage, setAnneeRemplissage] = useState(new Date().getFullYear());
  const [signalementsOuvert, setSignalementsOuvert] = useState<string | null>(null);
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [resume, setResume] = useState<Resume>(resumeVide);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    async function charger(silencieux = false) {
      if (!silencieux) setChargement(true);
      try {
        const iso = dateISOLocale(date);
        const res = await apiFetch(`/api/admin/trajets?date=${iso}`);
        if (!annule) setTrajets(res.trajets || []);
        // Le taux de remplissage a sa propre date : le jour affiche, ou
        // le mois / l'annee choisis dans sa fiche.
        const dateResume = periodeRemplissage === "jour"
          ? date
          : new Date(anneeRemplissage, periodeRemplissage === "mois" ? moisRemplissage : 0, 1);
        const r = await apiFetch(`/api/admin/trajets/resume?date=${dateISOLocale(dateResume)}&periode=${periodeRemplissage}`);
        if (!annule) { setResume({ ...resumeVide, ...r }); setErreur(null); }
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : "Impossible de charger les trajets.");
      } finally {
        if (!annule) setChargement(false);
      }
    }
    charger();
    // Rafraichissement automatique : ce que fait le chauffeur (depart,
    // arrivee, signalement) apparait sans avoir a recharger la page.
    const minuterie = setInterval(() => { charger(true); }, 5000);
    return () => { annule = true; clearInterval(minuterie); };
  }, [date, periodeRemplissage, moisRemplissage, anneeRemplissage]);

  // Fiche ouverte en grand plutot qu'un depli : la liste reste courte
  // quel que soit le nombre de passagers.
  useEffect(() => {
    if (!trajetVuId) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === "Escape") setTrajetVuId(null); };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [trajetVuId]);

  const agencesDispo = Array.from(new Set(trajets.map((t) => t.agence))).sort();
  const trajetsTries = [...trajets]
    .filter((t) => filtreStatut === "tous" || t.statutCode === filtreStatut)
    .filter((t) => filtreAgence === "toutes" || t.agence === filtreAgence)
    // Du plus tot au plus tard, par heure de depart.
    .sort((a, b) => tri === "recent"
      ? b.depart.localeCompare(a.depart)
      : a.depart.localeCompare(b.depart));

  const trajetOuvert = trajets.find((t) => t.id === signalementsOuvert);

  return (
    <div>
      <div className="mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Billets &amp; trajets</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Vue globale, toutes agences</div>
        </div>
      </div>

      {/* Le calendrier commande la page : il passe au-dessus des
          filtres, qui ne portent que sur le jour affiche. */}
      <div className="mb-3"><DateNav date={date} onChange={setDate} /></div>

      <div className="mb-4">
        <div className="flex gap-2 flex-wrap items-center">
          {([["tous", "Tous"], ["programme", "Programmé"], ["en_cours", "En cours"], ["termine", "Terminé"]] as const).map(([code, label]) => (
            <button key={code} onClick={() => setFiltreStatut(code)} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${filtreStatut === code ? "bg-green-700 text-white border-green-700" : "border-line text-ink-soft"}`}>{label}</button>
          ))}
          <select value={filtreAgence} onChange={(e) => setFiltreAgence(e.target.value)} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line text-ink-soft bg-paper">
            <option value="toutes">Toutes les agences</option>
            {agencesDispo.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
          </select>
          <button onClick={() => setTri(tri === "recent" ? "ancien" : "recent")} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line text-ink-soft">
            Heure {tri === "recent" ? "↓" : "↑"}
          </button>
        </div>
      </div>

      {erreur && <p className="mb-4 text-[13px] text-red font-medium">{erreur}</p>}

      {/* Carte compacte et distincte : pleine largeur, elle se
          confondait avec les cartes de trajets juste en dessous. */}
      <div className="mb-5 max-w-[320px]">
        <ExpandableCard
          num={resume.tauxRemplissage}
          label={`Taux de remplissage — ${
            periodeRemplissage === "jour"
              ? "ce jour"
              : periodeRemplissage === "mois"
                ? `${MOIS[moisRemplissage]} ${anneeRemplissage}`
                : anneeRemplissage
          }`}
        >
          {/* Le meme chiffre, vu au jour affiche, ou sur un mois et une
              annee que l'on choisit ici. */}
          <div className="flex flex-wrap gap-2 mb-3">
            {([["jour", "Ce jour"], ["mois", "Un mois"], ["annee", "Une année"]] as const).map(([cle, libelle]) => (
              <button
                key={cle}
                onClick={() => setPeriodeRemplissage(cle)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${periodeRemplissage === cle ? "bg-green-700 text-white border-green-700" : "border-line text-ink-soft"}`}
              >
                {libelle}
              </button>
            ))}
            {periodeRemplissage === "mois" && (
              <select
                value={moisRemplissage}
                onChange={(e) => setMoisRemplissage(Number(e.target.value))}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line text-ink-soft bg-paper"
              >
                {MOIS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            )}
            {periodeRemplissage !== "jour" && (
              <select
                value={anneeRemplissage}
                onChange={(e) => setAnneeRemplissage(Number(e.target.value))}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line text-ink-soft bg-paper"
              >
                {ANNEES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            )}
          </div>
          <TableDetail lignes={resume.detailRemplissage} />
        </ExpandableCard>
      </div>

      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft mb-2">
        Trajets du jour ({trajetsTries.length})
      </div>

      <div className="space-y-3 pb-4">
        {trajetsTries.map((t) => (
          <Panel key={t.id}>
            {/* Trajet termine, annule ou supprime : grise, comme en agence. */}
            {/* Filet de couleur : gris pour un trajet clos, ambre pour
                un trajet en cours, vert pour un trajet a venir. */}
            <div className={`px-[18px] py-3.5 border-l-4 ${
              ["termine", "annule", "supprime"].includes(t.statutCode ?? "")
                ? "border-l-line bg-off-white/60"
                : t.statutCode === "en_cours"
                  ? "border-l-amber"
                  : "border-l-green-600"
            }`}>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setTrajetVuId(t.id)}
                  className={`min-w-0 flex-1 text-left ${["termine", "annule", "supprime"].includes(t.statutCode ?? "") ? "opacity-60" : ""}`}
                >
                  <div>
                    <b className="text-[13.5px]">{chaineHoraires(t)}</b>
                    <span className="text-[13.5px] ml-2">
                      {t.points_detail.length > 0
                        ? t.points_detail.map((p, i, arr) => (
                            <span key={i}>
                              <span className="font-bold text-ink">{p.ville}</span>
                              {p.lieu && <span className="text-ink-soft font-normal"> ({p.lieu})</span>}
                              {i < arr.length - 1 && <span className="text-ink-soft font-normal"> → </span>}
                            </span>
                          ))
                        : <span className="font-bold text-ink">{t.trajet}</span>}
                    </span>
                  </div>
                  {t.numero && (
                    <div className="mt-1 font-mono text-[10px] text-ink-soft">{t.numero}</div>
                  )}
                  <div className="text-[11.5px] text-ink-soft mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 font-semibold px-2 py-0.5 text-[11px] border border-green-300">{t.agence}</span>
                    <span>· {date.toLocaleDateString("fr-FR")} · {t.occ}</span>
                  </div>
                  <div className="text-[11px] text-ink-soft mt-1">
                    <span className="font-semibold text-ink">Chauffeur :</span> {t.chauffeur ?? "non assigné"}
                    {" / "}<span className="font-semibold text-ink">bus :</span> {t.nom_bus}
                    {" / "}<span className="font-semibold text-ink">Prix :</span> {t.prix_base} FCFA
                    {t.categorie === "mixte" && t.supplement_premium != null && t.supplement_premium > 0 && (
                      <>{" / "}<span className="font-semibold text-ink">Premium :</span> +{t.supplement_premium} FCFA</>
                    )}
                    {t.prix_bagage_supplementaire != null && (
                      <>{" / "}<span className="font-semibold text-ink">Bagage :</span> {t.prix_bagage_supplementaire} FCFA</>
                    )}
                    {" / "}<span className="font-semibold text-ink">Repas :</span> {t.distribution_nourriture ? "inclus" : "non inclus"}
                  </div>
                  {t.prix_sections.length > 1 && (
                    <div className="text-[11px] text-ink-soft mt-0.5">
                      <span className="font-semibold text-ink">Sections :</span>{" "}
                      {t.prix_sections.map((s, i) => (
                        <span key={i}>
                          {s.depart} → {s.arrivee} <span className="font-semibold text-ink">{s.prix} FCFA</span>
                          {i < t.prix_sections.length - 1 ? " / " : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
                {/* Colonne fixe, comme cote agence : les badges en haut,
                    puis les signalements, puis les litiges — chacun sur
                    sa ligne, toujours dans cet ordre. */}
                <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    <Badge color="grey">{libellesCategorie[t.categorie]}</Badge>
                    {estDeNuit(t.depart) && <Badge color="grey">Nuit</Badge>}
                    {estExpress(t) && <Badge color="grey">Express</Badge>}
                    {t.statut && <Badge color={t.color}>{t.statut}</Badge>}
                  </div>
                  {t.signalements.length > 0 && (
                    <button
                      onClick={() => setSignalementsOuvert(t.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10.5px] font-bold text-amber-700 hover:bg-amber-500/20 hover:border-amber-500/60 transition-colors whitespace-nowrap"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {t.signalements.length} signalement(s)
                    </button>
                  )}
                  {t.avis && t.avis.length > 0 && (
                    <button
                      onClick={() => setSignalementsOuvert(t.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-off-white px-2.5 py-1 text-[10.5px] font-bold text-ink-soft hover:bg-paper-2 hover:border-ink/30 transition-colors whitespace-nowrap"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-ink/30 shrink-0" />
                      {t.avis.length} avis
                    </button>
                  )}
                  {!!t.nb_litiges && t.nb_litiges > 0 && (
                    <Link
                      href={`/litiges?voyage=${encodeURIComponent(t.id)}`}
                      className="inline-flex items-center gap-1 rounded-full border border-red/40 bg-red/10 px-2.5 py-1 text-[10.5px] font-bold text-red hover:bg-red/20 hover:border-red/60 transition-colors whitespace-nowrap"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red shrink-0" />
                      {t.nb_litiges} litige(s)
                    </Link>
                  )}
                </div>
              </div>

            </div>
          </Panel>
        ))}
        {!chargement && trajets.length === 0 && !erreur && (
          <Panel>
            <div className="px-5 py-10 text-center text-ink-soft text-[13px]">Aucun trajet pour cette date</div>
          </Panel>
        )}
        {chargement && (
          <Panel>
            <div className="px-5 py-10 text-center text-ink-soft text-[13px]">Chargement…</div>
          </Panel>
        )}
      </div>

      {trajetOuvert && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setSignalementsOuvert(null)}>
          <div className="bg-paper rounded-2xl shadow-card p-6 w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-display text-[15px] font-semibold">Signalements &amp; avis — {trajetOuvert.trajet}</h3>
              <button onClick={() => setSignalementsOuvert(null)} className="text-ink-soft text-xs">✕</button>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {trajetOuvert.signalements.length === 0 && (
                <div className="text-ink-soft text-[12px]">Aucun signalement.</div>
              )}
              {trajetOuvert.signalements.map((s, i) => (
                <div key={i} className="border border-line rounded-lg px-3 py-2 text-[12.5px]">
                  <div className="flex justify-between"><b>{s.passager}</b><span className="text-ink-soft font-mono text-[11px]">{s.heure}</span></div>
                  <div className="text-ink-soft mt-0.5">{s.motif}</div>
                </div>
              ))}
            </div>

            {trajetOuvert.avis && trajetOuvert.avis.length > 0 && (
              <>
                <div className="mt-4 mb-2 font-display text-[14px] font-semibold">
                  Avis des voyageurs ({trajetOuvert.avis.length})
                </div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {trajetOuvert.avis.map((a, i) => (
                    <div key={i} className="border border-line rounded-lg px-3 py-2 text-[12.5px]">
                      <div className="flex justify-between">
                        <b>{a.passager}</b>
                        <span className="text-amber-500">{'★'.repeat(Math.round(a.note))}<span className="text-ink-soft">{'★'.repeat(5 - Math.round(a.note))}</span></span>
                      </div>
                      {a.commentaire && <div className="text-ink-soft mt-0.5">« {a.commentaire} »</div>}
                      <div className="text-ink-soft font-mono text-[10px] mt-0.5">{a.date}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    
      {(() => {
        const t = trajetsTries.find((x) => x.id === trajetVuId);
        if (!t) return null;
        return (
          <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-50" onClick={() => setTrajetVuId(null)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-xl">
              <div className="bg-gradient-to-br from-green-700 to-green-900 px-7 pt-7 pb-5 rounded-t-3xl sticky top-0 z-10">
                <div className="flex items-start gap-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[12px] text-white/80">{chaineHoraires(t)}</p>
                    <p className="text-[17px] font-display font-bold text-white mt-0.5">
                      {t.points_detail.length > 0
                        ? t.points_detail.map((p, i, arr) => (
                            <span key={i}>
                              {p.ville}{p.lieu ? ` (${p.lieu})` : ""}{i < arr.length - 1 ? " → " : ""}
                            </span>
                          ))
                        : t.trajet}
                    </p>
                    <p className="text-[11.5px] text-white/70 mt-0.5">
                      {t.agence} · {date.toLocaleDateString("fr-FR")} · {t.occ}
                    </p>
                    <p className="text-[11.5px] text-white/70">
                      Chauffeur : <span className="font-semibold text-white">{t.chauffeur ?? "non assigné"}</span> · bus : {t.nom_bus}
                    </p>
                  </div>
                  <button onClick={() => setTrajetVuId(null)} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm shrink-0" aria-label="Fermer">✕</button>
                </div>
              </div>

              <div className="px-7 py-5">
                <div className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-2">
                  Passagers ({t.passagers.length}) — {t.app} app · {t.site} guichet
                </div>
                {t.passagers.length === 0 ? (
                  <div className="text-[12.5px] text-ink-soft italic">Aucun passager pour l&apos;instant</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr>{["Passager", "Téléphone", "Siège", "Vente", "Paiement", "Type", "Trajet associé"].map((h) => <th key={h} className="text-left text-[10px] uppercase tracking-wide text-ink-soft py-1.5 pr-3">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {t.passagers.map((p, i) => (
                          <tr key={i} className="border-t border-line">
                            <td className="py-1.5 pr-3">{p.nom}</td>
                            <td className="py-1.5 pr-3 font-mono whitespace-nowrap">{formatTelephone(p.tel)}</td>
                            <td className="py-1.5 pr-3 font-mono">{p.siege}</td>
                            <td className="py-1.5 pr-3">
                              <Badge color={p.vente === "app" ? "green" : "grey"}>{p.vente === "app" ? "App JEGO" : "Guichet"}</Badge>
                            </td>
                            <td className="py-1.5 pr-3">{p.paiement ?? "—"}</td>
                            <td className="py-1.5 pr-3">
                              <Badge color={p.origine === "Billet cadeau" ? "purple" : "grey"}>{p.origine}</Badge>
                            </td>
                            <td className="py-1.5 pr-3 text-purple font-semibold">{p.trajetAssocie}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
