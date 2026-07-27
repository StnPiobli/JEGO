'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { addDaysToInput, todayInputDate } from '../lib/date';

type Trajet = {
  id: string;
  numero_voyage: string;
  date_depart: string;
  heure_depart: string;
  heure_arrivee_estimee: string | null;
  prix_base: number;
  categorie: 'standard' | 'vip' | 'express' | 'nuit';
  statut: 'programme' | 'en_cours' | 'retard' | 'termine' | 'annule';
  ville_depart: string;
  ville_arrivee: string;
  nom_bus: string;
  point_depart: string;
  point_arrivee: string;
  bus_id: string;
  chauffeur: string;
  chauffeur_id: string;
  retardDeclareMinutes: number;
  sourceRetard: 'chauffeur' | 'agence' | null;
};

type Horizon = { horizon_jours: number; seuil_alerte: number; conforme: boolean; message: string };

const AUJOURDHUI = todayInputDate();
const DEMAIN = addDaysToInput(AUJOURDHUI, 1);
const HIER = addDaysToInput(AUJOURDHUI, -1);

const horizonDemo: Horizon = {
  horizon_jours: 9, seuil_alerte: 14, conforme: false,
  message: 'Alerte : horizon de programmation sous le seuil (9 jours restants, minimum 14 requis)',
};

const trajetsDemoInitial: Trajet[] = [
  { id: '1', numero_voyage: 'JG-260727-0700-DLYDE', date_depart: AUJOURDHUI, heure_depart: '07:00', heure_arrivee_estimee: '11:30', prix_base: 4000, categorie: 'vip', statut: 'en_cours', ville_depart: 'Douala', ville_arrivee: 'Yaounde', nom_bus: 'Confort Express 01', point_depart: 'Bonaberi, apres le bar Chez Paul', point_arrivee: 'Mvan, face a la pharmacie', bus_id: 'b1', chauffeur: "Paul Eto'o", chauffeur_id: 'c1', retardDeclareMinutes: 30, sourceRetard: 'chauffeur' },
  { id: '2', numero_voyage: 'JG-260727-1400-YDE-DLA', date_depart: AUJOURDHUI, heure_depart: '14:00', heure_arrivee_estimee: '18:15', prix_base: 3500, categorie: 'standard', statut: 'programme', ville_depart: 'Yaounde', ville_arrivee: 'Douala', nom_bus: 'Confort 02', point_depart: 'Mvan, face a la pharmacie', point_arrivee: 'Bonaberi, apres le bar Chez Paul', bus_id: 'b2', chauffeur: 'Andre Nkeng', chauffeur_id: 'c2', retardDeclareMinutes: 0, sourceRetard: null },
  { id: '3', numero_voyage: 'JG-260728-0630-DLA-BFM', date_depart: DEMAIN, heure_depart: '06:30', heure_arrivee_estimee: '10:30', prix_base: 4200, categorie: 'express', statut: 'programme', ville_depart: 'Douala', ville_arrivee: 'Bafoussam', nom_bus: 'Express 03', point_depart: 'Akwa, gare routiere centrale', point_arrivee: 'Centre-ville', bus_id: 'b3', chauffeur: "Paul Eto'o", chauffeur_id: 'c1', retardDeclareMinutes: 0, sourceRetard: null },
  { id: '4', numero_voyage: 'JG-260726-1830-KBI-DLA', date_depart: HIER, heure_depart: '18:30', heure_arrivee_estimee: '21:15', prix_base: 3200, categorie: 'standard', statut: 'retard', ville_depart: 'Kribi', ville_arrivee: 'Douala', nom_bus: 'Confort 04', point_depart: 'Agence JEGO Kribi', point_arrivee: 'Bonaberi', bus_id: 'b4', chauffeur: 'Marc Bella', chauffeur_id: 'c4', retardDeclareMinutes: 90, sourceRetard: 'agence' },
];

const libellesCategorie: Record<Trajet['categorie'], string> = { standard: 'Standard', vip: 'VIP', express: 'Express', nuit: 'Nuit' };
const stylesCategorie: Record<Trajet['categorie'], string> = {
  standard: 'bg-[#F1F4F1] text-[#64746C]', vip: 'bg-[#E6B84C]/15 text-[#8A6A1E]',
  express: 'bg-[#0B9E63]/10 text-[#0B9E63]', nuit: 'bg-[#14201A]/10 text-[#14201A]',
};
const stylesStatut: Record<Trajet['statut'], string> = {
  programme: 'bg-[#0B9E63]/10 text-[#0B9E63]', en_cours: 'bg-[#E6B84C]/15 text-[#8A6A1E]',
  retard: 'bg-[#D9534F]/10 text-[#D9534F]', termine: 'bg-[#F1F4F1] text-[#64746C]', annule: 'bg-[#D9534F]/10 text-[#D9534F]',
};
const libellesStatut: Record<Trajet['statut'], string> = { programme: 'Programme', en_cours: 'En cours', retard: 'Retard', termine: 'Termine', annule: 'Annule' };

function lienDuplication(t: Trajet): string {
  const params = new URLSearchParams({
    dupliquer: '1', ville_depart: t.ville_depart.toLowerCase(), ville_arrivee: t.ville_arrivee.toLowerCase(),
    bus_id: t.bus_id, chauffeur_id: t.chauffeur_id, categorie: t.categorie, prix: String(t.prix_base),
    point_depart: t.point_depart, point_arrivee: t.point_arrivee,
  });
  return `/trajets/nouveau?${params.toString()}`;
}

function libelleRetard(minutes: number) {
  if (!minutes) return 'Aucun retard declare';
  if (minutes < 60) return `Retard de ${minutes} minutes`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste === 0 ? `Retard de ${heures}h` : `Retard de ${heures}h${String(reste).padStart(2, '0')}`;
}

export default function ProgrammationTrajets() {
  const [horizon] = useState<Horizon>(horizonDemo);
  const [trajets, setTrajets] = useState<Trajet[]>(trajetsDemoInitial);
  const [dateChoisie, setDateChoisie] = useState(AUJOURDHUI);
  const [recherche, setRecherche] = useState('');

  const [dialogueRetard, setDialogueRetard] = useState<Trajet | null>(null);
  const [minutesRetard, setMinutesRetard] = useState('');
  const [sourceRetard, setSourceRetard] = useState<'chauffeur' | 'agence'>('chauffeur');
  const [dialogueArret, setDialogueArret] = useState<Trajet | null>(null);
  const [texteArret, setTexteArret] = useState('');

  const trajetsDuJour = useMemo(() => trajets.filter((t) => t.date_depart === dateChoisie), [trajets, dateChoisie]);

  const resultatsRecherche = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return [];
    return trajets.filter((t) => [
      t.numero_voyage, t.date_depart, t.heure_depart, t.ville_depart, t.ville_arrivee, t.nom_bus,
      t.point_depart, t.point_arrivee, t.chauffeur, libellesStatut[t.statut], libellesCategorie[t.categorie], libelleRetard(t.retardDeclareMinutes),
    ].join(' ').toLowerCase().includes(terme));
  }, [recherche, trajets]);

  function declarerRetard() {
    if (!dialogueRetard || !minutesRetard) return;
    const minutes = Math.max(1, Number(minutesRetard));
    setTrajets((prev) => prev.map((t) => (t.id === dialogueRetard.id ? {
      ...t, statut: 'retard', retardDeclareMinutes: minutes, sourceRetard,
    } : t)));
    setDialogueRetard(null);
    setMinutesRetard('');
    setSourceRetard('chauffeur');
  }

  function arreterTrajet() {
    if (!dialogueArret || texteArret.trim().toUpperCase() !== 'ARRETER') return;
    setTrajets((prev) => prev.map((t) => (t.id === dialogueArret.id ? { ...t, statut: 'annule' } : t)));
    setDialogueArret(null);
    setTexteArret('');
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-[#14201A]">Programmation des trajets</h1>
            <p className="text-sm text-[#64746C] mt-1">Gere tes trajets programmes et maintiens ton horizon a jour.</p>
          </div>
          <Link href="/trajets/nouveau" className="rounded-xl bg-[#0B9E63] hover:bg-[#0A8D58] text-white font-bold text-sm px-5 py-3 transition-colors shadow-lg shadow-[#0B9E63]/25 whitespace-nowrap">
            + Nouveau trajet
          </Link>
        </div>

        <div className={`rounded-2xl p-5 mb-6 border ${horizon.conforme ? 'bg-[#0B9E63]/6 border-[#0B9E63]/20' : 'bg-[#E6B84C]/10 border-[#E6B84C]/30'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${horizon.conforme ? 'bg-[#0B9E63]/15' : 'bg-[#E6B84C]/20'}`}><span className="text-base">{horizon.conforme ? '✓' : '⚠'}</span></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#14201A]">{horizon.conforme ? 'Programme a jour' : 'Programme incomplet'}</p>
              <p className="text-sm text-[#64746C] mt-0.5">{horizon.message}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-extrabold text-[#14201A]">{horizon.horizon_jours}j</p>
              <p className="text-xs text-[#9AA69F]">seuil : {horizon.seuil_alerte}j</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7ECE8] p-4 mb-5">
          <label className="block text-[11px] font-semibold text-[#64746C] mb-2">Recherche globale sur tous les trajets</label>
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Numero de voyage, ville, chauffeur, date, bus..." className="w-full rounded-xl px-4 py-3 text-[13px]" />
          <p className="text-[10px] text-[#8B9890] mt-2">Cette recherche parcourt la page sur toutes les dates.</p>
        </div>

        {recherche.trim() && (
          <div className="bg-white rounded-2xl border border-[#E7ECE8] overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-[#E7ECE8]">
              <h2 className="text-sm font-bold text-[#14201A]">Resultats de recherche ({resultatsRecherche.length})</h2>
            </div>
            {resultatsRecherche.length === 0 ? (
              <div className="p-6 text-[12px] text-[#64746C]">Aucun trajet ne correspond a cette recherche.</div>
            ) : (
              <div className="divide-y divide-[#E7ECE8]">
                {resultatsRecherche.map((t) => (
                  <div key={`search-${t.id}`} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-extrabold text-[#14201A]">{t.ville_depart} → {t.ville_arrivee}</p>
                        <p className="text-[12px] text-[#64746C] mt-1">{t.numero_voyage} · {t.date_depart.split('-').reverse().join('/')} · {t.heure_depart} · {t.nom_bus}</p>
                        <p className="text-[11px] text-[#8B9890] mt-1">{libelleRetard(t.retardDeclareMinutes)}{t.sourceRetard ? ` · declaration ${t.sourceRetard}` : ''}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stylesCategorie[t.categorie]}`}>{libellesCategorie[t.categorie]}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stylesStatut[t.statut]}`}>{libellesStatut[t.statut]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DateNavigator date={dateChoisie} onChange={setDateChoisie} className="mb-6" />

        <div className="bg-white rounded-2xl border border-[#E7ECE8] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E7ECE8]">
            <h2 className="text-sm font-bold text-[#14201A]">{dateChoisie === AUJOURDHUI ? "Trajets d'aujourd'hui" : 'Trajets ce jour-la'} ({trajetsDuJour.length})</h2>
          </div>

          {trajetsDuJour.length === 0 ? (
            <div className="p-10 text-center"><p className="text-sm text-[#64746C]">Aucun trajet programme ce jour-la.</p></div>
          ) : (
            <div className="divide-y divide-[#E7ECE8]">
              {trajetsDuJour.map((t) => (
                <div key={t.id} className="px-5 py-4 hover:bg-[#F6F8F6] transition-colors">
                  <div className="flex flex-wrap items-start gap-4 justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <p className="text-sm font-bold text-[#14201A]">{t.heure_depart}</p>
                        <p className="text-sm font-bold text-[#14201A]">{t.ville_depart} → {t.ville_arrivee}</p>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stylesCategorie[t.categorie]}`}>{libellesCategorie[t.categorie]}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stylesStatut[t.statut]}`}>{libellesStatut[t.statut]}</span>
                      </div>
                      <p className="text-xs text-[#64746C]">{t.numero_voyage} · {t.nom_bus} · {t.chauffeur} {t.heure_arrivee_estimee ? `· arrivee ${t.heure_arrivee_estimee}` : ''}</p>
                      <p className="text-[11px] text-[#8B9890] mt-1">{libelleRetard(t.retardDeclareMinutes)}{t.sourceRetard ? ` · declaration ${t.sourceRetard}` : ''}</p>
                      <p className="text-[11px] text-[#8B9890] mt-1">Depart : {t.point_depart} · Arrivee : {t.point_arrivee}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap justify-end">
                      <button onClick={() => setDialogueRetard(t)} className="rounded-xl bg-[#E6B84C]/16 text-[#8A6A1E] font-bold text-[11px] px-4 py-2.5">Declarer un retard</button>
                      <button onClick={() => setDialogueArret(t)} className="rounded-xl bg-[#D9534F]/12 text-[#D9534F] font-bold text-[11px] px-4 py-2.5">Arreter le trajet</button>
                      <Link href={lienDuplication(t)} className="rounded-xl bg-[#14201A] text-white font-bold text-[11px] px-4 py-2.5">Dupliquer</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {dialogueRetard && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[70]" onClick={() => setDialogueRetard(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-7 max-w-md w-full">
            <p className="text-[17px] font-extrabold text-[#14201A] mb-2">Declarer un retard</p>
            <p className="text-[11px] text-[#64746C] mb-4">Indique le retard declare par le chauffeur ou par l'agence. Exemple : 30 minutes, 60 minutes, 1h30.</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button type="button" onClick={() => setSourceRetard('chauffeur')} className={`rounded-xl px-3 py-2.5 text-[11px] font-bold ${sourceRetard === 'chauffeur' ? 'bg-[#14201A] text-white' : 'bg-[#F1F4F1] text-[#14201A]'}`}>Declaration chauffeur</button>
              <button type="button" onClick={() => setSourceRetard('agence')} className={`rounded-xl px-3 py-2.5 text-[11px] font-bold ${sourceRetard === 'agence' ? 'bg-[#14201A] text-white' : 'bg-[#F1F4F1] text-[#14201A]'}`}>Declaration agence</button>
            </div>
            <input value={minutesRetard} onChange={(e) => setMinutesRetard(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Retard en minutes" className="w-full rounded-xl px-4 py-3 text-[13px] mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setDialogueRetard(null)} className="flex-1 rounded-xl bg-[#F1F4F1] text-[#14201A] font-bold text-[11px] py-3">Annuler</button>
              <button onClick={declarerRetard} className="flex-1 rounded-xl bg-[#E6B84C] text-[#14201A] font-bold text-[11px] py-3">Valider</button>
            </div>
          </div>
        </div>
      )}

      {dialogueArret && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[70]" onClick={() => setDialogueArret(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-7 max-w-md w-full">
            <p className="text-[17px] font-extrabold text-[#14201A] mb-2">Arreter le trajet</p>
            <p className="text-[11px] text-[#64746C] mb-4">Pour confirmer, ecris <strong>ARRETER</strong> ci-dessous.</p>
            <input value={texteArret} onChange={(e) => setTexteArret(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[13px] mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setDialogueArret(null)} className="flex-1 rounded-xl bg-[#F1F4F1] text-[#14201A] font-bold text-[11px] py-3">Annuler</button>
              <button onClick={arreterTrajet} disabled={texteArret.trim().toUpperCase() !== 'ARRETER'} className="flex-1 rounded-xl bg-[#D9534F] disabled:opacity-40 text-white font-bold text-[11px] py-3">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </LayoutAgence>
  );
}
