'use client';

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
  montant: number;
  statut: 'confirme' | 'embarque' | 'annule';
  optionsSupp?: string[];
};
type TrajetAvecPassagers = { id: string; date: string; heure: string; trajet: string; capacite: number; demarre: boolean; passagers: Passager[] };

const AUJOURDHUI = todayInputDate();
const DEMAIN = addDaysToInput(AUJOURDHUI, 1);

const trajetsDemo: TrajetAvecPassagers[] = [
  {
    id: 't1', date: AUJOURDHUI, heure: '07:00', trajet: 'Douala → Yaounde', capacite: 32, demarre: true,
    passagers: [
      { id: 'p1', nom: 'Jean Dupont', telephone: '+237 6 78 12 34 56', email: 'jean.dupont@gmail.com', siege: '5A', montant: 4000, statut: 'embarque', optionsSupp: ['Bagage supplementaire', 'Choix du siege'] },
      { id: 'p2', nom: 'Marie Fotso', telephone: '+237 6 90 45 67 89', email: 'marie.fotso@yahoo.fr', siege: '12B', montant: 4000, statut: 'embarque', optionsSupp: [] },
      { id: 'p3', nom: 'Sarah Mballa', telephone: '+237 6 55 23 89 01', email: 'sarah.mballa@gmail.com', siege: '8D', montant: 4000, statut: 'confirme', optionsSupp: ['Assurance bagage'] },
    ],
  },
  {
    id: 't2', date: AUJOURDHUI, heure: '14:00', trajet: 'Yaounde → Douala', capacite: 32, demarre: false,
    passagers: [
      { id: 'p4', nom: 'Paul Nkeng', telephone: '+237 6 99 11 22 33', email: 'paul.nkeng@outlook.com', siege: '3C', montant: 4200, statut: 'annule', optionsSupp: ['Flex billet'] },
      { id: 'p5', nom: 'Eric Tabi', telephone: '+237 6 77 88 99 00', email: 'eric.tabi@gmail.com', siege: '2A', montant: 3200, statut: 'confirme', optionsSupp: [] },
    ],
  },
  {
    id: 't3', date: DEMAIN, heure: '09:00', trajet: 'Douala → Bafoussam', capacite: 30, demarre: false,
    passagers: [
      { id: 'p6', nom: 'Aline Ngo', telephone: '+237 6 88 44 55 66', email: 'aline.ngo@gmail.com', siege: '4B', montant: 3500, statut: 'confirme', optionsSupp: ['Bagage supplementaire', 'Siege premium'] },
    ],
  },
];

const stylesStatut = { confirme: 'bg-[#0B9E63]/10 text-[#0B9E63]', embarque: 'bg-[#14201A]/10 text-[#14201A]', annule: 'bg-[#D9534F]/10 text-[#D9534F]' };
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
        .filter((p) => [trajet.date, trajet.heure, trajet.trajet, p.nom, p.email, p.telephone, p.siege, ...(p.optionsSupp || []), libellesStatut[p.statut]].join(' ').toLowerCase().includes(terme))
        .map((passager) => ({ trajet, passager })),
    );
  }, [recherche]);

  function toggle(id: string) {
    setOuverts((prev) => { const copie = new Set(prev); copie.has(id) ? copie.delete(id) : copie.add(id); return copie; });
  }

  function stats(t: TrajetAvecPassagers) {
    const actifs = t.passagers.filter((p) => p.statut !== 'annule');
    return { reservations: actifs.length, embarques: t.passagers.filter((p) => p.statut === 'embarque').length, argent: actifs.reduce((s, p) => s + p.montant, 0), remplissage: Math.round((actifs.length / t.capacite) * 100) };
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-[#14201A] mb-1">Reservations</h1>
        <p className="text-[13px] text-[#64746C] mb-4">Par trajet, avec details clients et options supplementaires.</p>

        <div className="rounded-2xl p-3 mb-6 bg-[#D9534F]/6 border border-[#D9534F]/20"><p className="text-[11px] text-[#64746C]">Facade complete -- aucune route backend pour lister les reservations d&apos;une agence n&apos;existe.</p></div>

        <div className="bg-white rounded-2xl border border-[#E7ECE8] p-4 mb-5">
          <label className="block text-[11px] font-semibold text-[#64746C] mb-2">Recherche globale sur toutes les reservations</label>
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom client, telephone, trajet, siege, option supplementaire..." className="w-full rounded-xl px-4 py-3 text-[13px]" />
          <p className="text-[10px] text-[#8B9890] mt-2">La recherche parcourt toute la page sur toutes les dates.</p>
        </div>

        {recherche.trim() && (
          <div className="bg-white rounded-2xl border border-[#E7ECE8] overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-[#E7ECE8]"><h2 className="text-sm font-bold text-[#14201A]">Resultats de recherche ({resultatsRecherche.length})</h2></div>
            {resultatsRecherche.length === 0 ? (
              <div className="p-6 text-[12px] text-[#64746C]">Aucune reservation ne correspond a cette recherche.</div>
            ) : (
              <div className="divide-y divide-[#E7ECE8]">
                {resultatsRecherche.map(({ trajet, passager }) => (
                  <div key={`${trajet.id}-${passager.id}`} className="px-5 py-4 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0B9E63] to-[#10C070] flex items-center justify-center text-white text-[10px] font-bold shrink-0">{passager.nom.split(' ').map((n) => n[0]).join('')}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#14201A]">{passager.nom}</p>
                      <p className="text-[12px] text-[#64746C]">{trajet.trajet} · {trajet.date.split('-').reverse().join('/')} · {trajet.heure}</p>
                      <p className="text-[11px] text-[#64746C]">{passager.telephone} · {passager.email} · Siege {passager.siege}</p>
                      <p className="text-[11px] text-[#8B9890] mt-1">Options supp : {passager.optionsSupp && passager.optionsSupp.length ? passager.optionsSupp.join(', ') : 'Aucune'}</p>
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
          <div className="bg-white rounded-2xl border border-[#E7ECE8] p-10 text-center"><p className="text-[13px] text-[#64746C]">Aucun trajet ce jour-la.</p></div>
        ) : (
          <div className="space-y-4">
            {trajetsDuJour.map((t) => {
              const s = stats(t);
              const ouvert = ouverts.has(t.id);
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-[#E7ECE8] overflow-hidden">
                  <button onClick={() => toggle(t.id)} className="w-full text-left px-5 py-4 hover:bg-[#F6F8F6] transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[15px] font-extrabold text-[#14201A]">{t.trajet}</p>
                        <p className="text-[12px] text-[#64746C]">{t.heure} {t.demarre && <span className="text-[#0B9E63] font-bold">· En cours</span>}</p>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA69F" strokeWidth="2" className={`transition-transform ${ouvert ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div><p className="text-[10px] text-[#9AA69F]">Places</p><p className="text-[13px] font-bold text-[#14201A]">{t.capacite}</p></div>
                      <div><p className="text-[10px] text-[#9AA69F]">Reservations</p><p className="text-[13px] font-bold text-[#14201A]">{s.reservations}</p></div>
                      {t.demarre && <div><p className="text-[10px] text-[#9AA69F]">Embarques</p><p className="text-[13px] font-bold text-[#14201A]">{s.embarques}</p></div>}
                      <div><p className="text-[10px] text-[#9AA69F]">Argent genere</p><p className="text-[13px] font-bold text-[#0B9E63]">{s.argent.toLocaleString('fr-FR')} F</p></div>
                      <div><p className="text-[10px] text-[#9AA69F]">Remplissage</p><p className="text-[13px] font-bold text-[#14201A]">{s.remplissage}%</p></div>
                    </div>
                  </button>

                  {ouvert && (
                    <div className="border-t border-[#E7ECE8] divide-y divide-[#E7ECE8]">
                      {t.passagers.map((p) => (
                        <div key={p.id} className="px-5 py-3 flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0B9E63] to-[#10C070] flex items-center justify-center text-white text-[10px] font-bold shrink-0">{p.nom.split(' ').map((n) => n[0]).join('')}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#14201A]">{p.nom}</p>
                            <p className="text-[12px] text-[#64746C]">{p.telephone} · Siege {p.siege}</p>
                            <p className="text-[11px] text-[#9AA69F] truncate">{p.email}</p>
                            <p className="text-[11px] text-[#64746C] mt-1">Options supp : <strong className="text-[#14201A]">{p.optionsSupp && p.optionsSupp.length ? p.optionsSupp.join(', ') : 'Aucune'}</strong></p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${stylesStatut[p.statut]}`}>{libellesStatut[p.statut]}</span>
                          <p className="w-16 text-right text-[12px] font-bold text-[#14201A]">{p.montant.toLocaleString('fr-FR')} F</p>
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
