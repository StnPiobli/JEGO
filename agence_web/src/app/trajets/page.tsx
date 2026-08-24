'use client';

// BRANCHÉ SUR LE VRAI BACKEND, sans repli démo.
// GET /api/trajets, PUT :id/retard { retard_minutes }, PUT :id/annuler { motif }.
// Le départ est déclaré par le chauffeur depuis jego_mobile
// (PUT /api/chauffeurs/trajets/:id/depart) — pas depuis ici, l'agence
// n'a pas à dupliquer cette déclaration.
// Les lieux de prise en charge par point (departure/arrets/arrivee)
// viennent de listerTrajets (points_detail), avec les prix par section
// si la ligne a plusieurs troncons vendables (prix_sections).

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
  categorie: 'standard' | 'mixte' | 'vip';
  statut: 'programme' | 'en_cours' | 'retard' | 'termine' | 'annule' | 'supprime';
  ville_depart: string;
  ville_arrivee: string;
  code_ville_depart?: string;
  code_ville_arrivee?: string;
  bus_id?: string;
  chauffeur_id?: string | null;
  nom_bus: string;
  chauffeur?: string | null;
  retard_minutes?: number;
  arrets?: string[];
  distribution_nourriture?: boolean;
  supplement_premium?: number;
  prix_bagage_supplementaire?: number;
  points_detail?: { ville: string; lieu: string | null; heure?: string | null }[];
  prix_sections?: { depart: string; arrivee: string; prix: number }[];
};

type ChauffeurOption = { id: string; nom: string; prenom: string; desactive_urgence: boolean };

const AUJOURDHUI = todayInputDate();

const horizonVide = { horizon_jours: 0, seuil_alerte: 14, conforme: true, message: '' };

const libellesCategorie: Record<Trajet['categorie'], string> = { standard: 'Standard', mixte: 'Mixte', vip: 'VIP' };

// "Nuit" et "Express" ne sont plus des choix stockes -- purement
// informatifs, calcules a l'affichage, jamais lies au prix (fixe a
// l'avance par l'agence quelle que soit l'heure ou les arrets).
function estDeNuit(heureDepart: string): boolean {
  const heure = parseInt(heureDepart.slice(0, 2), 10);
  return heure >= 22 || heure < 3;
}
function estExpress(t: Trajet): boolean {
  return !t.arrets || t.arrets.length === 0;
}
function departPasse(t: Trajet): boolean {
  return new Date() > new Date(`${t.date_depart}T${t.heure_depart}`);
}
// Affichage seulement : dès que l'heure de départ est passée, on
// montre "En cours" même si le chauffeur n'a pas encore déclaré son
// départ depuis l'app -- sans jamais modifier la vraie donnée stockée.
function statutAffiche(t: Trajet): Trajet['statut'] {
  if (t.statut === 'programme' && departPasse(t)) return 'en_cours';
  return t.statut;
}
function chaineHoraires(t: Trajet): string {
  const heures = [t.heure_depart];
  if (t.points_detail && t.points_detail.length > 2) {
    for (let i = 1; i < t.points_detail.length - 1; i++) {
      const h = t.points_detail[i].heure;
      if (h) heures.push(h);
    }
  }
  if (t.heure_arrivee_estimee) heures.push(t.heure_arrivee_estimee);
  return heures.join(' → ');
}
const libellesStatut: Record<Trajet['statut'], string> = { programme: 'Programmé', en_cours: 'En cours', retard: 'Retard', termine: 'Terminé', annule: 'Terminé', supprime: 'Supprimé' };
const couleurStatut: Record<Trajet['statut'], 'green' | 'amber' | 'red' | 'grey'> = { programme: 'green', en_cours: 'amber', retard: 'red', termine: 'grey', annule: 'red', supprime: 'grey' };

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

  const trajetsDuJour = useMemo(() => trajets.filter((t) => t.date_depart === dateChoisie), [trajets, dateChoisie]);

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
                      <div className="mt-1.5"><Badge color={couleurStatut[statutAffiche(t)]}>{libellesStatut[statutAffiche(t)]}</Badge></div>
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
                <div key={t.id} className={`px-5 py-4 transition-colors ${['annule', 'supprime'].includes(t.statut) ? 'opacity-50 bg-off-white/40' : 'hover:bg-green-500/5'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-sm font-bold text-ink whitespace-nowrap mr-3">
                        {chaineHoraires(t)}
                      </span>
                      <span className="text-sm">
                        {(t.points_detail && t.points_detail.length > 0
                          ? t.points_detail
                          : [{ ville: t.ville_depart, lieu: null }, { ville: t.ville_arrivee, lieu: null }]
                        ).map((p, i, arr) => (
                          <span key={i}>
                            <span className="font-bold text-ink">{p.ville}</span>
                            {p.lieu && <span className="text-ink-soft font-normal"> ({p.lieu})</span>}
                            {i < arr.length - 1 && <span className="text-ink-soft font-normal"> → </span>}
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge color="grey">{libellesCategorie[t.categorie]}</Badge>
                      {estDeNuit(t.heure_depart) && <Badge color="grey">Nuit</Badge>}
                      {estExpress(t) && <Badge color="grey">Express</Badge>}
                      <Badge color={couleurStatut[statutAffiche(t)]}>{libellesStatut[statutAffiche(t)]}</Badge>
                      {t.retard_minutes != null && t.retard_minutes > 0 && (
                        <Badge color="amber">{libelleRetard(t.retard_minutes)}</Badge>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 font-mono text-[10px] text-ink-soft">{identifiantAffichage(t)}</p>

                  <p className="mt-1.5 text-[11px] text-ink-soft">
                    <span className="font-semibold text-ink">Chauffeur :</span> {t.chauffeur ?? 'non assigné'}
                    {' / '}<span className="font-semibold text-ink">bus :</span> {t.nom_bus}
                    {' / '}<span className="font-semibold text-ink">Prix :</span> {t.prix_base} FCFA
                    {t.categorie === 'mixte' && t.supplement_premium != null && t.supplement_premium > 0 && (
                      <>{' / '}<span className="font-semibold text-ink">Premium :</span> +{t.supplement_premium} FCFA</>
                    )}
                    {t.prix_bagage_supplementaire != null && (
                      <>{' / '}<span className="font-semibold text-ink">Bagage :</span> {t.prix_bagage_supplementaire} FCFA</>
                    )}
                    {' / '}<span className="font-semibold text-ink">Repas :</span> {t.distribution_nourriture ? 'inclus' : 'non inclus'}
                  </p>

                  {t.prix_sections && t.prix_sections.length > 1 && (
                    <p className="mt-1 text-[11px] text-ink-soft">
                      <span className="font-semibold text-ink">Sections :</span>{' '}
                      {t.prix_sections.map((s, i) => (
                        <span key={i}>
                          {s.depart} → {s.arrivee} <span className="font-semibold text-ink">{s.prix} FCFA</span>
                          {i < (t.prix_sections?.length ?? 0) - 1 ? ' / ' : ''}
                        </span>
                      ))}
                    </p>
                  )}

                  {t.statut === 'annule' ? (
                    <p className="mt-2.5 text-[11.5px] text-ink-soft italic">Trajet terminé — plus aucune action possible.</p>
                  ) : t.statut === 'supprime' ? (
                    <p className="mt-2.5 text-[11.5px] text-ink-soft italic">Trajet supprimé — plus aucune action possible.</p>
                  ) : (
                  <div className="mt-2.5 flex gap-1.5 flex-wrap">
                    {departPasse(t) ? (
                      <span className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg mr-1.5 bg-line text-ink-soft cursor-not-allowed">
                        🎟️ Vendre un billet (guichet)
                      </span>
                    ) : (
                      <Link href={`/trajets/plan?id=${t.id}`} className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg mr-1.5 bg-ink text-white border border-ink">
                        🎟️ Vendre un billet (guichet)
                      </Link>
                    )}
                    {t.statut === 'programme' && (
                      departPasse(t) ? (
                        <span className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg mr-1.5 bg-line text-ink-soft cursor-not-allowed">
                          Changer de chauffeur
                        </span>
                      ) : (
                        <button onClick={() => { setDialogueChauffeur(t); setChauffeurChoisi(''); }} className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg mr-1.5 bg-off-white border border-line text-ink">
                          Changer de chauffeur
                        </button>
                      )
                    )}
                    {t.statut !== 'termine' && (
                      <>
                        <button onClick={() => setDialogueRetard(t)} className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg mr-1.5 bg-amber text-white border border-amber">
                          Déclarer un retard
                        </button>
                        <BtnMini variant="danger" onClick={() => setDialogueArret(t)}>Arrêter le trajet</BtnMini>
                      </>
                    )}
                    {departPasse(t) ? (
                      <span className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg bg-line text-ink-soft cursor-not-allowed">Supprimer</span>
                    ) : (
                      <BtnMini variant="danger" onClick={() => setDialogueSuppression(t)}>Supprimer</BtnMini>
                    )}
                    <Link
                      href={`/trajets/nouveau?dupliquer=1&ville_depart=${t.code_ville_depart ?? ''}&ville_arrivee=${t.code_ville_arrivee ?? ''}&bus_id=${t.bus_id ?? ''}&chauffeur_id=${t.chauffeur_id ?? ''}&point_depart=${encodeURIComponent(t.points_detail?.[0]?.lieu ?? '')}&point_arrivee=${encodeURIComponent(t.points_detail?.[(t.points_detail?.length ?? 1) - 1]?.lieu ?? '')}`}
                      className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg bg-off-white border border-line text-ink"
                    >
                      Dupliquer
                    </Link>
                  </div>
                  )}
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
