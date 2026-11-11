'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { todayInputDate } from '../lib/date';
import { apiFetch } from '../lib/api';

type Incident = {
  id: string;
  numeroVoyage: string;
  dateDepart: string;        // AAAA-MM-JJ (date réelle du trajet, tz-safe)
  heureDepart: string;       // HH:MM
  dateSignalement: string;   // AAAA-MM-JJ (dépôt du signalement)
  heureSignalement: string;  // HH:MM
  categorie: string;         // id brut (filtre) : 'exces_vitesse'…
  type: 'retard' | 'panne' | 'accident' | 'fraude' | 'autre'; // grossier (couleur badge)
  categorieLabel: string;    // précis (badge) : « Excès de vitesse »…
  trajet: string;            // repli simple « Douala → Yaoundé »
  routeDetail: string;       // « Douala (bar) → Bafoussam (cccc) → Yaoundé (ecole) »
  horaires: string;          // « 02:46 → 17:23 → 23:59 »
  chauffeur: string;
  nbPassagers: number;       // effectif du trajet, pour rapporter les signalements
  passager: string;          // auteur du signalement
  commentaire: string;       // texte libre éventuel ('' si aucun)
};

// Catégories telles qu'elles apparaissent dans l'app mobile (écran
// « Pendant le voyage »). La fausse arrivée n'y figure pas : au seuil,
// elle ouvre un litige et se traite dans la page Litiges.
const CATEGORIES_FILTRE: { id: string; label: string }[] = [
  { id: 'exces_vitesse', label: 'Excès de vitesse' },
  { id: 'conduite_dangereuse', label: 'Conduite dangereuse' },
  { id: 'comportement_inapproprie', label: 'Comportement inapproprié' },
  { id: 'panne_technique', label: 'Panne technique' },
  { id: 'arret_prolonge', label: 'Arrêt prolongé' },
  { id: 'autre', label: 'Autre' },
];

const AUJOURDHUI = todayInputDate();

// Correspondance entre les catégories de signalement du backend et
// les types affichés dans le portail.
const TYPE_PAR_CATEGORIE: Record<string, Incident['type']> = {
  exces_vitesse: 'autre',
  conduite_dangereuse: 'accident',
  comportement_inapproprie: 'autre',
  panne_technique: 'panne',
  arret_prolonge: 'retard',
  fausse_arrivee: 'fraude',
  autre: 'autre',
};

// Libellé précis de la catégorie du signalement (comme l'admin, qui affiche
// la catégorie quand il n'y a pas de commentaire libre). Évite le « Signalement
// sans commentaire » qui masquait la vraie nature (ex. excès de vitesse).
const LIBELLE_CATEGORIE: Record<string, string> = {
  exces_vitesse: 'Excès de vitesse',
  conduite_dangereuse: 'Conduite dangereuse',
  comportement_inapproprie: 'Comportement inapproprié',
  panne_technique: 'Panne technique',
  arret_prolonge: 'Arrêt prolongé',
  autre: 'Autre',
};

const stylesType: Record<Incident['type'], string> = {
  retard: 'bg-amber/15 text-amber', panne: 'bg-ink/8 text-ink', accident: 'bg-red/10 text-red', fraude: 'bg-purple/10 text-purple', autre: 'bg-green-700/10 text-green-700',
};

export default function SignalementsPage() {
  const [dateChoisie, setDateChoisie] = useState(AUJOURDHUI);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Signalements réellement déposés par les passagers pendant les
  // trajets de l'agence, avec leur auteur — l'agence le voit déjà sur
  // sa page Trajets, la fiche l'affiche donc aussi ici.
  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const rep = await apiFetch('/api/signalements/mon-agence');
      const lignes = (rep.signalements || []) as Record<string, unknown>[];
      setIncidents(
        lignes.map((sig) => {
          const cat = String(sig.categorie ?? '');
          const chauffeur = `${sig.prenom_chauffeur ?? ''} ${sig.nom_chauffeur ?? ''}`.replace(/\s+/g, ' ').trim();
          // Itinéraire détaillé (comme l'admin) : heures depart → arrêts → arrivée,
          // et villes avec leur lieu de prise en charge.
          const pts = (Array.isArray(sig.points_detail) ? sig.points_detail : []) as { ville?: string; lieu?: string | null; heure?: string | null }[];
          const heureDepart = String(sig.heure_depart ?? '');
          const heureArrivee = String(sig.heure_arrivee ?? '');
          const heuresInter = pts.slice(1, -1).map((p) => p.heure).filter(Boolean) as string[];
          const horaires = [heureDepart, ...heuresInter, heureArrivee].filter(Boolean).join(' → ');
          const routeDetail = pts.length
            ? pts.map((p) => `${p.ville ?? ''}${p.lieu ? ` (${p.lieu})` : ''}`).join(' → ')
            : `${sig.depart ?? ''} → ${sig.arrivee ?? ''}`;
          return {
            id: String(sig.id),
            numeroVoyage: String(sig.numero_voyage ?? ''),
            // Dates/heures déjà formatées par le backend (tz-safe).
            dateDepart: String(sig.date_depart ?? ''),
            heureDepart: String(sig.heure_depart ?? ''),
            dateSignalement: String(sig.date_signalement ?? ''),
            heureSignalement: String(sig.heure_signalement ?? '--:--'),
            categorie: cat,
            type: TYPE_PAR_CATEGORIE[cat] ?? 'autre',
            categorieLabel: LIBELLE_CATEGORIE[cat] ?? 'Signalement',
            trajet: `${sig.depart ?? ''} → ${sig.arrivee ?? ''}`,
            routeDetail,
            horaires,
            chauffeur: chauffeur || '—',
            nbPassagers: Number(sig.nb_passagers) || 0,
            passager: String(sig.passager ?? '').trim() || 'Voyageur',
            commentaire: sig.commentaire == null ? '' : String(sig.commentaire).trim(),
          } as Incident;
        }),
      );
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const [filtreCategorie, setFiltreCategorie] = useState<'tous' | string>('tous');
  // Numero du voyage affiche en grand (null = aucune fiche ouverte).
  const [voyageVu, setVoyageVu] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');

  // Arrivee depuis un lien « signalements » de la page Trajets : on
  // ouvre le bon jour et la fiche du voyage concerne.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDateChoisie(d);
    const v = params.get('voyage');
    if (v) setVoyageVu(v);
  }, []);

  const groupes = useMemo(() => {
    const filtres = incidents.filter((incident) =>
      incident.dateDepart === dateChoisie &&
      (filtreCategorie === 'tous' || incident.categorie === filtreCategorie),
    );

    const map = new Map<string, { numeroVoyage: string; trajet: string; routeDetail: string; horaires: string; heureDepart: string; dateDepart: string; chauffeur: string; nbPassagers: number; incidents: Incident[] }>();
    filtres.forEach((incident) => {
      if (!map.has(incident.numeroVoyage)) {
        map.set(incident.numeroVoyage, { numeroVoyage: incident.numeroVoyage, trajet: incident.trajet, routeDetail: incident.routeDetail, horaires: incident.horaires, heureDepart: incident.heureDepart, dateDepart: incident.dateDepart, chauffeur: incident.chauffeur, nbPassagers: incident.nbPassagers, incidents: [] });
      }
      map.get(incident.numeroVoyage)!.incidents.push(incident);
    });
    return Array.from(map.values());
  }, [incidents, dateChoisie, filtreCategorie]);

  const resultatsRecherche = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return [] as Incident[];
    return incidents.filter((incident) => [
      incident.numeroVoyage, incident.dateSignalement, incident.dateDepart, incident.heureSignalement, incident.heureDepart,
      incident.trajet, incident.chauffeur, incident.categorieLabel, incident.commentaire, incident.passager,
    ].join(' ').toLowerCase().includes(terme));
  }, [incidents, recherche]);

  // Auteurs distincts d'un bloc, dans leur ordre d'apparition.
  function auteursDistincts(bloc: { entrees: { auteur: string }[] }): string[] {
    return Array.from(new Set(bloc.entrees.map((e) => e.auteur)));
  }

  const groupeVu = useMemo(
    () => groupes.find((g) => g.numeroVoyage === voyageVu) ?? null,
    [groupes, voyageVu],
  );

  // Fiche : un bloc par catégorie (« Conduite dangereuse × 2 » + ses
  // auteurs), messages libres listés les uns sous les autres dans le
  // bloc de leur catégorie.
  const blocsFiche = useMemo(() => {
    type Bloc = { cle: string; type: Incident['type']; label: string; entrees: { auteur: string; texte: string }[] };
    if (!groupeVu) return [] as Bloc[];
    const blocs = new Map<string, Bloc>();
    groupeVu.incidents.forEach((incident) => {
      const cle = incident.categorie;
      if (!blocs.has(cle)) {
        blocs.set(cle, { cle, type: incident.type, label: incident.categorieLabel, entrees: [] });
      }
      // Une ligne par signalement : son auteur, et son message quand il
      // en a laissé un. Rien n'est perdu, pas de liste d'auteurs en
      // double sous les messages.
      blocs.get(cle)!.entrees.push({ auteur: incident.passager, texte: incident.commentaire });
    });
    return Array.from(blocs.values());
  }, [groupeVu]);

  useEffect(() => {
    if (!voyageVu) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') setVoyageVu(null); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [voyageVu]);

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-ink mb-1">Signalements</h1>
        <p className="text-[13px] text-ink-soft mb-3">Signalements regroupés par numéro de voyage — cliquez sur un voyage pour voir le détail.</p>

        <div className="mb-3">
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="🔍 Rechercher un signalement sur toutes les dates (n° de voyage, trajet, catégorie, chauffeur…)" className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[13px]" />
        </div>

        {recherche.trim() && (
          <div className="bg-paper rounded-2xl border border-line overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-line"><h2 className="text-sm font-bold text-ink">Résultats de recherche ({resultatsRecherche.length})</h2></div>
            {resultatsRecherche.length === 0 ? <div className="p-6 text-[12px] text-ink-soft">Aucun signalement ne correspond à cette recherche.</div> : (
              <div className="divide-y divide--line">
                {resultatsRecherche.map((incident) => (
                  <div key={incident.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-[13px] font-bold text-ink">{incident.trajet}</p>
                        <p className="text-[11px] text-ink-soft mt-1">{incident.dateSignalement.split('-').reverse().join('/')} · {incident.heureSignalement} · voyage {incident.numeroVoyage}</p>
                        <p className="text-[11px] text-ink-soft mt-0.5">Chauffeur : <span className="font-semibold text-ink">{incident.chauffeur}</span></p>
                        {incident.commentaire && <p className="text-[11px] text-ink mt-1">« {incident.commentaire} »</p>}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stylesType[incident.type]}`}>{incident.categorieLabel}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DateNavigator date={dateChoisie} onChange={setDateChoisie} className="mb-3" />

        <div className="bg-paper rounded-2xl border border-line p-4 mb-5 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-ink-soft mr-1">Type</span>
          <button onClick={() => setFiltreCategorie('tous')} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${filtreCategorie === 'tous' ? 'bg-ink text-white' : 'bg-off-white border border-line text-ink-soft'}`}>Tous</button>
          {CATEGORIES_FILTRE.map((c) => (
            <button key={c.id} onClick={() => setFiltreCategorie(c.id)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${filtreCategorie === c.id ? 'bg-ink text-white' : 'bg-off-white border border-line text-ink-soft'}`}>
              {c.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {groupes.map((groupe) => {
            return (
              <div key={groupe.numeroVoyage} className="bg-paper rounded-2xl border border-line overflow-hidden">
                <button type="button" onClick={() => setVoyageVu(groupe.numeroVoyage)} className="w-full text-left p-5 hover:bg-off-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      {groupe.horaires && <p className="text-[12px] font-bold text-green-700 font-mono">{groupe.horaires}</p>}
                      <p className="text-[15px] font-extrabold text-ink mt-0.5">{groupe.routeDetail || groupe.trajet}</p>
                      <p className="text-[11px] text-ink-soft mt-0.5">
                        Voyage {groupe.numeroVoyage} · {groupe.dateDepart.split('-').reverse().join('/')}
                      </p>
                      <p className="text-[11px] text-ink-soft mt-0.5">Chauffeur : <span className="font-semibold text-ink">{groupe.chauffeur}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-full bg-ink/7 text-ink text-[11px] font-bold">{groupe.incidents.length} signalement{groupe.incidents.length > 1 ? 's' : ''}</span>
                      <span className="text-[11px] font-semibold text-green-700 whitespace-nowrap">Voir le détail →</span>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}

          {groupes.length === 0 && <div className="bg-paper rounded-2xl border border-line p-10 text-center text-[12px] text-ink-soft">Aucun signalement ne correspond à cette date et à ces filtres.</div>}
        </div>
      </div>

      {groupeVu && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={() => setVoyageVu(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto scroll-mince shadow-xl">
            <div className="bg-gradient-to-br from-green-700 to-green-900 px-7 pt-7 pb-5 rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-start gap-3.5">
                <div className="min-w-0 flex-1">
                  {groupeVu.horaires && <p className="text-[12px] font-bold text-white/80 font-mono">{groupeVu.horaires}</p>}
                  <p className="text-[17px] font-display font-bold text-white mt-0.5">{groupeVu.routeDetail || groupeVu.trajet}</p>
                  <p className="text-[11.5px] text-white/70 mt-0.5">
                    Voyage <span className="font-mono">{groupeVu.numeroVoyage}</span> · {groupeVu.dateDepart.split('-').reverse().join('/')}
                  </p>
                  <p className="text-[11.5px] text-white/70 mt-0.5">Chauffeur : <span className="font-semibold text-white">{groupeVu.chauffeur}</span></p>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-white/15 text-white text-[11px] font-bold shrink-0">{groupeVu.incidents.length} signalement{groupeVu.incidents.length > 1 ? 's' : ''}</span>
                {/* Rapporte au nombre de passagers : 3 signalements sur
                    5 passagers ne pesent pas comme 3 sur 60. */}
                <span className="px-3 py-1.5 rounded-full bg-white/15 text-white text-[11px] font-bold shrink-0 whitespace-nowrap">
                  {(() => {
                    const n = new Set(groupeVu.incidents.map((i) => i.passager)).size;
                    return `${n} voyageur${n > 1 ? 's' : ''} ${n > 1 ? 'ont' : 'a'} signalé${groupeVu.nbPassagers > 0 ? ` / ${groupeVu.nbPassagers}` : ''}`;
                  })()}
                </span>
                <button onClick={() => setVoyageVu(null)} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm shrink-0" aria-label="Fermer">✕</button>
              </div>
            </div>

            <div className="px-7 py-5 space-y-2.5">
              {blocsFiche.map((bloc) => (
                <div key={bloc.cle} className="rounded-2xl bg-off-white border border-line p-4">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${stylesType[bloc.type]}`}>{bloc.label}</span>
                    {bloc.entrees.length > 1 && <span className="text-[12px] font-bold text-ink">× {bloc.entrees.length}</span>}
                  </div>
                  {bloc.cle === 'autre' ? (
                    // « Autre » : tout tient dans le message libre, donc
                    // une ligne « auteur : message » par signalement.
                    <div className="mt-2 space-y-1">
                      {bloc.entrees.map((e, i) => (
                        <p key={i} className="text-[12px] text-ink">
                          <span className="font-semibold">{e.auteur}</span>{e.texte ? ` : ${e.texte}` : ''}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <>
                      {bloc.entrees.filter((e) => e.texte).map((e, i) => (
                        <p key={i} className="text-[12px] text-ink mt-2">
                          <span className="font-semibold">Message :</span> {e.texte}
                          {auteursDistincts(bloc).length > 1 && <span className="text-ink-soft"> — {e.auteur}</span>}
                        </p>
                      ))}
                      <p className="text-[11.5px] text-ink-soft mt-2"><span className="font-semibold text-ink">Par :</span> {auteursDistincts(bloc).join(', ')}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </LayoutAgence>
  );
}
