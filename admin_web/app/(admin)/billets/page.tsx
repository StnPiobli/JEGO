"use client";
// BRANCHÉ SUR LE VRAI BACKEND — vue globale billets & trajets, toutes agences.
//   GET /api/admin/trajets?date=YYYY-MM-DD
//   GET /api/admin/trajets/resume?date=YYYY-MM-DD
//
// Le "trajet associé" d'un passager est le tronçon qu'il a réellement
// réservé : sur une ligne à arrêts, tous les passagers d'un même bus ne
// font pas le même segment.

import { useEffect, useState } from "react";
import { Panel, Badge, ExpandableCard, BtnMini } from "@/components/ui";
import DateNav from "@/components/DateNav";
import HistoriqueButton from "@/components/HistoriqueButton";
import { apiFetch } from "@/lib/api";

type Passager = {
  nom: string; tel: string; siege: string;
  vente: "app" | "site";
  paiement: string | null; // null si vente au guichet
  origine: "Acheté" | "Billet cadeau";
  trajetAssocie: string; // tronçon réellement réservé
};

type Signalement = { passager: string; motif: string; heure: string };

type Trajet = {
  id: string; trajet: string; agence: string; depart: string; arrivee: string;
  occ: string; statut: string; color: "green" | "amber" | "grey";
  app: number; site: number;
  signalements: Signalement[];
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
};

function estDeNuit(heureDepart: string): boolean {
  const heure = parseInt(heureDepart.slice(0, 2), 10);
  return heure >= 22 || heure < 3;
}
function estExpress(t: Trajet): boolean {
  return t.points_detail.length <= 2;
}
function chaineHoraires(t: Trajet): string {
  const heures = [t.depart];
  if (t.points_detail.length > 2) {
    for (let i = 1; i < t.points_detail.length - 1; i++) {
      const h = t.points_detail[i].heure;
      if (h) heures.push(h);
    }
  }
  if (t.arrivee) heures.push(t.arrivee);
  return heures.join(" → ");
}
const libellesCategorie: Record<Trajet["categorie"], string> = { standard: "Standard", mixte: "Mixte", vip: "VIP" };

type Detail = { label: string; valeur: string };
type Resume = {
  programmes7j: string; tauxRemplissage: string;
  agencesProgrammeCourt: string; trajetsRetardes: string;
  detailProgrammes: Detail[]; detailRemplissage: Detail[];
  detailProgrammeCourt: Detail[]; detailRetardes: Detail[];
};

const resumeVide: Resume = {
  programmes7j: "—", tauxRemplissage: "—", agencesProgrammeCourt: "—", trajetsRetardes: "—",
  detailProgrammes: [], detailRemplissage: [], detailProgrammeCourt: [], detailRetardes: [],
};

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
  const [tri, setTri] = useState<Tri>("recent");
  const [depliés, setDepliés] = useState<Set<string>>(new Set());
  const [signalementsOuvert, setSignalementsOuvert] = useState<string | null>(null);
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [resume, setResume] = useState<Resume>(resumeVide);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    async function charger() {
      setChargement(true);
      try {
        const iso = date.toISOString().slice(0, 10);
        const res = await apiFetch(`/api/admin/trajets?date=${iso}`);
        if (!annule) setTrajets(res.trajets || []);
        const r = await apiFetch(`/api/admin/trajets/resume?date=${iso}`);
        if (!annule) { setResume({ ...resumeVide, ...r }); setErreur(null); }
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : "Impossible de charger les trajets.");
      } finally {
        if (!annule) setChargement(false);
      }
    }
    charger();
    return () => { annule = true; };
  }, [date]);

  function toggleDeplier(id: string) {
    setDepliés((prev) => {
      const copie = new Set(prev);
      if (copie.has(id)) copie.delete(id); else copie.add(id);
      return copie;
    });
  }

  const trajetsTries = [...trajets].sort((a, b) =>
    tri === "recent" ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)
  );

  const trajetOuvert = trajets.find((t) => t.id === signalementsOuvert);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Billets &amp; trajets</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">Vue globale, toutes agences</div>
        </div>
        <HistoriqueButton entrees={[]} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button onClick={() => setTri("recent")} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${tri === "recent" ? "bg-green-700 text-white border-green-700" : "border-line text-ink-soft"}`}>+ récent</button>
          <button onClick={() => setTri("ancien")} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${tri === "ancien" ? "bg-green-700 text-white border-green-700" : "border-line text-ink-soft"}`}>− récent</button>
        </div>
        <DateNav date={date} onChange={setDate} />
      </div>

      {erreur && <p className="mb-4 text-[13px] text-red font-medium">{erreur}</p>}

      <div className="grid grid-cols-4 gap-3.5 mb-4">
        <ExpandableCard num={resume.programmes7j} label="Trajets programmés — 7 prochains jours">
          <TableDetail lignes={resume.detailProgrammes} />
        </ExpandableCard>
        <ExpandableCard num={resume.tauxRemplissage} label="Taux de remplissage moyen">
          <TableDetail lignes={resume.detailRemplissage} />
        </ExpandableCard>
        <ExpandableCard num={resume.agencesProgrammeCourt} label="Agences avec programme < 2 semaines ⚠️">
          <TableDetail lignes={resume.detailProgrammeCourt} />
        </ExpandableCard>
        <ExpandableCard num={resume.trajetsRetardes} label="Trajets retardés aujourd'hui">
          <TableDetail lignes={resume.detailRetardes} />
        </ExpandableCard>
      </div>

      <div className="space-y-3">
        {trajetsTries.map((t) => (
          <Panel key={t.id}>
            <div className="px-[18px] py-3.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <button onClick={() => toggleDeplier(t.id)} className="text-left">
                    <span className="text-ink-soft text-xs mr-1">{depliés.has(t.id) ? "▲" : "▼"}</span>
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
                  </button>
                  <div className="text-[11.5px] text-ink-soft mt-0.5">
                    {t.agence} · {date.toLocaleDateString("fr-FR")} · {t.occ}
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
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {t.signalements.length > 0 ? (
                    <BtnMini variant="danger" onClick={() => setSignalementsOuvert(t.id)}>⚠️ {t.signalements.length} signalement(s)</BtnMini>
                  ) : (
                    <span className="text-ink-soft text-[12px]">Aucun signalement</span>
                  )}
                  <Badge color="grey">{libellesCategorie[t.categorie]}</Badge>
                  {estDeNuit(t.depart) && <Badge color="grey">Nuit</Badge>}
                  {estExpress(t) && <Badge color="grey">Express</Badge>}
                  <Badge color={t.color}>{t.statut}</Badge>
                </div>
              </div>

              {depliés.has(t.id) && (
                <div className="mt-3 pt-3 border-t border-dashed border-line">
                  <div className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-2">
                    Passagers ({t.passagers.length}) — {t.app} app · {t.site} guichet
                  </div>
                  {t.passagers.length === 0 ? (
                    <div className="text-[12.5px] text-ink-soft italic">Aucun passager pour l&apos;instant</div>
                  ) : (
                    <div className="max-h-[240px] overflow-y-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr>{["Passager", "Téléphone", "Siège", "Vente", "Paiement", "Type", "Trajet associé"].map((h) => <th key={h} className="text-left text-[10px] uppercase tracking-wide text-ink-soft py-1.5 pr-3">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {t.passagers.map((p, i) => (
                            <tr key={i} className="border-t border-line">
                              <td className="py-1.5 pr-3">{p.nom}</td>
                              <td className="py-1.5 pr-3 font-mono">{p.tel}</td>
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
              )}
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
              <h3 className="font-display text-[15px] font-semibold">Signalements — {trajetOuvert.trajet}</h3>
              <button onClick={() => setSignalementsOuvert(null)} className="text-ink-soft text-xs">✕</button>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {trajetOuvert.signalements.map((s, i) => (
                <div key={i} className="border border-line rounded-lg px-3 py-2 text-[12.5px]">
                  <div className="flex justify-between"><b>{s.passager}</b><span className="text-ink-soft font-mono text-[11px]">{s.heure}</span></div>
                  <div className="text-ink-soft mt-0.5">{s.motif}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
