'use client';

// BRANCHÉ SUR LE VRAI BACKEND, sans repli démo.
// GET /api/litiges/mes-litiges, PUT /:id/reponse { reponse } (texte
// uniquement — la route n'accepte pas encore l'upload de fichiers).
// L'agence répond, seul l'admin décide, à n'importe quel moment (pas
// d'attente obligatoire de 48h côté agence).

import { useEffect, useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import { Panel, Badge, BtnMini, ToastDemo } from '../components/ui';
import { apiFetch, API_BASE, getToken } from '../lib/api';

type Litige = {
  id: string;
  numero: string;
  motif: string;
  description: string;
  statut: string;
  niveau: number;
  reponse_agence: string | null;
  decision: string | null;
  gagnant?: string | null;
  cree_le: string;
  escalade_le?: string | null;
  decide_le?: string | null;
  date_decision?: string | null;
  heure_decision?: string | null;
  date_trajet?: string;
  heure_trajet?: string;
  date_ouverture?: string;
  heure_ouverture?: string;
  date_reponse?: string | null;
  heure_reponse?: string | null;
  client?: string;
  numero_voyage?: string;
  collectif?: boolean;
  nb_clients?: number;
  clients?: { nom: string; telephone?: string | null; email?: string | null; troncon?: string | null }[] | null;
  trajet?: string;
  ligne_complete?: string | null;
  montant?: number;
  pieces?: Piece[];
};

type Piece = {
  id: string;
  genre: 'fichier' | 'lien';
  nom: string;
  url: string;
  type?: string | null;
  ajoute_le?: string;
};

export default function LitigesPage() {
  const [litiges, setLitiges] = useState<Litige[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  // Les litiges tranches s'accumulent sans fin : on n'en montre qu'une
  // page, la recherche reste le moyen de retrouver un vieux dossier.
  const [limiteResolus, setLimiteResolus] = useState(20);
  const [filtre, setFiltre] = useState<'tous' | 'attente_agence' | 'attente_jego' | 'resolus'>('tous');
  // Arrivee depuis la page Trajets : on n'affiche que les litiges de ce
  // voyage, au lieu de lacher l'agence dans toute la liste.
  const [voyageCible, setVoyageCible] = useState<string | null>(null);

  // Litige affiche en grand. On garde l'identifiant, pas l'objet : un
  // rechargement des donnees ne laisse pas une fiche perimee ouverte.
  const [litigeVuId, setLitigeVuId] = useState<string | null>(null);
  const [texteReponse, setTexteReponse] = useState('');
  const [lienAjout, setLienAjout] = useState('');
  const [envoiPiece, setEnvoiPiece] = useState(false);
  const [fichiersReponse, setFichiersReponse] = useState<File[]>([]);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  function notifier(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  async function charger(silencieux = false) {
    if (!silencieux) setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch('/api/litiges/mes-litiges');
      setLitiges(data.litiges || []);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Impossible de charger les litiges.');
      if (!silencieux) setLitiges([]);
    } finally {
      if (!silencieux) setChargement(false);
    }
  }

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('voyage');
    if (v) setVoyageCible(v);
  }, []);

  useEffect(() => {
    charger();
    // Sans push temps reel, on relit regulierement : une reponse de JEGO
    // ou un nouveau litige apparait sans avoir a recharger la page.
    const minuterie = setInterval(() => charger(true), 15000);
    return () => clearInterval(minuterie);
  }, []);

  const litigeVu = useMemo(
    () => litiges.find((l) => l.id === litigeVuId) ?? null,
    [litiges, litigeVuId],
  );

  useEffect(() => {
    if (!litigeVuId) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') setLitigeVuId(null); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [litigeVuId]);

  // Un litige collectif ne se resume pas a un nom : on annonce combien
  // de clients sont concernes, les noms sont listes dans la fiche.
  function libelleClients(l: Litige) {
    if (l.collectif && (l.nb_clients ?? 1) > 1) return `${l.nb_clients} clients`;
    return l.client ?? '';
  }

  function badgeStatut(l: Litige) {
    const resolu = l.statut === 'resolu' || l.statut === 'cloture';
    if (resolu) return <Badge color="grey">Résolu</Badge>;
    if (l.reponse_agence) return <Badge color="amber">Réponse envoyée — en attente de décision JEGO</Badge>;
    return <Badge color="red">En attente de ta réponse</Badge>;
  }

  const estResoluL = (l: Litige) => l.statut === 'resolu' || l.statut === 'cloture';
  const litigesVisibles = useMemo(
    () => (voyageCible ? litiges.filter((l) => l.numero_voyage === voyageCible) : litiges),
    [litiges, voyageCible],
  );

  // Sans calendrier, le tri est la seule structure de la page : il doit
  // faire remonter ce qui demande une action. Le delai de reponse court
  // depuis l'ouverture du litige, donc le plus ancien non traite est
  // aussi le plus proche de l'expiration.
  const tps = (v?: string | null) => (v ? new Date(v).getTime() : 0);
  const parUrgence = (a: Litige, b: Litige) => {
    const horsDelai = (a.escalade_le ? 0 : 1) - (b.escalade_le ? 0 : 1);
    return horsDelai !== 0 ? horsDelai : tps(a.cree_le) - tps(b.cree_le);
  };
  // Rien a faire dessus : le recent interesse plus que l'ancien.
  const parRecence = (a: Litige, b: Litige) => tps(b.cree_le) - tps(a.cree_le);
  // Tranches : la derniere decision recue en haut.
  const parDecision = (a: Litige, b: Litige) =>
    (tps(b.decide_le) || tps(b.cree_le)) - (tps(a.decide_le) || tps(a.cree_le));

  const attenteAgence = useMemo(
    () => litigesVisibles.filter((l) => !estResoluL(l) && !l.reponse_agence).sort(parUrgence),
    [litigesVisibles],
  );
  const attenteJego = useMemo(
    () => litigesVisibles.filter((l) => !estResoluL(l) && !!l.reponse_agence).sort(parRecence),
    [litigesVisibles],
  );
  const enCours = useMemo(() => [...attenteAgence, ...attenteJego], [attenteAgence, attenteJego]);
  const resolus = useMemo(
    () => litigesVisibles.filter((l) => estResoluL(l)).sort(parDecision),
    [litigesVisibles],
  );

  // Un seul filtre pilote la liste affichee : « tous » garde les deux
  // sections d'origine, les autres n'en montrent qu'une.
  const listeFiltree = useMemo(() => {
    if (filtre === 'attente_agence') return attenteAgence;
    if (filtre === 'attente_jego') return attenteJego;
    if (filtre === 'resolus') return resolus.slice(0, limiteResolus);
    return litigesVisibles;
  }, [filtre, litigesVisibles, attenteAgence, attenteJego, resolus, limiteResolus]);

  // La recherche traverse tous les statuts (on cherche un dossier, pas
  // un onglet) mais reste bornee au voyage cible s'il y en a un, sinon
  // le bandeau « Litiges du voyage X » mentirait. Elle garde l'ordre de
  // la liste : un dossier a traiter ne passe pas sous un dossier clos.
  // Les champs absents sont ecartes : joints tels quels ils inseraient
  // « undefined » dans le texte cherche, et taper « undefined » sortait
  // alors des litiges au hasard.
  const resultatsRecherche = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return [];
    return [...enCours, ...resolus].filter((l) =>
      [l.numero, l.motif, l.description, l.client, l.trajet, l.numero_voyage]
        .filter(Boolean).join(' ').toLowerCase().includes(terme),
    );
  }, [recherche, enCours, resolus]);

  // Les pieces partent une par une, comme dans la messagerie : un
  // fichier par appel, ou un lien en JSON.
  async function envoyerFichier(litige: Litige, fichier: File) {
    const formulaire = new FormData();
    formulaire.append('fichier', fichier);
    const res = await fetch(`${API_BASE}/api/litiges/${litige.id}/pieces`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() || ''}` },
      body: formulaire,
    });
    const corps = await res.json().catch(() => ({ error: `Erreur HTTP ${res.status}` }));
    if (!res.ok) throw new Error(corps.error || `Erreur HTTP ${res.status}`);
  }

  async function ajouterPieces(litige: Litige) {
    if (fichiersReponse.length === 0 && !lienAjout.trim()) return;
    setEnvoiPiece(true);
    try {
      for (const f of fichiersReponse) await envoyerFichier(litige, f);
      if (lienAjout.trim()) {
        await apiFetch(`/api/litiges/${litige.id}/pieces`, {
          method: 'POST',
          body: JSON.stringify({ lien: lienAjout.trim() }),
        });
      }
      setFichiersReponse([]);
      setLienAjout('');
      await charger();
      notifier('Pièces ajoutées au dossier');
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Envoi impossible');
    } finally {
      setEnvoiPiece(false);
    }
  }

  async function envoyerReponse(litige: Litige) {
    if (!texteReponse.trim()) return;
    setEnvoiEnCours(true);
    try {
      await apiFetch(`/api/litiges/${litige.id}/reponse`, {
        method: 'PUT',
        body: JSON.stringify({ reponse: texteReponse }),
      });
      for (const f of fichiersReponse) await envoyerFichier(litige, f);
      if (lienAjout.trim()) {
        await apiFetch(`/api/litiges/${litige.id}/pieces`, {
          method: 'POST',
          body: JSON.stringify({ lien: lienAjout.trim() }),
        });
      }
      await charger();
      notifier(
        fichiersReponse.length > 0 || lienAjout.trim()
          ? 'Réponse et pièces envoyées à JEGO'
          : 'Réponse envoyée à JEGO',
      );
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setEnvoiEnCours(false);
      setTexteReponse('');
      setFichiersReponse([]);
      setLienAjout('');
    }
  }

  function ListePieces({ pieces }: { pieces?: Piece[] }) {
    if (!pieces || pieces.length === 0) return null;
    return (
      <div className="mb-4">
        <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wide mb-1.5">
          Pièces au dossier ({pieces.length})
        </p>
        <ul className="space-y-1">
          {pieces.map((p) => (
            <li key={p.id} className="text-[13px]">
              <a
                href={p.genre === 'lien' ? p.url : `${API_BASE}${p.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 hover:underline"
              >
                {p.genre === 'lien' ? '🔗' : '📎'} {p.nom}
              </a>
              {p.ajoute_le && <span className="text-[11px] text-ink-soft ml-2">{p.ajoute_le}</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function BoutonVoirPlus() {
    if (resolus.length <= limiteResolus) return null;
    const restants = resolus.length - limiteResolus;
    return (
      <button
        onClick={() => setLimiteResolus((n) => n + 20)}
        className="mt-3 w-full rounded-xl border border-line bg-off-white py-2.5 text-[12px] font-bold text-ink-soft hover:text-green-700"
      >
        Voir plus ({restants} litige{restants > 1 ? 's' : ''} de plus)
      </button>
    );
  }

  // Carte volontairement courte : l'essentiel pour reperer le litige,
  // le reste (recit du client, reponse, decision) s'ouvre en grand.
  function CarteLitige({ litige }: { litige: Litige }) {
    return (
      <Panel>
        <button onClick={() => setLitigeVuId(litige.id)} className="w-full text-left p-5 hover:bg-off-white transition-colors">
          <div className="flex justify-between items-start gap-3 mb-2">
            <b className="font-mono text-xs text-ink-soft">{litige.numero}</b>
            {badgeStatut(litige)}
          </div>
          {(litige.client || litige.trajet) && (
            <p className="text-[13px] font-semibold text-ink mb-0.5">
              {libelleClients(litige)}{litige.client && litige.trajet ? ' · ' : ''}{litige.trajet}{litige.montant ? ` · ${litige.montant} F` : ''}
            </p>
          )}
          <div className="flex items-end justify-between gap-3">
            <p className="text-[12px] text-ink-soft">
              {litige.date_trajet ? `Trajet du ${litige.date_trajet}${litige.heure_trajet ? ` à ${litige.heure_trajet}` : ''}` : ''}
            </p>
            <span className="text-[11px] font-semibold text-green-700 whitespace-nowrap shrink-0">Voir le detail →</span>
          </div>

          {/* L'issue reste lisible sans ouvrir la fiche : c'est
              l'information qu'on cherche en parcourant la liste. */}
          {(litige.statut === 'resolu' || litige.statut === 'cloture') && (
            litige.gagnant === 'agence' ? (
              <div className="mt-3 bg-ok-bg rounded-lg px-3 py-2 text-[12.5px] text-green-700 font-bold">
                Décision JEGO : en votre faveur
              </div>
            ) : (
              <div className="mt-3 bg-red/8 border border-red/20 rounded-lg px-3 py-2 text-[12.5px]">
                <b className="text-red">Litige perdu</b>
                {litige.decision && <p className="text-ink mt-0.5">{litige.decision}</p>}
              </div>
            )
          )}
        </button>
      </Panel>
    );
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Litiges</h1>
            <p className="text-sm text-ink-soft mt-1">Consultation et réponse facultative — la décision finale appartient uniquement à JEGO.</p>
          </div>
        </div>

        {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}

        {voyageCible && (
          <div className="flex items-center gap-3 mb-4 rounded-lg bg-off-white border border-line px-4 py-2.5">
            <span className="text-[12.5px] text-ink">
              Litiges du voyage <span className="font-mono font-semibold">{voyageCible}</span>
            </span>
            <button onClick={() => setVoyageCible(null)} className="ml-auto text-[11px] font-bold text-green-700 hover:underline">
              Voir tous les litiges
            </button>
          </div>
        )}

        <Panel>
          <div className="p-4">
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un litige (numéro, motif, client, trajet)…" className="w-full rounded-lg border border-line bg-off-white px-4 py-2.5 text-[13px]" />
          </div>
        </Panel>

        {recherche.trim() ? (
          <div className="mt-4 space-y-3">
            {resultatsRecherche.length === 0 ? (
              <Panel><div className="p-6 text-[12px] text-ink-soft">Aucun résultat.</div></Panel>
            ) : resultatsRecherche.map((l) => <CarteLitige key={l.id} litige={l} />)}
          </div>
        ) : (
          <>
            <Panel>
              <div className="p-4 flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.14em] text-ink-soft mr-1">Filtre</span>
                {([
                  ['tous', `Tous (${litigesVisibles.length})`],
                  ['attente_agence', `En attente de ta réponse (${attenteAgence.length})`],
                  ['attente_jego', `En attente de décision JEGO (${attenteJego.length})`],
                  ['resolus', `Résolus (${resolus.length})`],
                ] as const).map(([cle, libelle]) => (
                  <button
                    key={cle}
                    onClick={() => setFiltre(cle)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${filtre === cle ? 'bg-ink text-white' : 'bg-off-white border border-line text-ink-soft'}`}
                  >
                    {libelle}
                  </button>
                ))}
              </div>
            </Panel>

            {chargement ? (
              <div className="text-sm text-ink-soft">Chargement…</div>
            ) : (
              filtre === 'tous' ? (
                <>
                  <div className="mb-6 mt-4">
                    <div className="font-display text-[13px] font-semibold uppercase tracking-wide text-ink-soft mb-3">En attente ({enCours.length})</div>
                    {enCours.length === 0 ? (
                      <Panel><div className="p-8 text-center text-[13px] text-ink-soft">Aucun litige en attente</div></Panel>
                    ) : (
                      <div className="space-y-3">{enCours.map((l) => <CarteLitige key={l.id} litige={l} />)}</div>
                    )}
                  </div>
                  <div>
                    <div className="font-display text-[13px] font-semibold uppercase tracking-wide text-ink-soft mb-3">Résolus récemment ({resolus.length})</div>
                    {resolus.length === 0 ? (
                      <Panel><div className="p-8 text-center text-[13px] text-ink-soft">Aucun litige résolu récemment</div></Panel>
                    ) : (
                      <>
                        <div className="space-y-3">{resolus.slice(0, limiteResolus).map((l) => <CarteLitige key={l.id} litige={l} />)}</div>
                        <BoutonVoirPlus />
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-4 space-y-3">
                  {listeFiltree.length === 0 ? (
                    <Panel><div className="p-8 text-center text-[13px] text-ink-soft">Aucun litige dans ce filtre</div></Panel>
                  ) : listeFiltree.map((l) => <CarteLitige key={l.id} litige={l} />)}
                  {filtre === 'resolus' && <BoutonVoirPlus />}
                </div>
              )
            )}
          </>
        )}
      </div>

      {litigeVu && (() => {
        const estResolu = litigeVu.statut === 'resolu' || litigeVu.statut === 'cloture';
        const agenceGagnante = litigeVu.gagnant === 'agence';
        // Le motif est le debut du texte du client : l'afficher au-dessus
        // de ce meme texte donnait deux fois la meme phrase.
        const motifDistinct =
          litigeVu.motif && !litigeVu.description.startsWith(litigeVu.motif.replace(/\.\.\.$/, ''));
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={() => setLitigeVuId(null)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto scroll-mince shadow-xl">
              <div className="bg-gradient-to-br from-green-700 to-green-900 px-7 pt-7 pb-5 rounded-t-3xl sticky top-0 z-10">
                <div className="flex items-start gap-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-mono text-white/70">{litigeVu.numero}</p>
                    <p className="text-[17px] font-display font-bold text-white mt-0.5">
                      {libelleClients(litigeVu)}{litigeVu.client && litigeVu.trajet ? ' · ' : ''}{litigeVu.trajet}
                      {litigeVu.montant ? ` · ${litigeVu.montant} F` : ''}
                    </p>
                    {litigeVu.date_trajet && (
                      <p className="text-[11.5px] text-white/70 mt-0.5">
                        Trajet du {litigeVu.date_trajet}{litigeVu.heure_trajet ? ` à ${litigeVu.heure_trajet}` : ''}
                      </p>
                    )}
                    {/* Le titre annonce le troncon paye par le client ;
                        la ligne complete n'apparait que si elle differe,
                        pour situer ce troncon dans le voyage. */}
                    {litigeVu.ligne_complete && litigeVu.ligne_complete !== litigeVu.trajet && (
                      <p className="text-[11.5px] text-white/70">
                        Ligne complète : {litigeVu.ligne_complete}
                      </p>
                    )}
                    {litigeVu.date_ouverture && (
                      <p className="text-[11.5px] text-white/70">
                        Litige ouvert le {litigeVu.date_ouverture} à {litigeVu.heure_ouverture}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setLitigeVuId(null)} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm shrink-0" aria-label="Fermer">✕</button>
                </div>
              </div>

              <div className="px-7 py-5">
                <div className="mb-4">{badgeStatut(litigeVu)}</div>

                {/* Deux voix, deux couleurs : un filet a gauche suffit,
                    sans encadrer les textes. */}
                <div className="border-l-2 border-l-red pl-3 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-red mb-1">
                    {litigeVu.collectif && (litigeVu.nb_clients ?? 1) > 1
                      ? `Ce que disent les clients — ${litigeVu.nb_clients} plaignants`
                      : `Ce que dit le client${litigeVu.client ? ` — ${litigeVu.client}` : ''}`}
                  </p>
                  {litigeVu.collectif && litigeVu.clients && litigeVu.clients.length > 0 && (
                    <ul className="mb-2 space-y-0.5 max-h-40 overflow-y-auto pr-1">
                      {litigeVu.clients.map((c) => (
                        <li key={c.nom} className="text-[12px] font-semibold text-ink">
                          {c.nom}
                          {c.troncon && <span className="font-normal text-ink-soft"> — {c.troncon}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {motifDistinct && <p className="text-[13px] font-semibold text-ink mb-1">{litigeVu.motif}</p>}
                  <p className="text-[13.5px] text-ink leading-relaxed">{litigeVu.description}</p>
                </div>

                {litigeVu.reponse_agence && (
                  <div className="border-l-2 border-l-green-700 pl-3 mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-green-700 mb-1">
                      Ta réponse{litigeVu.date_reponse ? ` — le ${litigeVu.date_reponse} à ${litigeVu.heure_reponse}` : ''}
                    </p>
                    <p className="text-[13.5px] text-ink leading-relaxed">{litigeVu.reponse_agence}</p>
                  </div>
                )}

                <ListePieces pieces={litigeVu.pieces} />

                {estResolu && (
                  agenceGagnante ? (
                    <div className="bg-ok-bg rounded-xl px-4 py-3 mb-2 text-[13px] text-green-700 font-bold">
                      Décision JEGO : en votre faveur
                    </div>
                  ) : (
                    <div className="bg-red/8 border border-red/20 rounded-xl px-4 py-3 mb-2 text-[13px]">
                      <b className="text-red">Litige perdu</b>
                      {litigeVu.decision && <p className="text-ink mt-1">{litigeVu.decision}</p>}
                    </div>
                  )
                )}

                {!estResolu && litigeVu.reponse_agence && (
                  <div className="mt-2 pt-4 border-t border-dashed border-line">
                    <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wide mb-2">
                      Ajouter une preuve au dossier
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="rounded-lg bg-off-white border border-line text-ink font-bold text-[11px] px-3 py-2 cursor-pointer inline-flex items-center gap-1.5">
                        📎 Choisir des fichiers
                        <input type="file" multiple className="hidden" onChange={(e) => setFichiersReponse(Array.from(e.target.files ?? []))} />
                      </label>
                      {fichiersReponse.length > 0 && <span className="text-[11px] text-ink-soft">{fichiersReponse.length} fichier(s)</span>}
                    </div>
                    <input value={lienAjout} onChange={(e) => setLienAjout(e.target.value)} placeholder="https://… (lien vers une preuve)" className="w-full rounded-lg border border-line bg-off-white px-3 py-2 text-[13px] mb-2" />
                    <BtnMini variant="primary" onClick={() => !envoiPiece && ajouterPieces(litigeVu)}>{envoiPiece ? '…' : 'Ajouter au dossier'}</BtnMini>
                    <p className="text-[11px] text-ink-soft mt-2">PDF ou image (JPEG, PNG, WebP), 8 Mo maximum. JEGO les consulte avant et après sa décision.</p>
                  </div>
                )}

                {!estResolu && !litigeVu.reponse_agence && (
                  <div className="mt-2 pt-4 border-t border-dashed border-line">
                    <textarea value={texteReponse} onChange={(e) => setTexteReponse(e.target.value)} rows={4} placeholder="Ta version des faits…" className="w-full rounded-lg border border-line bg-off-white px-3 py-2 text-[13px] mb-2" />
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="rounded-lg bg-off-white border border-line text-ink font-bold text-[11px] px-3 py-2 cursor-pointer inline-flex items-center gap-1.5">
                        📎 Joindre des fichiers
                        <input type="file" multiple className="hidden" onChange={(e) => setFichiersReponse(Array.from(e.target.files ?? []))} />
                      </label>
                      {fichiersReponse.length > 0 && <span className="text-[11px] text-ink-soft">{fichiersReponse.length} fichier(s)</span>}
                    </div>
                    <input value={lienAjout} onChange={(e) => setLienAjout(e.target.value)} placeholder="https://… (lien vers une preuve, facultatif)" className="w-full rounded-lg border border-line bg-off-white px-3 py-2 text-[13px] mb-2" />
                    {fichiersReponse.length > 0 && (
                      <ul className="mb-3 space-y-0.5">
                        {fichiersReponse.map((f, i) => (
                          <li key={i} className="text-[11px] text-ink-soft flex items-center justify-between">
                            <span>{f.name}</span>
                            <button onClick={() => setFichiersReponse((prev) => prev.filter((_, idx) => idx !== i))} className="text-red text-[10px] font-bold ml-2">retirer</button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <BtnMini variant="primary" onClick={() => !envoiEnCours && envoyerReponse(litigeVu)}>{envoiEnCours ? '…' : 'Envoyer la réponse'}</BtnMini>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      <ToastDemo message={toast} />
    </LayoutAgence>
  );
}
