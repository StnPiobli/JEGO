"use client";

// ✅ BRANCHÉ (GET /api/litiges/admin/tous), REPLI DÉMO si injoignable.
// ⚠️ Flux volontairement changé par rapport à un système niveau1→2→3 :
// tous les litiges arrivent directement ici, actionnables immédiatement
// (le backend n'exige déjà aucune réponse d'agence avant que l'admin tranche —
// vérifié dans litigeController.js, "sans effet automatique").
// ⚠️ IMPORTANT : trancherLitige() n'a AUCUN effet automatique sur l'argent —
// "en faveur du client" ici ne déclenche aucun vrai remboursement tant que
// cette logique n'existe pas côté backend. C'est un vrai développement à faire,
// pas juste un réglage d'interface.

import { useEffect, useState } from "react";
import { Panel, Badge, BtnMini } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import TypeToConfirm from "@/components/TypeToConfirm";

type Litige = {
  id: number | string; numero: string; motif: string; description: string;
  statut: string; niveau: number; reponse_agence: string | null; cree_le: string;
  escalade_le?: string | null;
  nom_agence: string; nom_voyageur: string; prenom_voyageur: string;
  // ⚠️ Champs suivants absents de la vraie réponse API actuelle
  // (litigesAdmin() ne les sélectionne pas) — undefined si branché en vrai.
  telephone_voyageur?: string; email_voyageur?: string;
  trajet_nom?: string; trajet_date?: string; ligne_complete?: string | null;
  date_trajet?: string; heure_trajet?: string;
  decision?: string | null; gagnant?: string | null; decide_le?: string | null;
  date_decision?: string | null; heure_decision?: string | null;
  date_ouverture?: string; heure_ouverture?: string;
  date_reponse?: string | null; heure_reponse?: string | null;
  trajet_id?: string;
  pieces?: Piece[];
  collectif?: boolean;
  nb_clients?: number;
  clients?: { nom: string; telephone?: string | null; email?: string | null; troncon?: string | null }[] | null;
};

type Piece = {
  id: string;
  genre: "fichier" | "lien";
  nom: string;
  url: string;
  type?: string | null;
  ajoute_le?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";


export default function LitigesPage() {
  const [litiges, setLitiges] = useState<Litige[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvertId, setOuvertId] = useState<string | number | null>(null);
  const [camp, setCamp] = useState<"agence" | "client" | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState<string | number | null>(null);
  // Litige affiche en grand : on garde l'identifiant, pas l'objet, pour
  // qu'un rechargement ne laisse pas une fiche perimee ouverte.
  const [litigeVuId, setLitigeVuId] = useState<string | number | null>(null);
  const [filtre, setFiltre] = useState<"tous" | "attente_agence" | "a_trancher" | "resolus">("tous");
  const [agenceFiltre, setAgenceFiltre] = useState<string>("toutes");
  const [recherche, setRecherche] = useState("");
  // Les dossiers tranches s'accumulent sans fin : on n'en montre
  // qu'une page, la recherche sert a retrouver les plus anciens.
  const [limiteResolus, setLimiteResolus] = useState(20);
  // Arrivee depuis « Billets & trajets » : on n'affiche que les litiges
  // de ce voyage.
  const [voyageCible, setVoyageCible] = useState<string | null>(null);

  async function charger(silencieux = false) {
    if (!silencieux) setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch("/api/litiges/admin/tous");
      setLitiges(data.litiges || []);
    } catch (err) {
      if (!silencieux) setLitiges([]);
      setErreur(err instanceof Error ? err.message : "Impossible de charger les litiges.");
    } finally {
      if (!silencieux) setChargement(false);
    }
  }

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("voyage");
    if (v) setVoyageCible(v);
  }, []);

  useEffect(() => {
    charger();
    // Sans push temps reel : un nouveau litige ou une reponse d'agence
    // arrive sans qu'on ait a recharger la page.
    const minuterie = setInterval(() => charger(true), 15000);
    return () => clearInterval(minuterie);
  }, []);

  useEffect(() => {
    if (litigeVuId == null) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === "Escape") setLitigeVuId(null); };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [litigeVuId]);

  const litigeVu = litiges.find((l) => l.id === litigeVuId) ?? null;

  const estTranche = (l: Litige) => l.statut === "resolu" || l.statut === "cloture";
  // Un litige escalade est a trancher meme si l'agence n'a jamais
  // repondu : c'est justement pour cela que le delai a expire.
  const aTrancher = (l: Litige) => !estTranche(l) && (!!l.reponse_agence || !!l.escalade_le);
  const agences = Array.from(new Set(litiges.map((l) => l.nom_agence))).sort();

  // Sans calendrier, le tri porte seul la structure de la page. Ordre :
  // ce que JEGO doit trancher (hors delai en tete, puis le plus ancien,
  // car le dossier le plus vieux est le plus urgent), puis ce qui attend
  // encore l'agence, puis les dossiers clos par decision la plus recente.
  const tps = (v?: string | null) => (v ? new Date(v).getTime() : 0);
  const rang = (l: Litige) => (estTranche(l) ? 2 : aTrancher(l) ? 0 : 1);
  const comparer = (a: Litige, b: Litige) => {
    const r = rang(a) - rang(b);
    if (r !== 0) return r;
    if (rang(a) === 0) {
      const horsDelai = (a.escalade_le ? 0 : 1) - (b.escalade_le ? 0 : 1);
      return horsDelai !== 0 ? horsDelai : tps(a.cree_le) - tps(b.cree_le);
    }
    if (rang(a) === 1) return tps(b.cree_le) - tps(a.cree_le);
    return (tps(b.decide_le) || tps(b.cree_le)) - (tps(a.decide_le) || tps(a.cree_le));
  };

  // Le voyage cible et l'agence choisie sont des perimetres explicites :
  // la recherche reste dedans. Elle ignore en revanche le filtre de
  // statut — on cherche un dossier, pas un onglet. Les champs absents
  // sont ecartes, sinon « undefined » entrait dans le texte cherche.
  const terme = recherche.trim().toLowerCase();
  const perimetre = litiges.filter((l) => {
    if (voyageCible && l.trajet_id !== voyageCible) return false;
    if (agenceFiltre !== "toutes" && l.nom_agence !== agenceFiltre) return false;
    return true;
  });
  const litigesFiltres = perimetre
    .filter((l) => {
      if (terme) {
        return [l.numero, l.motif, l.description, l.nom_agence, l.trajet_nom,
                `${l.prenom_voyageur ?? ""} ${l.nom_voyageur ?? ""}`.trim()]
          .filter(Boolean).join(" ").toLowerCase().includes(terme);
      }
      if (filtre === "resolus") return estTranche(l);
      if (filtre === "attente_agence") return !estTranche(l) && !aTrancher(l);
      if (filtre === "a_trancher") return aTrancher(l);
      return true;
    })
    .sort(comparer);

  // Les dossiers clos sont en fin de tri : on n'en affiche qu'une page.
  const ouverts = litigesFiltres.filter((l) => !estTranche(l));
  const tranches = litigesFiltres.filter(estTranche);
  const litigesAffiches = terme ? litigesFiltres : [...ouverts, ...tranches.slice(0, limiteResolus)];
  const restantsTranches = terme ? 0 : tranches.length - limiteResolus;

  const compte = (f: typeof filtre) =>
    perimetre.filter((l) => {
      if (f === "resolus") return estTranche(l);
      if (f === "attente_agence") return !estTranche(l) && !aTrancher(l);
      if (f === "a_trancher") return aTrancher(l);
      return true;
    }).length;

  // Le motif est le debut du texte ecrit par le client : l'afficher
  // au-dessus de ce meme texte donnait deux fois la meme phrase.
  // Un litige collectif ne se resume pas a un nom : on annonce le
  // nombre de clients concernes, les noms sont listes dans la fiche.
  function libelleClients(l: Litige) {
    if (l.collectif && (l.nb_clients ?? 1) > 1) return `${l.nb_clients} clients`;
    return `${l.prenom_voyageur} ${l.nom_voyageur}`;
  }

  function motifDistinct(l: Litige) {
    return !!l.motif && !l.description.startsWith(l.motif.replace(/\.\.\.$/, ""));
  }

  function choisirCamp(id: string | number, c: "agence" | "client") {
    setOuvertId(id);
    setCamp(c);
    setCommentaire("");
  }

  async function trancher(l: Litige) {
    if (!camp) return;
    const gagnant = camp === "agence" ? l.nom_agence : `${l.prenom_voyageur} ${l.nom_voyageur}`;
    const perdant = camp === "agence" ? `${l.prenom_voyageur} ${l.nom_voyageur}` : l.nom_agence;
    if (!commentaire.trim()) { setErreur(`Explique à ${perdant} pourquoi il/elle n'a pas eu gain de cause`); return; }

    // On n'envoie QUE la raison : le camp gagnant est deja porte par
    // `gagnant`. La phrase « En faveur de… » etait recopiee telle quelle
    // chez les deux parties, si bien que le gagnant lisait le reproche
    // adresse au perdant.
    const decisionTexte = commentaire.trim();
    setEnvoiEnCours(l.id);
    try {
      await apiFetch(`/api/litiges/${l.id}/decision`, {
        method: "PUT",
        body: JSON.stringify({
          decision: decisionTexte,
          gagnant: camp === "agence" ? "agence" : "voyageur",
        }),
      });
      await charger();
      setOuvertId(null);
      setCamp(null);
      setCommentaire("");
      setLitigeVuId(null);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la décision");
    } finally {
      setEnvoiEnCours(null);
    }
    void gagnant;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] tracking-tight">Litiges</h1>
          <div className="text-ink-soft text-[13px] mt-0.5">{litiges.length} litige(s) — tous arrivent directement ici pour arbitrage</div>
        </div>
      </div>
      <Panel>
        <div className="px-[18px] py-3">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un litige (numéro, motif, client, agence, trajet)…"
            className="w-full rounded-lg border border-line bg-paper-2 px-4 py-2.5 text-[13px]"
          />
        </div>
      </Panel>
      <div className="mb-4" />

      <Panel>
        <div className="px-[18px] py-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-ink-soft mr-1">Filtre</span>
          {([
            ["tous", "Tous"],
            ["attente_agence", "En attente de complément agence"],
            ["a_trancher", "En attente de ma réponse"],
            ["resolus", "Résolus"],
          ] as const).map(([cle, libelle]) => (
            <button
              key={cle}
              onClick={() => setFiltre(cle)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${filtre === cle ? "bg-ink text-white" : "bg-paper border border-line text-ink-soft"}`}
            >
              {libelle} ({compte(cle)})
            </button>
          ))}
          <select
            value={agenceFiltre}
            onChange={(e) => setAgenceFiltre(e.target.value)}
            className="ml-auto rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-bold text-ink-soft"
          >
            <option value="toutes">Toutes les agences</option>
            {agences.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </Panel>
      <div className="mb-4" />

      {terme && (
        <div className="mb-4 text-[11px] text-ink-soft">
          La recherche parcourt tous les statuts — le filtre ci-dessus est ignoré.
        </div>
      )}

      {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}

      {voyageCible && (
        <div className="flex items-center gap-3 mb-4 rounded-lg border border-line px-4 py-2.5">
          <span className="text-[12.5px]">Litiges d&apos;un seul voyage</span>
          <button onClick={() => setVoyageCible(null)} className="ml-auto text-[11px] font-bold text-green-600 hover:underline">
            Voir tous les litiges
          </button>
        </div>
      )}

      {chargement ? (
        <div className="text-ink-soft text-sm">Chargement…</div>
      ) : litigesAffiches.length === 0 ? (
        <Panel><div className="px-5 py-10 text-center text-ink-soft text-[13px]">{terme ? "Aucun résultat." : "Aucun litige dans ce filtre"}</div></Panel>
      ) : (
        <div className="space-y-3">
          {/* Liste volontairement courte : le dossier complet s'ouvre au
              clic, pour que la page reste lisible quel que soit le
              nombre de litiges. */}
          {litigesAffiches.map((l) => {
            const tranche = estTranche(l);
            return (
              <Panel key={l.id}>
                {/* Dossier clos : fond grise, texte attenue et barre
                    laterale neutre. Dossier ouvert : barre coloree selon
                    l'urgence — on distingue les deux d'un coup d'oeil. */}
                <button
                  onClick={() => setLitigeVuId(l.id)}
                  className={`w-full text-left px-[18px] py-3.5 border-l-4 transition-colors ${
                    tranche
                      ? "border-l-line bg-black/[0.04] text-ink-soft hover:bg-black/[0.06]"
                      : l.escalade_le
                        ? "border-l-red hover:bg-paper-2"
                        : l.reponse_agence
                          ? "border-l-amber hover:bg-paper-2"
                          : "border-l-green-600 hover:bg-paper-2"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <b className="font-mono text-xs">{l.numero}</b>
                      <span className="text-[11px] text-ink-soft ml-2">
                        {l.nom_agence} · {libelleClients(l)}
                      </span>
                      <div className="text-[12px] text-ink-soft mt-1">
                        {l.trajet_nom ?? "—"}
                        {l.date_trajet ? ` · trajet du ${l.date_trajet}${l.heure_trajet ? ` à ${l.heure_trajet}` : ""}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {tranche ? (
                        <Badge color="grey">Tranché</Badge>
                      ) : (
                        <>
                          {l.escalade_le && <Badge color="red">Agence hors délai</Badge>}
                          {l.reponse_agence && <Badge color="amber">L&apos;agence a répondu</Badge>}
                        </>
                      )}
                      <span className={`text-[11px] font-semibold whitespace-nowrap ${tranche ? "text-ink-soft" : "text-green-600"}`}>
                        {tranche ? "Consulter →" : "Ouvrir →"}
                      </span>
                    </div>
                  </div>
                </button>
              </Panel>
            );
          })}
          {restantsTranches > 0 && (
            <button
              onClick={() => setLimiteResolus((n) => n + 20)}
              className="w-full rounded-xl border border-line bg-paper py-2.5 text-[12px] font-bold text-ink-soft hover:text-green-600"
            >
              Voir plus ({restantsTranches} dossier{restantsTranches > 1 ? "s" : ""} tranché{restantsTranches > 1 ? "s" : ""} de plus)
            </button>
          )}
        </div>
      )}

      {litigeVu && (() => {
        const l = litigeVu;
        const tranche = l.statut === "resolu" || l.statut === "cloture";
        return (
          <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-50" onClick={() => setLitigeVuId(null)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-xl">
              <div className="bg-gradient-to-br from-green-700 to-green-900 px-7 pt-7 pb-5 rounded-t-3xl sticky top-0 z-10">
                <div className="flex items-start gap-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[12px] text-white/70">{l.numero}</p>
                    <p className="text-[17px] font-display font-bold text-white mt-0.5">
                      {libelleClients(l)} · {l.trajet_nom ?? "—"}
                    </p>
                    {l.date_trajet && (
                      <p className="text-[11.5px] text-white/70 mt-0.5">
                        Trajet du {l.date_trajet}{l.heure_trajet ? ` à ${l.heure_trajet}` : ""} · {l.nom_agence}
                      </p>
                    )}
                    {/* Le titre annonce le troncon paye par le client ;
                        la ligne complete n'apparait que si elle differe,
                        pour situer ce troncon dans le voyage. */}
                    {l.ligne_complete && l.ligne_complete !== l.trajet_nom && (
                      <p className="text-[11.5px] text-white/70">
                        Ligne complète : {l.ligne_complete}
                      </p>
                    )}
                    {l.date_ouverture && (
                      <p className="text-[11.5px] text-white/70">
                        Litige ouvert le {l.date_ouverture} à {l.heure_ouverture}
                      </p>
                    )}
                  </div>
                  {tranche && <Badge color="grey">Tranché</Badge>}
                  <button onClick={() => setLitigeVuId(null)} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm shrink-0" aria-label="Fermer">✕</button>
                </div>
              </div>

              <div className="px-7 py-5">
                <div className="mb-4">
                  {tranche ? (
                    <Badge color="grey">Tranché</Badge>
                  ) : l.escalade_le ? (
                    <Badge color="red">Agence hors délai</Badge>
                  ) : l.reponse_agence ? (
                    <Badge color="amber">L&apos;agence a répondu</Badge>
                  ) : (
                    <Badge color="green">En attente de complément agence</Badge>
                  )}
                </div>

                {/* Deux voix, deux couleurs : un filet a gauche et un
                    intitule colore suffisent a savoir qui parle, sans
                    encadrer les textes. */}
                <div className="border-l-2 border-l-red pl-3 mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-red mb-1">
                    {l.collectif && (l.nb_clients ?? 1) > 1 ? `Ce que disent les clients — ${l.nb_clients} plaignants` : `Ce que dit le client — ${l.prenom_voyageur} ${l.nom_voyageur}`}
                  </div>
                  {motifDistinct(l) && <p className="text-[13px] font-semibold mb-1">{l.motif}</p>}
                  <p className="text-[13.5px] leading-relaxed">{l.description}</p>
                  {l.collectif && l.clients && l.clients.length > 0 ? (
                    // Beaucoup de plaignants possibles : la liste defile
                    // au lieu d'etirer la fiche sans fin.
                    <ul className="mt-2 space-y-0.5 max-h-44 overflow-y-auto pr-1">
                      {l.clients.map((c) => (
                        <li key={c.nom} className="text-[12px] font-semibold text-ink">
                          {c.nom}
                          {c.troncon && <span className="font-normal text-ink-soft"> — {c.troncon}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[12px] font-semibold text-ink">{l.prenom_voyageur} {l.nom_voyageur}</p>
                  )}
                </div>

                {l.reponse_agence && (
                  <div className="border-l-2 border-l-green-600 pl-3 mb-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-1">
                      Réponse de l&apos;agence — {l.nom_agence}
                      {l.date_reponse ? ` · le ${l.date_reponse} à ${l.heure_reponse}` : ""}
                    </div>
                    <p className="text-[13.5px] leading-relaxed">{l.reponse_agence}</p>
                  </div>
                )}

                {/* Preuves fournies par l'agence : consultables avant la
                    decision comme apres, le dossier reste complet. */}
                {l.pieces && l.pieces.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] uppercase tracking-wide text-ink-soft mb-1.5">
                      Pièces fournies par l&apos;agence ({l.pieces.length})
                    </div>
                    <ul className="space-y-1">
                      {l.pieces.map((p) => (
                        <li key={p.id} className="text-[13px]">
                          <a
                            href={p.genre === "lien" ? p.url : `${API_BASE}${p.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:underline"
                          >
                            {p.genre === "lien" ? "🔗" : "📎"} {p.nom}
                          </a>
                          {p.ajoute_le && <span className="text-[11px] text-ink-soft ml-2">{p.ajoute_le}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tranche ? (
                  <div className="pt-3 border-t border-dashed border-line text-[12.5px]">
                    <div className="font-semibold mb-1">
                      Tranché en faveur {l.gagnant === "agence" ? "de l'agence" : "du client"}
                      {l.date_decision ? ` — le ${l.date_decision} à ${l.heure_decision}` : ""}
                    </div>
                    {l.decision && <p className="text-ink-soft">Raison communiquée au perdant : {l.decision}</p>}
                  </div>
                ) : ouvertId === l.id ? (
                  <div className="pt-3 border-t border-dashed border-line">
                    <div className="text-[12.5px] font-semibold mb-2">
                      Décision : en faveur {camp === "agence" ? "de l'agence" : "du client"}
                    </div>
                    <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">
                      Raison envoyée à {camp === "agence" ? libelleClients(l) : l.nom_agence} — seul le perdant la lit
                    </label>
                    <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-line bg-transparent text-sm mb-2" rows={3} />
                    <TypeToConfirm
                      titre="Confirmer cette décision ?"
                      message="Cette décision est notifiée aux deux parties et ne peut pas être annulée."
                      mot="trancher"
                      onConfirm={() => trancher(l)}
                      trigger={(open) => (
                        <BtnMini variant="primary" onClick={open}>
                          {envoiEnCours === l.id ? "…" : "Confirmer la décision"}
                        </BtnMini>
                      )}
                    />
                    <BtnMini onClick={() => { setOuvertId(null); setCamp(null); }}>Annuler</BtnMini>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-dashed border-line flex gap-1.5">
                    <BtnMini variant="primary" onClick={() => choisirCamp(l.id, "agence")}>En faveur de l&apos;agence</BtnMini>
                    <BtnMini variant="primary" onClick={() => choisirCamp(l.id, "client")}>En faveur du client</BtnMini>
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
