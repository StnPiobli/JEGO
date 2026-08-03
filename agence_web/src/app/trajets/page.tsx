'use client';

// ✅ BRANCHÉ (repli démo) — GET /api/trajets, PUT :id/retard { retard_minutes,
// nouvelle_heure_depart?, nouvelle_heure_arrivee? }, PUT :id/annuler { motif }.
// ⚠️ La vraie liste ne renvoie ni numero_voyage, ni points précis de
// départ/arrivée, ni nom du chauffeur — affichés seulement en démo.
// GET /api/programmation/mon-horizon existe aussi (bandeau horizon) mais
// reste ici illustré en démo tant que non branché.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { Panel, Badge, BtnMini, ToastDemo } from '../components/ui';
import { addDaysToInput, todayInputDate } from '../lib/date';
import { apiFetch } from '../lib/api';

type Trajet = {
  id: string | number;
  date_depart: string;
  heure_depart: string;
  heure_arrivee_estimee: string | null;
  prix_base: number;
  categorie: 'standard' | 'vip' | 'express' | 'nuit';
  statut: 'programme' | 'en_cours' | 'retard' | 'termine' | 'annule';
  ville_depart: string;
  ville_arrivee: string;
  nom_bus: string;
  // Démo uniquement — absents de la vraie réponse API :
  numero_voyage?: string;
  point_depart?: string;
  point_arrivee?: string;
  chauffeur?: string;
  retard_minutes?: number;
  retard_declare_a?: string; // ISO — pour afficher "il y a X min" en direct
  retard_declare_par?: 'chauffeur' | 'agence';
  depart_effectue?: boolean;
};

const AUJOURDHUI = todayInputDate();
const DEMAIN = addDaysToInput(AUJOURDHUI, 1);
const HIER = addDaysToInput(AUJOURDHUI, -1);

const horizonDemo = {
  horizon_jours: 9, seuil_alerte: 14, conforme: false,
  message: 'Alerte : horizon de programmation sous le seuil (9 jours restants, minimum 14 requis)',
};

const trajetsDemoInitial: Trajet[] = [
  { id: '1', numero_voyage: 'JG-260727-0700-DLYDE', date_depart: AUJOURDHUI, heure_depart: '07:00', heure_arrivee_estimee: '11:30', prix_base: 4000, categorie: 'vip', statut: 'en_cours', ville_depart: 'Douala', ville_arrivee: 'Yaounde', nom_bus: 'Confort Express 01', point_depart: 'Bonaberi, apres le bar Chez Paul', point_arrivee: 'Mvan, face a la pharmacie', chauffeur: "Paul Eto'o" },
  { id: '2', numero_voyage: 'JG-260727-1400-YDE-DLA', date_depart: AUJOURDHUI, heure_depart: '14:00', heure_arrivee_estimee: '18:15', prix_base: 3500, categorie: 'standard', statut: 'programme', ville_depart: 'Yaounde', ville_arrivee: 'Douala', nom_bus: 'Confort 02', point_depart: 'Mvan, face a la pharmacie', point_arrivee: 'Bonaberi, apres le bar Chez Paul', chauffeur: 'Andre Nkeng' },
  { id: '3', numero_voyage: 'JG-260728-0630-DLA-BFM', date_depart: DEMAIN, heure_depart: '06:30', heure_arrivee_estimee: '10:30', prix_base: 4200, categorie: 'express', statut: 'programme', ville_depart: 'Douala', ville_arrivee: 'Bafoussam', nom_bus: 'Express 03', point_depart: 'Akwa, gare routiere centrale', point_arrivee: 'Centre-ville', chauffeur: "Paul Eto'o" },
  { id: '4', numero_voyage: 'JG-260726-1830-KBI-DLA', date_depart: HIER, heure_depart: '18:30', heure_arrivee_estimee: '21:15', prix_base: 3200, categorie: 'standard', statut: 'retard', ville_depart: 'Kribi', ville_arrivee: 'Douala', nom_bus: 'Confort 04', point_depart: 'Agence JEGO Kribi', point_arrivee: 'Bonaberi', chauffeur: 'Marc Bella' },
];

const libellesCategorie: Record<Trajet['categorie'], string> = { standard: 'Standard', vip: 'VIP', express: 'Express', nuit: 'Nuit' };
const libellesStatut: Record<Trajet['statut'], string> = { programme: 'Programmé', en_cours: 'En cours', retard: 'Retard', termine: 'Terminé', annule: 'Annulé' };
const couleurStatut: Record<Trajet['statut'], 'green' | 'amber' | 'red' | 'grey'> = { programme: 'green', en_cours: 'amber', retard: 'red', termine: 'grey', annule: 'red' };

function libelleRetard(minutes: number) {
  if (!minutes) return 'Aucun retard déclaré';
  if (minutes < 60) return `Retard de ${minutes} minutes`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste === 0 ? `Retard de ${heures}h` : `Retard de ${heures}h${String(reste).padStart(2, '0')}`;
}

function tempsEcoule(iso?: string): string {
  if (!iso) return '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  return `il y a ${heures}h${String(minutes % 60).padStart(2, '0')}`;
}

export default function ProgrammationTrajets() {
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [modeDemo, setModeDemo] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dateChoisie, setDateChoisie] = useState(AUJOURDHUI);
  const [recherche, setRecherche] = useState('');

  const [dialogueRetard, setDialogueRetard] = useState<Trajet | null>(null);
  const [minutesRetard, setMinutesRetard] = useState('');
  // (déclarant retiré — c'est toujours l'agence qui déclare ici)
  const [dialogueDepart, setDialogueDepart] = useState<Trajet | null>(null);
  const [texteConfirmationDepart, setTexteConfirmationDepart] = useState('');
  const [dialogueArret, setDialogueArret] = useState<Trajet | null>(null);
  const [motifArret, setMotifArret] = useState('');
  const [texteConfirmation, setTexteConfirmation] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const intervalle = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(intervalle);
  }, []);

  function notifier(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch('/api/trajets');
      if (data.trajets && data.trajets.length > 0) {
        setTrajets(data.trajets);
        setModeDemo(false);
      } else {
        // Backend joignable mais table vide — bascule sur la démo pour rester testable.
        setTrajets(trajetsDemoInitial);
        setModeDemo(true);
      }
    } catch {
      setTrajets(trajetsDemoInitial);
      setModeDemo(true);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { charger(); }, []);

  const trajetsDuJour = useMemo(() => trajets.filter((t) => t.date_depart === dateChoisie), [trajets, dateChoisie]);

  const resultatsRecherche = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return [];
    return trajets.filter((t) => [
      t.numero_voyage, t.date_depart, t.heure_depart, t.ville_depart, t.ville_arrivee, t.nom_bus, t.chauffeur,
    ].join(' ').toLowerCase().includes(terme));
  }, [recherche, trajets]);

  async function declarerRetard() {
    if (!dialogueRetard || !minutesRetard) return;
    const minutes = Math.max(1, Number(minutesRetard));
    const maintenant = new Date().toISOString();
    try {
      if (modeDemo) {
        setTrajets((prev) => prev.map((t) => (t.id === dialogueRetard.id ? { ...t, statut: 'retard', retard_minutes: (t.retard_minutes || 0) + minutes, retard_declare_a: maintenant, retard_declare_par: 'agence' } : t)));
      } else {
        await apiFetch(`/api/trajets/${dialogueRetard.id}/retard`, {
          method: 'PUT',
          body: JSON.stringify({ retard_minutes: minutes }),
        });
        await charger();
      }
      notifier(`Retard de ${minutes} min déclaré`);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setDialogueRetard(null);
      setMinutesRetard('');
    }
  }

  function declarerDepart() {
    if (!dialogueDepart || texteConfirmationDepart.trim().toUpperCase() !== 'DEPART') return;
    setTrajets((prev) => prev.map((t) => (t.id === dialogueDepart.id ? { ...t, statut: 'en_cours', depart_effectue: true } : t)));
    notifier('Départ déclaré (démo — aucune route backend pour ça)');
    setDialogueDepart(null);
    setTexteConfirmationDepart('');
  }

  async function arreterTrajet() {
    if (!dialogueArret || texteConfirmation.trim().toUpperCase() !== 'ARRETER' || !motifArret.trim()) return;
    try {
      if (modeDemo) {
        setTrajets((prev) => prev.map((t) => (t.id === dialogueArret.id ? { ...t, statut: 'annule' } : t)));
      } else {
        await apiFetch(`/api/trajets/${dialogueArret.id}/annuler`, {
          method: 'PUT',
          body: JSON.stringify({ motif: motifArret }),
        });
        await charger();
      }
      notifier('Trajet annulé');
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setDialogueArret(null);
      setMotifArret('');
      setTexteConfirmation('');
    }
  }

  return (
    <LayoutAgence>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Programmation des trajets</h1>
            <p className="text-sm text-ink-soft mt-1">Gère tes trajets programmés et maintiens ton horizon à jour.</p>
          </div>
          <Link href="/trajets/nouveau" className="rounded-lg bg-green-700 hover:bg-green-900 text-white font-semibold text-sm px-5 py-2.5 transition-colors whitespace-nowrap">
            + Nouveau trajet
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3 mb-4">
          {modeDemo ? (
            <div className="text-xs font-semibold text-amber bg-amber-bg rounded-lg px-3 py-2">Mode démo — données factices</div>
          ) : <div />}
          <button onClick={() => { setTrajets(trajetsDemoInitial); setModeDemo(true); }} className="text-[11px] font-bold text-green-700 underline shrink-0">
            Voir des données de démonstration
          </button>
        </div>
        {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}

        <div className={`rounded-2xl p-5 mb-6 border ${horizonDemo.conforme ? 'bg-ok-bg border-green-300' : 'bg-amber-bg border-amber'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${horizonDemo.conforme ? 'bg-ok-bg' : 'bg-amber-bg'}`}><span className="text-base">{horizonDemo.conforme ? '✓' : '⚠'}</span></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">{horizonDemo.conforme ? 'Programme à jour' : 'Programme incomplet'}</p>
              <p className="text-sm text-ink-soft mt-0.5">{horizonDemo.message} <span className="italic">(démo — GET /api/programmation/mon-horizon existe, pas encore branché)</span></p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-display font-bold text-ink">{horizonDemo.horizon_jours}j</p>
              <p className="text-xs text-ink-soft">seuil : {horizonDemo.seuil_alerte}j</p>
            </div>
          </div>
        </div>

        <Panel>
          <div className="p-4">
            <label className="block text-[11px] font-semibold text-ink-soft mb-2">Recherche globale sur tous les trajets</label>
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Numéro de voyage, ville, chauffeur, date, bus..." className="w-full rounded-lg border border-line bg-off-white px-4 py-2.5 text-[13px]" />
          </div>
        </Panel>

        {recherche.trim() && (
          <div className="mt-4">
            <Panel title={`Résultats de recherche (${resultatsRecherche.length})`}>
              {resultatsRecherche.length === 0 ? (
                <div className="p-6 text-[12px] text-ink-soft">Aucun trajet ne correspond à cette recherche.</div>
              ) : (
                <div className="divide-y divide-line">
                  {resultatsRecherche.map((t) => (
                    <div key={`search-${t.id}`} className="px-5 py-4">
                      <p className="text-[14px] font-bold text-ink">{t.ville_depart} → {t.ville_arrivee} <span className="font-mono text-[10px] text-ink-soft">#{t.id}</span></p>
                      <p className="text-[12px] text-ink-soft mt-1">{t.numero_voyage ?? '—'} · {t.date_depart.split('-').reverse().join('/')} · {t.heure_depart} · {t.nom_bus}</p>
                      <div className="mt-1.5"><Badge color={couleurStatut[t.statut]}>{libellesStatut[t.statut]}</Badge></div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        <div className="mt-6 mb-4"><DateNavigator date={dateChoisie} onChange={setDateChoisie} /></div>

        <Panel title={`${dateChoisie === AUJOURDHUI ? "Trajets d'aujourd'hui" : 'Trajets ce jour-là'} (${trajetsDuJour.length})`}>
          {chargement ? (
            <div className="p-10 text-center text-sm text-ink-soft">Chargement…</div>
          ) : trajetsDuJour.length === 0 ? (
            <div className="p-10 text-center"><p className="text-sm text-ink-soft">Aucun trajet programmé ce jour-là.</p></div>
          ) : (
            <div className="divide-y divide-line">
              {trajetsDuJour.map((t) => (
                <div key={t.id} className="px-5 py-4 hover:bg-green-500/5 transition-colors">
                  <div className="flex flex-wrap items-start gap-4 justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <p className="text-sm font-bold text-ink">{t.heure_depart}</p>
                        <p className="text-sm font-bold text-ink">{t.ville_depart} → {t.ville_arrivee}</p>
                        <span className="font-mono text-[10px] text-ink-soft">#{t.id}</span>
                        <Badge color="grey">{libellesCategorie[t.categorie]}</Badge>
                        <Badge color={t.depart_effectue ? 'green' : couleurStatut[t.statut]}>{t.depart_effectue ? 'Départ effectué' : libellesStatut[t.statut]}</Badge>
                        {t.retard_minutes != null && (
                          <Badge color="amber">
                            +{t.retard_minutes} min ({t.retard_declare_par === 'chauffeur' ? 'par le chauffeur' : 'par l’agence'}, {tempsEcoule(t.retard_declare_a)})
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-ink-soft">{t.numero_voyage ?? '—'} · {t.nom_bus} {t.heure_arrivee_estimee ? `· arrivée ${t.heure_arrivee_estimee}` : ''}</p>
                      {(t.point_depart || t.point_arrivee) && <p className="text-[11px] text-ink-soft mt-1">Départ : {t.point_depart} · Arrivée : {t.point_arrivee}</p>}
                    </div>

                    <div className="flex gap-1.5 flex-wrap justify-end">
                      <Link href={`/trajets/plan?id=${t.id}`} className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg mr-1.5 bg-ink text-white border border-ink">
                        🎟️ Vendre un billet (guichet)
                      </Link>
                      {t.statut !== 'annule' && t.statut !== 'termine' && (
                        <>
                          {!t.depart_effectue && (
                            <button onClick={() => setDialogueDepart(t)} className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg mr-1.5 bg-green-700 text-white border border-green-700">
                              Déclarer le départ
                            </button>
                          )}
                          <button onClick={() => setDialogueRetard(t)} className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg mr-1.5 bg-amber text-white border border-amber">
                            Déclarer un retard
                          </button>
                          <BtnMini variant="danger" onClick={() => setDialogueArret(t)}>Arrêter le trajet</BtnMini>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {dialogueDepart && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[70]" onClick={() => setDialogueDepart(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-2xl p-7 max-w-md w-full border border-line">
            <p className="text-[16px] font-display font-semibold text-ink mb-2">Déclarer le départ — {dialogueDepart.ville_depart} → {dialogueDepart.ville_arrivee}</p>
            <p className="text-[11px] text-ink-soft mb-3">Pour confirmer, écris <strong>DEPART</strong> ci-dessous.</p>
            <input value={texteConfirmationDepart} onChange={(e) => setTexteConfirmationDepart(e.target.value)} className="w-full rounded-lg border border-line bg-off-white px-4 py-2.5 text-[13px] mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setDialogueDepart(null); setTexteConfirmationDepart(''); }} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-[11px] py-2.5">Annuler</button>
              <button onClick={declarerDepart} disabled={texteConfirmationDepart.trim().toUpperCase() !== 'DEPART'} className="flex-1 rounded-lg bg-green-700 disabled:opacity-40 text-white font-semibold text-[11px] py-2.5">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {dialogueRetard && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[70]" onClick={() => setDialogueRetard(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-2xl p-7 max-w-md w-full border border-line">
            <p className="text-[16px] font-display font-semibold text-ink mb-2">Déclarer un retard</p>
            <p className="text-[11px] text-ink-soft mb-3">Chaque déclaration s&apos;ajoute au retard déjà en place, elle ne le remplace pas.</p>
            <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">Retard supplémentaire, en minutes</label>
            <input value={minutesRetard} onChange={(e) => setMinutesRetard(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Ex : 45 (minutes)" className="w-full rounded-lg border border-line bg-off-white px-4 py-2.5 text-[13px] mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setDialogueRetard(null)} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-[11px] py-2.5">Annuler</button>
              <button onClick={declarerRetard} className="flex-1 rounded-lg bg-amber text-white font-semibold text-[11px] py-2.5">Valider</button>
            </div>
          </div>
        </div>
      )}

      {dialogueArret && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[70]" onClick={() => setDialogueArret(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-2xl p-7 max-w-md w-full border border-line">
            <p className="text-[16px] font-display font-semibold text-ink mb-2">Arrêter le trajet</p>
            <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">Motif d&apos;annulation (obligatoire)</label>
            <textarea value={motifArret} onChange={(e) => setMotifArret(e.target.value)} rows={2} className="w-full rounded-lg border border-line bg-off-white px-4 py-2.5 text-[13px] mb-3" />
            <p className="text-[11px] text-ink-soft mb-2">Pour confirmer, écris <strong>ARRETER</strong> ci-dessous.</p>
            <input value={texteConfirmation} onChange={(e) => setTexteConfirmation(e.target.value)} className="w-full rounded-lg border border-line bg-off-white px-4 py-2.5 text-[13px] mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setDialogueArret(null)} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-[11px] py-2.5">Annuler</button>
              <button onClick={arreterTrajet} disabled={texteConfirmation.trim().toUpperCase() !== 'ARRETER' || !motifArret.trim()} className="flex-1 rounded-lg bg-red disabled:opacity-40 text-white font-semibold text-[11px] py-2.5">Confirmer</button>
            </div>
          </div>
        </div>
      )}
      <ToastDemo message={toast} />
    </LayoutAgence>
  );
}
