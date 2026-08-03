'use client';

// ✅ BRANCHÉ (repli démo) — GET /api/avis/agences/:id (route PUBLIQUE,
// aucune authentification requise). ⚠️ La vraie réponse ne contient PAS
// le trajet concerné (ni son ID) — seulement note_globale, note_service,
// note_conduite, note_horaires, note_confort, commentaire, cree_le,
// voyageur_prenom. Le trajet/ID affiché ci-dessous n'est donc réel qu'en
// mode démo ; en mode réel il est marqué "non fourni par l'API".

import { useEffect, useState, useMemo } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { Panel, Badge, StatCard } from '../components/ui';
import { getAgenceLocale, apiFetch } from '../lib/api';
import { todayInputDate } from '../lib/date';

type Avis = {
  note_globale: number;
  note_service?: number;
  note_conduite?: number;
  note_horaires?: number;
  note_confort?: number;
  commentaire: string | null;
  cree_le: string;
  voyageur_prenom: string;
  // Démo uniquement — absents de la vraie réponse API :
  trajet?: string;
  trajet_id?: string;
};

const avisDemo: Avis[] = [
  { note_globale: 5, note_service: 5, note_conduite: 5, note_horaires: 4, note_confort: 5, commentaire: 'Chauffeur ponctuel et très courtois, bus confortable.', cree_le: new Date().toISOString(), voyageur_prenom: 'Jean', trajet: 'Douala → Yaoundé', trajet_id: 'TRJ-4821' },
  { note_globale: 3, note_service: 3, note_conduite: 4, note_horaires: 2, note_confort: 3, commentaire: "Retard important non annoncé à l'avance.", cree_le: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), voyageur_prenom: 'Nadine', trajet: 'Yaoundé → Douala', trajet_id: 'TRJ-4796' },
  { note_globale: 4, note_service: 4, note_conduite: 4, note_horaires: 4, note_confort: 4, commentaire: null, cree_le: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(), voyageur_prenom: 'Paul', trajet: 'Douala → Bafoussam', trajet_id: 'TRJ-4650' },
];

export default function AvisPage() {
  const [avis, setAvis] = useState<Avis[]>([]);
  const [noteMoyenne, setNoteMoyenne] = useState<number | null>(null);
  const [nombreAvis, setNombreAvis] = useState<number | null>(null);
  const [modeDemo, setModeDemo] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [dateChoisie, setDateChoisie] = useState(todayInputDate());
  const [afficherToutesDates, setAfficherToutesDates] = useState(true);
  const [filtreCategorie, setFiltreCategorie] = useState<'globale' | 'service' | 'conduite' | 'horaires' | 'confort'>('globale');

  async function charger() {
    setChargement(true);
    setErreur(null);
    const agenceLocale = getAgenceLocale();
    if (!agenceLocale) {
      setAvis(avisDemo);
      setModeDemo(true);
      setChargement(false);
      return;
    }
    try {
      const data = await apiFetch(`/api/avis/agences/${agenceLocale.id}`);
      setAvis(data.avis || []);
      setNoteMoyenne(data.agence?.note_moyenne ?? null);
      setNombreAvis(data.agence?.nombre_avis ?? null);
      setModeDemo(false);
    } catch {
      setAvis(avisDemo);
      setModeDemo(true);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { charger(); }, []);

  const cleNote: Record<typeof filtreCategorie, keyof Avis | 'note_globale'> = {
    globale: 'note_globale', service: 'note_service', conduite: 'note_conduite', horaires: 'note_horaires', confort: 'note_confort',
  };

  const avisAffiches = useMemo(() => {
    let liste = avis;
    if (!afficherToutesDates) {
      liste = liste.filter((a) => new Date(a.cree_le).toISOString().slice(0, 10) === dateChoisie);
    }
    if (filtreCategorie !== 'globale') {
      liste = liste.filter((a) => a[cleNote[filtreCategorie]] != null);
    }
    return liste;
  }, [avis, afficherToutesDates, dateChoisie, filtreCategorie]);

  return (
    <LayoutAgence>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-ink mb-1">Avis & notes</h1>
        <p className="text-[13px] text-ink-soft mb-4">Commentaires laissés par les voyageurs, avec le trajet concerné.</p>

        <div className="flex items-center justify-between gap-3 mb-5">
          {modeDemo ? (
            <div className="text-xs font-semibold text-amber bg-amber-bg rounded-lg px-3 py-2">Mode démo — données factices (trajet/ID non fournis par la vraie route)</div>
          ) : <div />}
          <button onClick={() => { setAvis(avisDemo); setModeDemo(true); }} className="text-[11px] font-bold text-green-700 underline shrink-0">
            Voir des données de démonstration
          </button>
        </div>
        {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}

        <div className="grid grid-cols-2 gap-3.5 mb-6">
          <StatCard num={noteMoyenne != null ? `⭐ ${noteMoyenne}` : (modeDemo ? '⭐ 4.2' : '—')} label="Note moyenne" />
          <StatCard num={nombreAvis != null ? String(nombreAvis) : (modeDemo ? String(avis.length) : '—')} label="Nombre d'avis" />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[11px] font-bold text-ink-soft mr-1">Voir seulement :</span>
          {([
            { v: 'globale', l: 'Toutes les notes' },
            { v: 'service', l: 'Service' },
            { v: 'conduite', l: 'Conduite (= note du chauffeur)' },
            { v: 'horaires', l: 'Horaires' },
            { v: 'confort', l: 'Confort' },
          ] as const).map((f) => (
            <button key={f.v} onClick={() => setFiltreCategorie(f.v)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${filtreCategorie === f.v ? 'bg-green-700 text-white' : 'bg-paper border border-line text-ink-soft'}`}>{f.l}</button>
          ))}
        </div>
        {filtreCategorie === 'conduite' && (
          <p className="text-[10.5px] text-ink-soft mb-3">ℹ️ La note « conduite » compte dans la note globale de l&apos;agence et sert aussi de note entière au chauffeur concerné.</p>
        )}

        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setAfficherToutesDates((v) => !v)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${afficherToutesDates ? 'bg-green-700 text-white' : 'bg-paper border border-line text-ink-soft'}`}>
            {afficherToutesDates ? 'Toutes les dates' : 'Filtrer par jour'}
          </button>
          {!afficherToutesDates && <DateNavigator date={dateChoisie} onChange={setDateChoisie} />}
        </div>

        {chargement ? (
          <div className="text-sm text-ink-soft">Chargement…</div>
        ) : avisAffiches.length === 0 ? (
          <Panel><div className="p-10 text-center text-sm text-ink-soft">Aucun avis pour ce filtre</div></Panel>
        ) : (
          <div className="space-y-3">
            {avisAffiches.map((a, i) => {
              const noteAffichee = (a[cleNote[filtreCategorie]] as number | undefined) ?? a.note_globale;
              return (
                <Panel key={i}>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink text-[13px]">{a.voyageur_prenom}</span>
                        <Badge color={noteAffichee >= 4 ? 'green' : noteAffichee >= 3 ? 'amber' : 'red'}>
                          {filtreCategorie !== 'globale' ? `${f_label(filtreCategorie)} : ` : '⭐ '}{noteAffichee}/5
                        </Badge>
                      </div>
                      <span className="text-[11px] text-ink-soft font-mono">{new Date(a.cree_le).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p className="text-[12px] text-ink-soft mb-2">
                      {a.trajet ? <>Trajet : {a.trajet} <span className="font-mono">#{a.trajet_id}</span></> : "Trajet non fourni par l'API"}
                    </p>
                    {a.commentaire && <p className="text-[13px] text-ink mb-2">« {a.commentaire} »</p>}
                    <div className="flex flex-wrap gap-3 text-[10.5px] text-ink-soft">
                      {a.note_service != null && <span>Service : {a.note_service}/5</span>}
                      {a.note_conduite != null && <span>Conduite : {a.note_conduite}/5</span>}
                      {a.note_horaires != null && <span>Horaires : {a.note_horaires}/5</span>}
                      {a.note_confort != null && <span>Confort : {a.note_confort}/5</span>}
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </div>
    </LayoutAgence>
  );
}

function f_label(cat: 'service' | 'conduite' | 'horaires' | 'confort') {
  return { service: 'Service', conduite: 'Conduite', horaires: 'Horaires', confort: 'Confort' }[cat];
}
