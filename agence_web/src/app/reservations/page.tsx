'use client';

// ⚠️ DEMO COMPLÈTE — aucune route backend pour lister les réservations d'une
// agence n'existe. Champs volontairement limités à ce qui concerne l'agence :
// options supp. = uniquement bagage/premium (pas les options internes JEGO),
// montant = net perçu par l'agence (pas le prix payé par le client, qui
// inclut la commission JEGO et les frais annexes).

import { useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { todayInputDate, addDaysToInput } from '../lib/date';

type Passager = {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  siege: string;
  montantAgence: number; // net perçu par l'agence, pas le prix payé par le client
  statut: 'confirme' | 'embarque' | 'annule';
  optionsSupp?: ('Bagage supplementaire' | 'Premium')[];
  trajetAssocie: string; // tronçon réellement réservé (ex: "Loum → Yaounde") — un même trajet physique peut avoir plusieurs tronçons vendus séparément
};
type TrajetAvecPassagers = {
  id: string; numeroVoyage: string; date: string; heure: string; heureArrivee: string; trajet: string;
  capacite: number; demarre: boolean; passagers: Passager[];
};

const AUJOURDHUI = todayInputDate();
const DEMAIN = addDaysToInput(AUJOURDHUI, 1);

const trajetsDemo: TrajetAvecPassagers[] = [
  {
    id: 't1', numeroVoyage: 'JG-260727-0700-DLYDE', date: AUJOURDHUI, heure: '07:00', heureArrivee: '11:30', trajet: 'Douala → Loum → Yaounde',
    capacite: 32, demarre: true,
    passagers: [
      { id: 'p1', nom: 'Jean Dupont', telephone: '+237 6 78 12 34 56', email: 'jean.dupont@gmail.com', siege: '5A', montantAgence: 3720, statut: 'embarque', optionsSupp: ['Bagage supplementaire'], trajetAssocie: 'Douala → Yaounde' },
      { id: 'p2', nom: 'Marie Fotso', telephone: '+237 6 90 45 67 89', email: 'marie.fotso@yahoo.fr', siege: '12B', montantAgence: 1200, statut: 'embarque', optionsSupp: [], trajetAssocie: 'Douala → Loum' },
      { id: 'p3', nom: 'Sarah Mballa', telephone: '+237 6 55 23 89 01', email: 'sarah.mballa@gmail.com', siege: '8D', montantAgence: 2600, statut: 'confirme', optionsSupp: ['Premium'], trajetAssocie: 'Loum → Yaounde' },
      { id: 'p7', nom: 'Franck Mbida', telephone: '+237 6 61 22 33 44', email: 'franck.mbida@gmail.com', siege: '12A', montantAgence: 1200, statut: 'confirme', optionsSupp: [], trajetAssocie: 'Douala → Loum' },
    ],
  },
  {
    id: 't2', numeroVoyage: 'JG-260727-1400-YDEDLA', date: AUJOURDHUI, heure: '14:00', heureArrivee: '18:15', trajet: 'Yaounde → Douala',
    capacite: 32, demarre: false,
    passagers: [
      { id: 'p4', nom: 'Paul Nkeng', telephone: '+237 6 99 11 22 33', email: 'paul.nkeng@outlook.com', siege: '3C', montantAgence: 3906, statut: 'annule', optionsSupp: [], trajetAssocie: 'Yaounde → Douala' },
      { id: 'p5', nom: 'Eric Tabi', telephone: '+237 6 77 88 99 00', email: 'eric.tabi@gmail.com', siege: '2A', montantAgence: 2976, statut: 'confirme', optionsSupp: [], trajetAssocie: 'Yaounde → Douala' },
    ],
  },
  {
    id: 't3', numeroVoyage: 'JG-260728-0900-DLABFM', date: DEMAIN, heure: '09:00', heureArrivee: '13:00', trajet: 'Douala → Bafoussam',
    capacite: 30, demarre: false,
    passagers: [
      { id: 'p6', nom: 'Aline Ngo', telephone: '+237 6 88 44 55 66', email: 'aline.ngo@gmail.com', siege: '4B', montantAgence: 3255, statut: 'confirme', optionsSupp: ['Bagage supplementaire', 'Premium'], trajetAssocie: 'Douala → Bafoussam' },
    ],
  },
];

const stylesStatut = { confirme: 'bg-green-700/10 text-green-700', embarque: 'bg-ink/10 text-ink', annule: 'bg-red/10 text-red' };
const libellesStatut = { confirme: 'Confirme', embarque: 'Embarque', annule: 'Annule' };

export default function Reservations() {
  const [dateChoisie, setDateChoisie] = useState(AUJOURDHUI);
  const [ouverts, setOuverts] = useState<Set<string>>(new Set());
  const [recherche, setRecherche] = useState('');

  const trajetsDuJour = useMemo(() => trajetsDemo.filter((t) => t.date === dateChoisie), [dateChoisie]);

  const resultatsRecherche = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return [] as { trajet: TrajetAvecPassagers; passager: Passager }[];
    return trajetsDemo.flatMap((trajet) =>
      trajet.passagers
        .filter((p) => [trajet.date, trajet.heure, trajet.trajet, p.nom, p.email, p.telephone, p.siege, p.id, p.trajetAssocie, ...(p.optionsSupp || []), libellesStatut[p.statut]].join(' ').toLowerCase().includes(terme))
        .map((passager) => ({ trajet, passager })),
    );
  }, [recherche]);

  function toggle(id: string) {
    setOuverts((prev) => { const copie = new Set(prev); copie.has(id) ? copie.delete(id) : copie.add(id); return copie; });
  }

  function stats(t: TrajetAvecPassagers) {
    const actifs = t.passagers.filter((p) => p.statut !== 'annule');
    return { reservations: actifs.length, embarques: t.passagers.filter((p) => p.statut === 'embarque').length, argent: actifs.reduce((s, p) => s + p.montantAgence, 0), remplissage: Math.round((actifs.length / t.capacite) * 100) };
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-ink mb-1">Reservations</h1>
        <p className="text-[13px] text-ink-soft mb-4">Par trajet — montants nets perçus par ton agence, options supplémentaires te concernant.</p>

        <div className="rounded-2xl p-3 mb-6 bg-red/6 border border-red/20"><p className="text-[11px] text-ink-soft">Démo complète — aucune route backend pour lister les réservations d&apos;une agence n&apos;existe.</p></div>

        <div className="bg-paper rounded-2xl border border-line p-4 mb-5">
          <label className="block text-[11px] font-semibold text-ink-soft mb-2">Recherche globale sur toutes les reservations</label>
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom client, telephone, trajet, siege, ID, option..." className="w-full rounded-xl px-4 py-3 text-[13px]" />
          <p className="text-[10px] text-ink-soft mt-2">La recherche parcourt toute la page sur toutes les dates.</p>
        </div>

        {recherche.trim() && (
          <div className="bg-paper rounded-2xl border border-line overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-line"><h2 className="text-sm font-bold text-ink">Resultats de recherche ({resultatsRecherche.length})</h2></div>
            {resultatsRecherche.length === 0 ? (
              <div className="p-6 text-[12px] text-ink-soft">Aucune reservation ne correspond a cette recherche.</div>
            ) : (
              <div className="divide-y divide-line">
                {resultatsRecherche.map(({ trajet, passager }) => (
                  <div key={`${trajet.id}-${passager.id}`} className="px-5 py-4 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{passager.nom.split(' ').map((n) => n[0]).join('')}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-ink">{passager.nom}</p>
                        <span className="text-[10px] font-mono text-ink-soft">#{passager.id}</span>
                      </div>
                      <p className="text-[12px] text-ink-soft">{trajet.trajet} <span className="font-mono">{trajet.numeroVoyage}</span> · {trajet.date.split('-').reverse().join('/')} · départ {trajet.heure} · arrivée estimée {trajet.heureArrivee}</p>
                      <p className="text-[11px] text-ink-soft">{passager.telephone} · {passager.email} · Siege {passager.siege}</p>
                      <p className="text-[11px] text-ink-soft mt-1">Options : {passager.optionsSupp && passager.optionsSupp.length ? passager.optionsSupp.join(', ') : 'Aucune'}</p>
                      <p className="text-[10.5px] text-purple font-semibold mt-0.5">Trajet associé : {passager.trajetAssocie}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${stylesStatut[passager.statut]}`}>{libellesStatut[passager.statut]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DateNavigator date={dateChoisie} onChange={setDateChoisie} className="mb-6" />

        {trajetsDuJour.length === 0 ? (
          <div className="bg-paper rounded-2xl border border-line p-10 text-center"><p className="text-[13px] text-ink-soft">Aucun trajet ce jour-la.</p></div>
        ) : (
          <div className="space-y-4">
            {trajetsDuJour.map((t) => {
              const s = stats(t);
              const ouvert = ouverts.has(t.id);
              return (
                <div key={t.id} className="bg-paper rounded-2xl border border-line overflow-hidden">
                  <button onClick={() => toggle(t.id)} className="w-full text-left px-5 py-4 hover:bg-off-white transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-extrabold text-ink">{t.trajet}</p>
                          <span className="text-[10px] font-mono text-ink-soft">{t.numeroVoyage} · #{t.id}</span>
                        </div>
                        <p className="text-[12px] text-ink-soft">Départ {t.heure} · arrivée estimée {t.heureArrivee} {t.demarre && <span className="text-green-700 font-bold">· En cours</span>}</p>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--c-ink-soft))" strokeWidth="2" className={`transition-transform shrink-0 ${ouvert ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                      <div><p className="text-[10px] text-ink-soft">Places</p><p className="text-[13px] font-bold text-ink">{t.capacite}</p></div>
                      <div><p className="text-[10px] text-ink-soft">Reservations</p><p className="text-[13px] font-bold text-ink">{s.reservations}</p></div>
                      {t.demarre && <div><p className="text-[10px] text-ink-soft">Embarques</p><p className="text-[13px] font-bold text-ink">{s.embarques}</p></div>}
                      <div><p className="text-[10px] text-ink-soft">Net perçu (agence)</p><p className="text-[13px] font-bold text-green-700">{s.argent.toLocaleString('fr-FR')} F</p></div>
                      <div><p className="text-[10px] text-ink-soft">Remplissage</p><p className="text-[13px] font-bold text-ink">{s.remplissage}%</p></div>
                    </div>
                  </button>

                  {ouvert && (
                    <div className="border-t border-line divide-y divide-line">
                      {t.passagers.map((p) => (
                        <div key={p.id} className="px-5 py-3 flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{p.nom.split(' ').map((n) => n[0]).join('')}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-semibold text-ink">{p.nom}</p>
                              <span className="text-[10px] font-mono text-ink-soft">#{p.id}</span>
                            </div>
                            <p className="text-[12px] text-ink-soft">{p.telephone} · Siege {p.siege}</p>
                            <p className="text-[11px] text-ink-soft truncate">{p.email}</p>
                            <p className="text-[11px] text-ink-soft mt-1">Options : <strong className="text-ink">{p.optionsSupp && p.optionsSupp.length ? p.optionsSupp.join(', ') : 'Aucune'}</strong></p>
                            <p className="text-[10.5px] text-purple font-semibold mt-0.5">Trajet associé : {p.trajetAssocie}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${stylesStatut[p.statut]}`}>{libellesStatut[p.statut]}</span>
                          <p className="w-20 text-right text-[12px] font-bold text-ink">{p.montantAgence.toLocaleString('fr-FR')} F</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LayoutAgence>
  );
}
