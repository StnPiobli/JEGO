'use client';

// BRANCHÉ SUR LE VRAI BACKEND, sans repli démo.
// GET /api/trajets, PUT :id/retard { retard_minutes }, PUT :id/annuler { motif }.
// Le départ est déclaré par le chauffeur depuis jego_mobile
// (PUT /api/chauffeurs/trajets/:id/depart) — pas depuis ici, l'agence
// n'a pas à dupliquer cette déclaration.
// Les points précis de départ/arrivée par arrêt n'existent pas encore
// (chantier tronçons/multi-arrêts différé) — non affichés pour l'instant.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { Panel, Badge, BtnMini, ToastDemo } from '../components/ui';
import { addDaysToInput, todayInputDate } from '../lib/date';
import { apiFetch } from '../lib/api';

type Trajet = {
  id: string;
  date_depart: string;
  heure_depart: string;
  heure_arrivee_estimee: string | null;
  prix_base: number;
  categorie: 'standard' | 'vip' | 'express' | 'nuit';
  statut: 'programme' | 'en_cours' | 'retard' | 'termine' | 'annule';
  ville_depart: string;
  ville_arrivee: string;
  nom_bus: string;
  chauffeur?: string | null;
  retard_minutes?: number;
  arrets?: string[];
};

type ChauffeurOption = { id: string; nom: string; prenom: string; desactive_urgence: boolean };

const AUJOURDHUI = todayInputDate();

const horizonVide = { horizon_jours: 0, seuil_alerte: 14, conforme: true, message: '' };

const libellesCategorie: Record<Trajet['categorie'], string> = { standard: 'Standard', vip: 'VIP', express: 'Express', nuit: 'Nuit' };
const libellesStatut: Record<Trajet['statut'], string> = { programme: 'Programmé', en_cours: 'En cours', retard: 'Retard', termine: 'Terminé', annule: 'Annulé' };
const couleurStatut: Record<Trajet['statut'], 'green' | 'amber' | 'red' | 'grey'> = { programme: 'green', en_cours: 'amber', retard: 'red', termine: 'grey', annule: 'red' };

function identifiantAffichage(t: Trajet): string {
  const date = t.date_depart.replace(/-/g, '').slice(2);
  const heure = t.heure_depart.replace(':', '');
  const abrevDepart = t.ville_depart.slice(0, 3).toUpperCase();
  const abrevArrivee = t.ville_arrivee.slice(0, 3).toUpperCase();
  return `JG-${date}-${heure}-${abrevDepart}${abrevArrivee}`;
}

function libelleRetard(minutes: number) {
  if (!minutes) return 'Aucun retard déclaré';
  if (minutes < 60) return `Retard de ${minutes} minutes`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste === 0 ? `Retard de ${heures}h` : `Retard de ${heures}h${String(reste).padStart(2, '0')}`;
}

export default function ProgrammationTrajets() {
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dateChoisie, setDateChoisie] = useState(AUJOURDHUI);
  const [recherche, setRecherche] = useState('');
  const [horizon, setHorizon] = useState(horizonVide);

  const [dialogueRetard, setDialogueRetard] = useState<Trajet | null>(null);
  const [minutesRetard, setMinutesRetard] = useState('');
  const [dialogueArret, setDialogueArret] = useState<Trajet | null>(null);
  const [motifArret, setMotifArret] = useState('');
  const [texteConfirmation, setTexteConfirmation] = useState('');
  const [dialogueSuppression, setDialogueSuppression] = useState<Trajet | null>(null);
  const [texteSuppression, setTexteSuppression] = useState('');
  const [chauffeurs, setChauffeurs] = useState<ChauffeurOption[]>([]);
  const [dialogueChauffeur, setDialogueChauffeur] = useState<Trajet | null>(null);
  const [chauffeurChoisi, setChauffeurChoisi] = useState('');

  function notifier(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  }

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch('/api/trajets');
      setTrajets(data.trajets || []);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Impossible de charger les trajets.');
      setTrajets([]);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { charger(); }, []);

  useEffect(() => {
    apiFetch('/api/programmation/mon-horizon')
      .then((data) => setHorizon(data))
      .catch(() => setHorizon(horizonVide));
  }, []);

  useEffect(() => {
    apiFetch('/api/chauffeurs')
      .then((data) => setChauffeurs((data.chauffeurs || []).filter((c: ChauffeurOption) => !c.desactive_urgence)))
      .catch(() => setChauffeurs([]));
  }, []);

  const trajetsDuJour = useMemo(() => trajets.filter((t) => t.date_depart === dateChoisie && t.statut !== 'annule'), [trajets, dateChoisie]);

  const resultatsRecherche = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return [];
    return trajets.filter((t) => [
      identifiantAffichage(t), t.date_depart, t.heure_depart, t.ville_depart, t.ville_arrivee, t.nom_bus, t.chauffeur,
    ].join(' ').toLowerCase().includes(terme));
  }, [recherche, trajets]);

  async function declarerRetard() {
    if (!dialogueRetard || !minutesRetard) return;
    const minutes = Math.max(1, Number(minutesRetard));
    try {
      await apiFetch(`/api/trajets/${dialogueRetard.id}/retard`, {
        method: 'PUT',
        body: JSON.stringify({ retard_minutes: minutes }),
      });
      await charger();
      notifier(`Retard de ${minutes} min déclaré`);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setDialogueRetard(null);
      setMinutesRetard('');
    }
  }

  async function arreterTrajet() {
    if (!dialogueArret || texteConfirmation.trim().toUpperCase() !== 'ARRETER' || !motifArret.trim()) return;
    try {
      await apiFetch(`/api/trajets/${dialogueArret.id}/annuler`, {
        method: 'PUT',
        body: JSON.stringify({ motif: motifArret }),
      });
      await charger();
      notifier('Trajet annulé');
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setDialogueArret(null);
      setMotifArret('');
      setTexteConfirmation('');
    }
  }

  async function changerChauffeur() {
    if (!dialogueChauffeur || !chauffeurChoisi) return;
    try {
      await apiFetch(`/api/trajets/${dialogueChauffeur.id}/chauffeur`, {
        method: 'PUT',
        body: JSON.stringify({ chauffeur_id: chauffeurChoisi }),
      });
      await charger();
      notifier('Chauffeur mis a jour');
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setDialogueChauffeur(null);
      setChauffeurChoisi('');
    }
  }

  async function supprimerTrajet() {
    if (!dialogueSuppression || texteSuppression.trim().toUpperCase() !== 'SUPPRIMER') return;
    try {
      await apiFetch(`/api/trajets/${dialogueSuppression.id}`, { method: 'DELETE' });
      await charger();
      notifier('Trajet supprimé');
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDialogueSuppression(null);
      setTexteSuppression('');
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

        {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}

        <div className={`rounded-2xl p-5 mb-6 border ${horizon.conforme ? 'bg-ok-bg border-green-300' : 'bg-amber-bg border-amber'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${horizon.conforme ? 'bg-ok-bg' : 'bg-amber-bg'}`}><span className="text-base">{horizon.conforme ? '✓' : '⚠'}</span></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">{horizon.conforme ? 'Programme à jour' : 'Programme incomplet'}</p>
              <p className="text-sm text-ink-soft mt-0.5">{horizon.message}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-display font-bold text-ink">{horizon.horizon_jours}j</p>
              <p className="text-xs text-ink-soft">seuil : {horizon.seuil_alerte}j</p>
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
                      <p className="text-[14px] font-bold text-ink">{t.ville_depart} → {t.ville_arrivee} <span className="font-mono text-[10px] text-ink-soft">{identifiantAffichage(t)}</span></p>
                      {t.arrets && t.arrets.length > 0 && <p className="text-[11px] text-ink-soft">Via {t.arrets.join(', ')}</p>}
                      <p className="text-[12px] text-ink-soft mt-1">{t.date_depart.split('-').reverse().join('/')} · {t.heure_depart} · {t.nom_bus}</p>
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
                        <span className="font-mono text-[10px] text-ink-soft">{identifiantAffichage(t)}</span>
                        <Badge color="grey">{libellesCategorie[t.categorie]}</Badge>
                        <Badge color={couleurStatut[t.statut]}>{libellesStatut[t.statut]}</Badge>
                        {t.retard_minutes != null && t.retard_minutes > 0 && (
                          <Badge color="amber">{libelleRetard(t.retard_minutes)}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-ink-soft">
                        {t.chauffeur ?? 'Chauffeur non assigné'} · {t.nom_bus} {t.heure_arrivee_estimee ? `· arrivée ${t.heure_arrivee_estimee}` : ''}
                      </p>
                      {t.arrets && t.arrets.length > 0 && (
                        <p className="text-[11px] text-ink-soft mt-1">Via {t.arrets.join(', ')}</p>
                      )}
                    </div>

                    <div className="flex gap-1.5 flex-wrap justify-end">
                      <Link href={`/trajets/plan?id=${t.id}`} className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg mr-1.5 bg-ink text-white border border-ink">
                        🎟️ Vendre un billet (guichet)
                      </Link>
                      {t.statut === 'programme' && (
                        <button onClick={() => { setDialogueChauffeur(t); setChauffeurChoisi(''); }} className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg mr-1.5 bg-off-white border border-line text-ink">
                          Changer de chauffeur
                        </button>
                      )}
                      {t.statut !== 'annule' && t.statut !== 'termine' && (
                        <>
                          <button onClick={() => setDialogueRetard(t)} className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg mr-1.5 bg-amber text-white border border-amber">
                            Déclarer un retard
                          </button>
                          <BtnMini variant="danger" onClick={() => setDialogueArret(t)}>Arrêter le trajet</BtnMini>
                        </>
                      )}
                      <BtnMini variant="danger" onClick={() => setDialogueSuppression(t)}>Supprimer</BtnMini>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

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
      {dialogueChauffeur && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[70]" onClick={() => setDialogueChauffeur(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-2xl p-7 max-w-md w-full border border-line">
            <p className="text-[16px] font-display font-semibold text-ink mb-2">Changer de chauffeur</p>
            <p className="text-[11px] text-ink-soft mb-3">Trajet {identifiantAffichage(dialogueChauffeur)} — chauffeur actuel : {dialogueChauffeur.chauffeur ?? 'aucun'}</p>
            <select value={chauffeurChoisi} onChange={(e) => setChauffeurChoisi(e.target.value)} className="w-full rounded-lg border border-line bg-off-white px-4 py-2.5 text-[13px] mb-4">
              <option value="">Choisir un chauffeur...</option>
              {chauffeurs.map((c) => (
                <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setDialogueChauffeur(null)} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-[11px] py-2.5">Annuler</button>
              <button onClick={changerChauffeur} disabled={!chauffeurChoisi} className="flex-1 rounded-lg bg-green-700 disabled:opacity-40 text-white font-semibold text-[11px] py-2.5">Confirmer</button>
            </div>
          </div>
        </div>
      )}
      {dialogueSuppression && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[70]" onClick={() => setDialogueSuppression(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-2xl p-7 max-w-md w-full border border-line">
            <p className="text-[16px] font-display font-semibold text-ink mb-2">Supprimer ce trajet ?</p>
            <p className="text-[11px] text-ink-soft mb-3">Si des billets ont déjà été vendus, chaque voyageur sera remboursé à 100% et notifié automatiquement. Uniquement possible pour un trajet pas encore débuté. Pour confirmer, écris <strong>SUPPRIMER</strong> ci-dessous.</p>
            <input value={texteSuppression} onChange={(e) => setTexteSuppression(e.target.value)} placeholder="SUPPRIMER" className="w-full rounded-lg border border-line bg-off-white px-4 py-2.5 text-[13px] mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setDialogueSuppression(null)} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-[11px] py-2.5">Annuler</button>
              <button onClick={supprimerTrajet} disabled={texteSuppression.trim().toUpperCase() !== 'SUPPRIMER'} className="flex-1 rounded-lg bg-red disabled:opacity-40 text-white font-semibold text-[11px] py-2.5">Confirmer</button>
            </div>
          </div>
        </div>
      )}
      <ToastDemo message={toast} />
    </LayoutAgence>
  );
}
