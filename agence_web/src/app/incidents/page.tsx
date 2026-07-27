'use client';

import { useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { todayInputDate, addDaysToInput } from '../lib/date';

type Incident = {
  id: string;
  numeroVoyage: string;
  date: string;
  heureSignalement: string;
  heureDepart: string;
  type: 'retard' | 'panne' | 'accident' | 'fraude' | 'autre';
  statut: 'ouvert' | 'en_cours' | 'resolu';
  trajet: string;
  description: string;
};

const AUJOURDHUI = todayInputDate();
const HIER = addDaysToInput(AUJOURDHUI, -1);
const DEMAIN = addDaysToInput(AUJOURDHUI, 1);

const INCIDENTS_DEMO: Incident[] = [
  { id: 'I1', numeroVoyage: 'JG-260727-0700-DLYDE', date: AUJOURDHUI, heureSignalement: '06:42', heureDepart: '07:00', type: 'panne', statut: 'ouvert', trajet: 'Douala → Yaounde', description: 'Probleme moteur signale avant le depart.' },
  { id: 'I2', numeroVoyage: 'JG-260727-0700-DLYDE', date: AUJOURDHUI, heureSignalement: '07:06', heureDepart: '07:00', type: 'retard', statut: 'en_cours', trajet: 'Douala → Yaounde', description: 'Depart retarde pendant la verification technique.' },
  { id: 'I3', numeroVoyage: 'JG-260727-0700-DLYDE', date: AUJOURDHUI, heureSignalement: '08:18', heureDepart: '07:00', type: 'autre', statut: 'ouvert', trajet: 'Douala → Yaounde', description: 'Climatisation faible signalee dans le dernier rang.' },
  { id: 'I4', numeroVoyage: 'JG-260727-1400-YDE-DLA', date: AUJOURDHUI, heureSignalement: '14:21', heureDepart: '14:00', type: 'retard', statut: 'en_cours', trajet: 'Yaounde → Douala', description: 'Retard lie au trafic a la sortie de Yaounde.' },
  { id: 'I5', numeroVoyage: 'JG-260726-0900-DLA-BFM', date: HIER, heureSignalement: '09:37', heureDepart: '09:00', type: 'fraude', statut: 'resolu', trajet: 'Douala → Bafoussam', description: 'Tentative de faux embarquement detectee et bloquee.' },
  { id: 'I6', numeroVoyage: 'JG-260728-0630-DLA-BFM', date: DEMAIN, heureSignalement: '06:10', heureDepart: '06:30', type: 'retard', statut: 'ouvert', trajet: 'Douala → Bafoussam', description: 'Attente d un chauffeur remplaçant.' },
];

const libellesType: Record<Incident['type'], string> = { retard: 'Retard', panne: 'Panne', accident: 'Accident', fraude: 'Fraude', autre: 'Autre' };
const stylesType: Record<Incident['type'], string> = {
  retard: 'bg-[#E6B84C]/15 text-[#8A6A1E]', panne: 'bg-[#14201A]/8 text-[#14201A]', accident: 'bg-[#D9534F]/10 text-[#D9534F]', fraude: 'bg-[#7C3AED]/10 text-[#7C3AED]', autre: 'bg-[#0B9E63]/10 text-[#0B9E63]',
};
const libellesStatut: Record<Incident['statut'], string> = { ouvert: 'Ouvert', en_cours: 'En cours', resolu: 'Resolu' };
const stylesStatut: Record<Incident['statut'], string> = { ouvert: 'bg-[#D9534F]/10 text-[#D9534F]', en_cours: 'bg-[#E6B84C]/15 text-[#8A6A1E]', resolu: 'bg-[#0B9E63]/10 text-[#0B9E63]' };

export default function IncidentsPage() {
  const [dateChoisie, setDateChoisie] = useState(AUJOURDHUI);
  const [filtreType, setFiltreType] = useState<'tous' | Incident['type']>('tous');
  const [filtreStatut, setFiltreStatut] = useState<'tous' | Incident['statut']>('tous');
  const [groupesOuverts, setGroupesOuverts] = useState<Set<string>>(new Set());
  const [recherche, setRecherche] = useState('');

  const groupes = useMemo(() => {
    const filtres = INCIDENTS_DEMO.filter((incident) =>
      incident.date === dateChoisie &&
      (filtreType === 'tous' || incident.type === filtreType) &&
      (filtreStatut === 'tous' || incident.statut === filtreStatut),
    );

    const map = new Map<string, { numeroVoyage: string; trajet: string; heureDepart: string; incidents: Incident[] }>();
    filtres.forEach((incident) => {
      if (!map.has(incident.numeroVoyage)) {
        map.set(incident.numeroVoyage, { numeroVoyage: incident.numeroVoyage, trajet: incident.trajet, heureDepart: incident.heureDepart, incidents: [] });
      }
      map.get(incident.numeroVoyage)!.incidents.push(incident);
    });
    return Array.from(map.values());
  }, [dateChoisie, filtreType, filtreStatut]);

  const resultatsRecherche = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return [] as Incident[];
    return INCIDENTS_DEMO.filter((incident) => [
      incident.numeroVoyage, incident.date, incident.heureSignalement, incident.heureDepart, incident.trajet, incident.description,
      libellesType[incident.type], libellesStatut[incident.statut],
    ].join(' ').toLowerCase().includes(terme));
  }, [recherche]);

  function toggle(id: string) {
    setGroupesOuverts((prev) => { const copie = new Set(prev); copie.has(id) ? copie.delete(id) : copie.add(id); return copie; });
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-[#14201A] mb-1">Incidents</h1>
        <p className="text-[13px] text-[#64746C] mb-5">Incidents regroupes par numero de voyage, avec compteur et details depliables.</p>

        <div className="bg-white rounded-2xl border border-[#E7ECE8] p-4 mb-5">
          <label className="block text-[11px] font-semibold text-[#64746C] mb-2">Recherche globale sur tous les incidents</label>
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Numero de voyage, trajet, type, description, date..." className="w-full rounded-xl px-4 py-3 text-[13px]" />
          <p className="text-[10px] text-[#8B9890] mt-2">La recherche parcourt toute la page sur toutes les dates.</p>
        </div>

        {recherche.trim() && (
          <div className="bg-white rounded-2xl border border-[#E7ECE8] overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-[#E7ECE8]"><h2 className="text-sm font-bold text-[#14201A]">Resultats de recherche ({resultatsRecherche.length})</h2></div>
            {resultatsRecherche.length === 0 ? <div className="p-6 text-[12px] text-[#64746C]">Aucun incident ne correspond a cette recherche.</div> : (
              <div className="divide-y divide-[#E7ECE8]">
                {resultatsRecherche.map((incident) => (
                  <div key={incident.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-[13px] font-bold text-[#14201A]">{incident.trajet}</p>
                        <p className="text-[11px] text-[#64746C] mt-1">{incident.date.split('-').reverse().join('/')} · {incident.heureSignalement} · voyage {incident.numeroVoyage}</p>
                        <p className="text-[11px] text-[#8B9890] mt-1">{incident.description}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stylesType[incident.type]}`}>{libellesType[incident.type]}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stylesStatut[incident.statut]}`}>{libellesStatut[incident.statut]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DateNavigator date={dateChoisie} onChange={setDateChoisie} className="mb-5" />

        <div className="bg-white rounded-2xl border border-[#E7ECE8] p-4 mb-5 flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#8B9890]">Type</span>
            {(['tous', 'retard', 'panne', 'accident', 'fraude', 'autre'] as const).map((type) => (
              <button key={type} onClick={() => setFiltreType(type)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${filtreType === type ? 'bg-[#14201A] text-white' : 'bg-[#F5F7F5] border border-[#E7ECE8] text-[#64746C]'}`}>
                {type === 'tous' ? 'Tous' : libellesType[type]}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-[#E7ECE8] hidden md:block" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#8B9890]">Statut</span>
            {(['tous', 'ouvert', 'en_cours', 'resolu'] as const).map((statut) => (
              <button key={statut} onClick={() => setFiltreStatut(statut)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${filtreStatut === statut ? 'bg-[#0B9E63] text-white' : 'bg-[#F5F7F5] border border-[#E7ECE8] text-[#64746C]'}`}>
                {statut === 'tous' ? 'Tous' : libellesStatut[statut]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {groupes.map((groupe) => {
            const ouvert = groupesOuverts.has(groupe.numeroVoyage);
            return (
              <div key={groupe.numeroVoyage} className="bg-white rounded-2xl border border-[#E7ECE8] overflow-hidden">
                <button type="button" onClick={() => toggle(groupe.numeroVoyage)} className="w-full text-left p-5 hover:bg-[#F8FAF8]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-extrabold text-[#14201A]">{groupe.trajet}</p>
                      <p className="text-[11px] text-[#64746C] mt-0.5">Voyage {groupe.numeroVoyage} · {dateChoisie.split('-').reverse().join('/')} · depart {groupe.heureDepart}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-full bg-[#14201A]/7 text-[#14201A] text-[11px] font-bold">{groupe.incidents.length} incident(s)</span>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64746C" strokeWidth="2" className={ouvert ? 'rotate-180' : ''}><path d="M6 9l6 6 6-6" /></svg>
                    </div>
                  </div>
                </button>

                {ouvert && (
                  <div className="border-t border-[#E7ECE8] px-5 py-4 space-y-2.5">
                    {groupe.incidents.map((incident, index) => (
                      <div key={incident.id} className="rounded-2xl bg-[#F8FAF8] border border-[#E7ECE8] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-white border border-[#E7ECE8] flex items-center justify-center text-[10px] font-bold text-[#64746C]">{index + 1}</span>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stylesType[incident.type]}`}>{libellesType[incident.type]}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stylesStatut[incident.statut]}`}>{libellesStatut[incident.statut]}</span>
                        </div>
                        <p className="text-[10px] font-semibold text-[#8B9890] mb-1">{incident.date.split('-').reverse().join('/')} · {incident.heureSignalement} · voyage {incident.numeroVoyage}</p>
                        <p className="text-[12px] text-[#64746C]">{incident.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {groupes.length === 0 && <div className="bg-white rounded-2xl border border-[#E7ECE8] p-10 text-center text-[12px] text-[#64746C]">Aucun incident ne correspond a cette date et a ces filtres.</div>}
        </div>
      </div>
    </LayoutAgence>
  );
}
