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
import { formatTelephone } from '../lib/format';

// Mot de confirmation tapé par l'agence. « ARRÊTER » avec accent est
// ce qu'on tape naturellement : il doit valoir « ARRETER ».
function motConfirme(texte: string, mot: string) {
  return texte.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === mot;
}

type Trajet = {
  id: string;
  numero: string;
  date_depart: string;
  heure_depart: string;
  heure_arrivee_estimee: string | null;
  prix_base: number;
  categorie: 'standard' | 'mixte' | 'vip';
  statut: 'programme' | 'en_cours' | 'retard' | 'termine' | 'annule' | 'supprime' | 'incident';
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
  signalements?: { passager: string; categorie: string; commentaire: string | null; seuil_atteint: boolean; heure: string }[];
  nb_litiges?: number;
  nb_avis?: number;
  nb_commentaires?: number;
  note_moyenne?: string | number | null;
};

type ChauffeurOption = { id: string; nom: string; prenom: string; desactive_urgence: boolean };

type PassagerTrajet = {
  numero?: string; id?: string; prenom?: string; nom?: string; telephone?: string;
  email?: string; siege?: string; statut?: string; qr_scanne?: boolean;
  prix_agence?: number; prix_total_client?: number;
  supplement_bagage?: number; quantite_bagages?: number;
  ville_embarquement?: string; ville_debarquement?: string;
};

type LitigeTrajet = {
  id: string; numero: string; motif: string; description: string; statut: string;
  gagnant?: string | null; decision?: string | null; date_ouverture?: string;
  heure_ouverture?: string; trajet_id?: string; client?: string;
  montant?: number; reponse_agence?: string | null; collectif?: boolean;
  nb_clients?: number; date_reponse?: string | null; heure_reponse?: string | null;
};

type FicheChauffeur = {
  id: string; nom: string; prenom: string; telephone: string; email?: string;
  desactive_urgence?: boolean; note_moyenne?: number | null;
  nombre_voyages?: number; statut?: string; cree_le?: string;
};

type FicheBus = {
  id: string; nom: string; type_bus?: string; nombre_sieges?: number;
  nombre_rangees?: number; disposition?: string;
  climatisation?: boolean; toilettes?: boolean; prises_usb?: boolean;
  wifi?: boolean; sieges_inclinables?: boolean;
};

type AvisTrajet = {
  id: string; note_globale: number; note_service: number | null; note_conduite: number | null;
  note_horaires: number | null; note_confort: number | null;
  commentaire: string | null; date_avis: string; voyageur: string | null;
};

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
// Statut « metier » : celui sur lequel se decident les actions. Un
// trajet en litige (etat interne « incident ») reste un trajet ordinaire
// -- memes boutons, memes regles -- seule l'etiquette litige le
// distingue. Le chauffeur n'ayant jamais declare d'arrivee, il redevient
// un trajet programme.
function statutMetier(t: Trajet): Trajet['statut'] {
  return t.statut === 'incident' ? 'programme' : t.statut;
}

function statutAffiche(t: Trajet): Trajet['statut'] {
  if (statutMetier(t) === 'programme' && departPasse(t)) return 'en_cours';
  return statutMetier(t);
}
const hhmm = (h: string | null | undefined) => (h ? String(h).slice(0, 5) : '');
function chaineHoraires(t: Trajet): string {
  const heures = [hhmm(t.heure_depart)];
  if (t.points_detail && t.points_detail.length > 2) {
    for (let i = 1; i < t.points_detail.length - 1; i++) {
      const h = t.points_detail[i].heure;
      if (h) heures.push(hhmm(h));
    }
  }
  if (t.heure_arrivee_estimee) heures.push(hhmm(t.heure_arrivee_estimee));
  return heures.filter(Boolean).join(' → ');
}
// « incident » est un etat interne (fausse arrivee au seuil) : il n'a
// pas d'etiquette, c'est le litige ouvert qui informe.
const libellesStatut: Partial<Record<Trajet['statut'], string>> = { programme: 'Programmé', en_cours: 'En cours', retard: 'Retard', termine: 'Terminé', annule: 'Annulé', supprime: 'Supprimé' };
const couleurStatut: Partial<Record<Trajet['statut'], 'green' | 'amber' | 'red' | 'grey'>> = { programme: 'green', en_cours: 'amber', retard: 'red', termine: 'grey', annule: 'red', supprime: 'grey' };

// Le numéro de voyage vient de la base, attribué une seule fois à la
// création du trajet. Il était auparavant recalculé ici depuis la date
// et l'heure de départ : il changeait donc dès qu'on modifiait
// l'horaire, deux agences pouvaient obtenir le même, et l'application
// mobile — qui ne connaissait pas la recette — affichait l'identifiant
// technique à la place.
function identifiantAffichage(t: Trajet): string {
  return t.numero;
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
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'programme' | 'en_cours' | 'termine' | 'annule'>('tous');
  const [tri, setTri] = useState<'tot' | 'tard'>('tot');

  const [dialogueRetard, setDialogueRetard] = useState<Trajet | null>(null);
  const [minutesRetard, setMinutesRetard] = useState('');
  const [dialogueArret, setDialogueArret] = useState<Trajet | null>(null);
  const [texteConfirmation, setTexteConfirmation] = useState('');
  const [dialogueSuppression, setDialogueSuppression] = useState<Trajet | null>(null);
  const [texteSuppression, setTexteSuppression] = useState('');
  const [chauffeurs, setChauffeurs] = useState<ChauffeurOption[]>([]);
  const [dialogueChauffeur, setDialogueChauffeur] = useState<Trajet | null>(null);
  const [chauffeurChoisi, setChauffeurChoisi] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  // Fiche ouverte SUR PLACE : reservations, signalements ou litiges du
  // trajet, avec un lien vers la page dediee pour aller plus loin.
  const [fiche, setFiche] = useState<{ trajet: Trajet; onglet: 'reservations' | 'signalements' | 'litiges' } | null>(null);
  const [fichePassagers, setFichePassagers] = useState<PassagerTrajet[]>([]);
  const [ficheLitiges, setFicheLitiges] = useState<LitigeTrajet[]>([]);
  const [ficheChargement, setFicheChargement] = useState(false);
  const [ficheCapacite, setFicheCapacite] = useState(0);
  const [ficheRecherche, setFicheRecherche] = useState('');
  // Fiches chauffeur et bus, ouvertes elles aussi sur place.
  const [ficheRessource, setFicheRessource] = useState<{ trajet: Trajet; genre: 'chauffeur' | 'bus' } | null>(null);
  const [chauffeurVu, setChauffeurVu] = useState<FicheChauffeur | null>(null);
  const [busVu, setBusVu] = useState<FicheBus | null>(null);
  const [ressourceChargement, setRessourceChargement] = useState(false);
  const [avisTrajet, setAvisTrajet] = useState<Trajet | null>(null);
  const [avisListe, setAvisListe] = useState<AvisTrajet[]>([]);
  const [avisChargement, setAvisChargement] = useState(false);

  // Arrivée depuis un lien « Voir le trajet » (fiche chauffeur…) :
  // on ouvre le bon jour et on cible le trajet.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDateChoisie(d);
    const f = params.get('focus');
    if (f) setFocusId(f);
  }, []);

  function notifier(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  }

  async function charger(silencieux = false) {
    if (!silencieux) setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch('/api/trajets');
      setTrajets(data.trajets || []);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Impossible de charger les trajets.');
      if (!silencieux) setTrajets([]);
    } finally {
      if (!silencieux) setChargement(false);
    }
  }

  useEffect(() => {
    charger();
    // Auto-refresh : signalements et statut des trajets remontent sans
    // avoir a recharger la page.
    const minuterie = setInterval(() => charger(true), 5000);
    return () => clearInterval(minuterie);
  }, []);

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

  useEffect(() => {
    if (!fiche) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') setFiche(null); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [fiche]);

  useEffect(() => {
    setFicheRecherche('');
    if (!fiche) { setFichePassagers([]); setFicheLitiges([]); setFicheCapacite(0); return; }
    if (fiche.onglet === 'reservations') {
      setFicheChargement(true);
      apiFetch(`/api/trajets/${fiche.trajet.id}/passagers`)
        .then((d) => {
          setFichePassagers(d.passagers || []);
          setFicheCapacite(Number(d.trajet?.capacite) || 0);
        })
        .catch(() => { setFichePassagers([]); setFicheCapacite(0); })
        .finally(() => setFicheChargement(false));
    } else if (fiche.onglet === 'litiges') {
      setFicheChargement(true);
      apiFetch('/api/litiges/mes-litiges')
        .then((d) => setFicheLitiges((d.litiges || []).filter((l: LitigeTrajet) => l.trajet_id === fiche.trajet.id)))
        .catch(() => setFicheLitiges([]))
        .finally(() => setFicheChargement(false));
    }
  }, [fiche]);

  useEffect(() => {
    if (!ficheRessource) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') setFicheRessource(null); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [ficheRessource]);

  useEffect(() => {
    if (!ficheRessource) { setChauffeurVu(null); setBusVu(null); return; }
    setRessourceChargement(true);
    if (ficheRessource.genre === 'chauffeur') {
      apiFetch('/api/chauffeurs')
        .then((d) => setChauffeurVu((d.chauffeurs || []).find((c: FicheChauffeur) => c.id === ficheRessource.trajet.chauffeur_id) ?? null))
        .catch(() => setChauffeurVu(null))
        .finally(() => setRessourceChargement(false));
    } else {
      apiFetch('/api/bus')
        .then((d) => setBusVu((d.bus || []).find((b: FicheBus) => b.id === ficheRessource.trajet.bus_id) ?? null))
        .catch(() => setBusVu(null))
        .finally(() => setRessourceChargement(false));
    }
  }, [ficheRessource]);

  useEffect(() => {
    if (!avisTrajet) { setAvisListe([]); return; }
    setAvisChargement(true);
    apiFetch(`/api/avis/trajets/${avisTrajet.id}`)
      .then((d) => setAvisListe(d.avis || []))
      .catch(() => setAvisListe([]))
      .finally(() => setAvisChargement(false));
  }, [avisTrajet]);

  const trajetsDuJour = useMemo(() => {
    const duJour = trajets.filter((t) => t.date_depart === dateChoisie);
    // Le filtre porte sur le statut AFFICHE : « En cours » regroupe donc
    // aussi les trajets partis dont le depart n'a pas encore ete declare.
    const filtres = filtreStatut === 'tous'
      ? duJour
      : duJour.filter((t) => statutAffiche(t) === filtreStatut
          || (filtreStatut === 'annule' && ['annule', 'supprime'].includes(t.statut)));
    return [...filtres].sort((a, b) => tri === 'tot'
      ? a.heure_depart.localeCompare(b.heure_depart)
      : b.heure_depart.localeCompare(a.heure_depart));
  }, [trajets, dateChoisie, filtreStatut, tri]);

  // Compteurs de la barre de filtres, sur le jour affiche.
  const compteStatut = useMemo(() => {
    const duJour = trajets.filter((t) => t.date_depart === dateChoisie);
    return (cle: 'tous' | 'programme' | 'en_cours' | 'termine' | 'annule') =>
      cle === 'tous'
        ? duJour.length
        : duJour.filter((t) => statutAffiche(t) === cle
            || (cle === 'annule' && ['annule', 'supprime'].includes(t.statut))).length;
  }, [trajets, dateChoisie]);

  // Trajet ciblé par un lien : on le fait défiler à l'écran et on le
  // surligne quelques secondes une fois la liste chargée.
  useEffect(() => {
    if (!focusId || chargement) return;
    const el = document.getElementById(`trajet-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setFocusId(null), 3500);
    return () => clearTimeout(timer);
  }, [focusId, chargement, trajetsDuJour]);

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
    if (!dialogueArret || !motConfirme(texteConfirmation, 'ARRETER')) return;
    try {
      // Le message du serveur dit qui est remboursé, et combien de
      // clients du guichet l'agence doit rembourser en espèces.
      const rep = await apiFetch(`/api/trajets/${dialogueArret.id}/annuler`, {
        method: 'PUT',
      });
      await charger();
      notifier(rep?.message || 'Trajet annulé');
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setDialogueArret(null);
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
    if (!dialogueSuppression || !motConfirme(texteSuppression, 'SUPPRIMER')) return;
    try {
      const rep = await apiFetch(`/api/trajets/${dialogueSuppression.id}`, { method: 'DELETE' });
      await charger();
      notifier(rep?.message || 'Trajet supprimé');
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
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Programmation des trajets</h1>
            <p className="text-[13px] text-ink-soft mt-0.5">Gère tes trajets programmés et maintiens ton horizon à jour.</p>
          </div>
          <Link href="/trajets/nouveau" className="rounded-lg bg-green-700 hover:bg-green-900 text-white font-semibold text-sm px-5 py-2.5 transition-colors whitespace-nowrap">
            + Nouveau trajet
          </Link>
        </div>

        {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}

        <div className={`rounded-xl px-4 py-2.5 mb-3 border ${horizon.conforme ? 'bg-ok-bg border-green-300' : 'bg-amber-bg border-amber'}`}>
          <div className="flex items-center gap-2.5">
            <span className="text-base shrink-0">{horizon.conforme ? '✓' : '⚠'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-ink">{horizon.conforme ? 'Programme à jour' : 'Programme incomplet'} <span className="font-normal text-ink-soft">— {horizon.message}</span></p>
            </div>
            <div className="text-right shrink-0 leading-none">
              <span className="text-lg font-display font-bold text-ink">{horizon.horizon_jours}j</span>
              <span className="text-[11px] text-ink-soft ml-1.5">seuil : {horizon.seuil_alerte}j</span>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="🔍 Rechercher un trajet (n° de voyage, ville, chauffeur, date, bus…)" className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[13px]" />
        </div>

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

        <div className="mb-3"><DateNavigator date={dateChoisie} onChange={setDateChoisie} /></div>

        <Panel>
          <div className="px-5 py-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-ink-soft mr-1">Filtre</span>
            {([
              ['tous', 'Tous'],
              ['programme', 'Programmés'],
              ['en_cours', 'En cours'],
              ['termine', 'Terminés'],
              ['annule', 'Annulés'],
            ] as const).map(([cle, libelle]) => (
              <button
                key={cle}
                onClick={() => setFiltreStatut(cle)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${filtreStatut === cle ? 'bg-ink text-white' : 'bg-off-white border border-line text-ink-soft'}`}
              >
                {libelle} ({compteStatut(cle)})
              </button>
            ))}
            <button
              onClick={() => setTri((t) => (t === 'tot' ? 'tard' : 'tot'))}
              className="ml-auto px-3 py-1.5 rounded-full text-[11px] font-bold bg-off-white border border-line text-ink-soft"
            >
              Heure {tri === 'tot' ? '↑' : '↓'}
            </button>
          </div>
        </Panel>
        <div className="mb-3" />

        <Panel title={`${dateChoisie === AUJOURDHUI ? "Trajets d'aujourd'hui" : 'Trajets ce jour-là'} (${trajetsDuJour.length})`}>
          {chargement ? (
            <div className="p-10 text-center text-sm text-ink-soft">Chargement…</div>
          ) : trajetsDuJour.length === 0 ? (
            <div className="p-10 text-center"><p className="text-sm text-ink-soft">Aucun trajet programmé ce jour-là.</p></div>
          ) : (
            <div className="divide-y divide-line">
              {trajetsDuJour.map((t) => (
                <div
                  key={t.id}
                  id={`trajet-${t.id}`}
                  // Un filet de couleur a gauche : gris pour un trajet
                  // clos, ambre pour un trajet en cours, vert pour un
                  // trajet a venir. La difference se voit sans lire.
                  className={`px-5 py-4 border-l-4 transition-colors scroll-mt-24 ${
                    focusId === t.id
                      ? 'ring-2 ring-inset ring-green-500 bg-green-500/8 border-l-green-500'
                      : ['annule', 'supprime'].includes(t.statut) || statutAffiche(t) === 'termine'
                        ? 'bg-off-white/60 border-l-line'
                        : statutAffiche(t) === 'en_cours'
                          ? 'border-l-amber hover:bg-green-500/5'
                          : 'border-l-green-500 hover:bg-green-500/5'
                  }`}
                >
                  {/* Deux colonnes fixes : le bloc de droite ne bouge
                      jamais, c'est l'itineraire qui passe a la ligne. */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className={`flex items-start gap-2 flex-wrap ${['annule', 'supprime'].includes(t.statut) || statutAffiche(t) === 'termine' ? 'opacity-60' : ''}`}>
                      <span className="text-[13px] font-bold text-ink whitespace-nowrap mr-3">
                        {chaineHoraires(t)}
                      </span>
                      <span className="text-[13px]">
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
                  <p className={`mt-1 font-mono text-[10px] text-ink-soft ${['annule', 'supprime'].includes(t.statut) || statutAffiche(t) === 'termine' ? 'opacity-60' : ''}`}>{identifiantAffichage(t)}</p>

                  {/* Chaque information reste d'un seul tenant : sur une carte
                      étroite, « bus : » ne se retrouve plus seul en fin de
                      ligne, séparé de son nom. */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-soft">
                    <span className="whitespace-nowrap"><span className="font-semibold text-ink">Chauffeur :</span>{' '}
                    {t.chauffeur && t.chauffeur_id
                      ? (
                        <button
                          onClick={() => setFicheRessource({ trajet: t, genre: 'chauffeur' })}
                          className="inline-flex items-center gap-1 rounded-md border border-green-700/30 bg-green-700/10 px-1.5 py-0 text-[10px] font-bold text-green-700 hover:bg-green-700/20 hover:border-green-700/50 transition-colors"
                        >
                          👤 {t.chauffeur}
                        </button>
                      )
                      : (t.chauffeur ?? 'non assigné')}</span>
                    <span className="whitespace-nowrap"><span className="font-semibold text-ink">Bus :</span>{' '}
                    {t.bus_id
                      ? (
                        <button
                          onClick={() => setFicheRessource({ trajet: t, genre: 'bus' })}
                          className="inline-flex items-center gap-1 rounded-md border border-green-700/30 bg-green-700/10 px-1.5 py-0 text-[10px] font-bold text-green-700 hover:bg-green-700/20 hover:border-green-700/50 transition-colors"
                        >
                          🚌 {t.nom_bus}
                        </button>
                      )
                      : t.nom_bus}</span>
                    <span className="whitespace-nowrap"><span className="font-semibold text-ink">Prix :</span> {t.prix_base} FCFA</span>
                    {t.categorie === 'mixte' && t.supplement_premium != null && t.supplement_premium > 0 && (
                      <span className="whitespace-nowrap"><span className="font-semibold text-ink">Premium :</span> +{t.supplement_premium} FCFA</span>
                    )}
                    {t.prix_bagage_supplementaire != null && (
                      <span className="whitespace-nowrap"><span className="font-semibold text-ink">Bagage :</span> {t.prix_bagage_supplementaire} FCFA</span>
                    )}
                    <span className="whitespace-nowrap"><span className="font-semibold text-ink">Repas :</span> {t.distribution_nourriture ? 'inclus' : 'non inclus'}</span>
                  </div>

                  {t.prix_sections && t.prix_sections.length > 1 && (
                    <p className={`mt-1 text-[11px] text-ink-soft ${['annule', 'supprime'].includes(t.statut) || statutAffiche(t) === 'termine' ? 'opacity-60' : ''}`}>
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
                    <p className="mt-2.5 text-[11.5px] text-ink-soft italic">Trajet annulé — plus aucune action possible.</p>
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
                    {statutMetier(t) === 'programme' && (
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
                    {statutMetier(t) !== 'termine' && (
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

                    <div className="flex flex-col items-end gap-1.5 shrink-0 max-w-[40%]">
                      <div className="flex flex-wrap items-center gap-1.5 justify-end">
                        <Badge color="grey">{libellesCategorie[t.categorie]}</Badge>
                        {estDeNuit(t.heure_depart) && <Badge color="grey">Nuit</Badge>}
                        {estExpress(t) && <Badge color="grey">Express</Badge>}
                        {libellesStatut[statutAffiche(t)] && (
                          <Badge color={couleurStatut[statutAffiche(t)] ?? 'grey'}>{libellesStatut[statutAffiche(t)]}</Badge>
                        )}
                        {t.retard_minutes != null && t.retard_minutes > 0 && (
                          <Badge color="amber">{libelleRetard(t.retard_minutes)}</Badge>
                        )}
                      </div>
                      {/* Acces direct aux reservations de CE voyage. */}
                      <button
                        onClick={() => setFiche({ trajet: t, onglet: 'reservations' })}
                        className="inline-flex items-center gap-1 rounded-full border border-green-700/30 bg-green-700/10 px-2 py-1 font-bold text-green-700 hover:bg-green-700/20 hover:border-green-700/50 transition-colors whitespace-nowrap"
                        style={{ fontSize: "9.5px", lineHeight: 1 }}
                      >
                        Voir les réservations
                      </button>
                      {/* Note du voyage : un avis ne se depose qu'apres le
                          voyage, la ligne n'a donc de sens qu'une fois le
                          trajet termine. */}
                      {statutAffiche(t) === 'termine' && !!t.nb_avis && t.nb_avis > 0 && (
                        <button
                          onClick={() => setAvisTrajet(t)}
                          className="inline-flex items-center gap-1 rounded-full border border-amber/40 bg-amber/10 px-2 py-1 font-bold text-amber hover:bg-amber/20 hover:border-amber/60 transition-colors whitespace-nowrap"
                          style={{ fontSize: "9.5px", lineHeight: 1 }}
                        >
                          {/* Meme pastille que les signalements et les
                              litiges : une puce, pas de glyphe qui se
                              dessine plus grand que le texte. */}
                          <span className="w-1.5 h-1.5 rounded-full bg-amber shrink-0" />
                          Note {t.note_moyenne ?? '—'} ({t.nb_commentaires ?? 0} comm.)
                        </button>
                      )}
                      {t.signalements && t.signalements.length > 0 && (
                        <button
                          onClick={() => setFiche({ trajet: t, onglet: 'signalements' })}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-bold text-amber-700 hover:bg-amber-500/20 hover:border-amber-500/60 transition-colors whitespace-nowrap"
                          style={{ fontSize: "9.5px", lineHeight: 1 }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          {t.signalements.length} signalement(s)
                        </button>
                      )}
                      {!!t.nb_litiges && t.nb_litiges > 0 && (
                        <button
                          onClick={() => setFiche({ trajet: t, onglet: 'litiges' })}
                          className="inline-flex items-center gap-1 rounded-full border border-red/40 bg-red/10 px-2 py-1 font-bold text-red hover:bg-red/20 hover:border-red/60 transition-colors whitespace-nowrap"
                          style={{ fontSize: "9.5px", lineHeight: 1 }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red shrink-0" />
                          {t.nb_litiges} litige(s)
                        </button>
                      )}
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
            <p className="text-[11px] text-ink-soft mb-2">Le trajet est annulé. Chaque voyageur est remboursé à 100 % sur son solde JEGO et notifié, le chauffeur aussi. Les billets vendus au guichet se remboursent en espèces. Pour confirmer, écris <strong>ARRETER</strong> ci-dessous.</p>
            <input value={texteConfirmation} onChange={(e) => setTexteConfirmation(e.target.value)} className="w-full rounded-lg border border-line bg-off-white px-4 py-2.5 text-[13px] mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setDialogueArret(null)} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-[11px] py-2.5">Retour</button>
              <button onClick={arreterTrajet} disabled={!motConfirme(texteConfirmation, 'ARRETER')} className="flex-1 rounded-lg bg-red disabled:opacity-40 text-white font-semibold text-[11px] py-2.5">Arrêter le trajet</button>
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
            <p className="text-[11px] text-ink-soft mb-3">Si des billets ont déjà été vendus, chaque voyageur est remboursé à 100 % sur son solde JEGO et notifié, le chauffeur aussi. Les billets vendus au guichet se remboursent en espèces. Uniquement possible pour un trajet pas encore débuté. Pour confirmer, écris <strong>SUPPRIMER</strong> ci-dessous.</p>
            <input value={texteSuppression} onChange={(e) => setTexteSuppression(e.target.value)} placeholder="SUPPRIMER" className="w-full rounded-lg border border-line bg-off-white px-4 py-2.5 text-[13px] mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setDialogueSuppression(null)} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-[11px] py-2.5">Retour</button>
              <button onClick={supprimerTrajet} disabled={!motConfirme(texteSuppression, 'SUPPRIMER')} className="flex-1 rounded-lg bg-red disabled:opacity-40 text-white font-semibold text-[11px] py-2.5">Supprimer le trajet</button>
            </div>
          </div>
        </div>
      )}
      {/* Le bloc s'ouvre ICI, avec l'essentiel du dossier, et un lien
          vers la page dediee pour aller plus loin. */}
      {fiche && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[70]" onClick={() => setFiche(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="bg-gradient-to-br from-green-700 to-green-900 px-7 pt-7 pb-5 rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-start gap-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[17px] font-display font-bold text-white">
                      {fiche.trajet.ville_depart} → {fiche.trajet.ville_arrivee}
                    </p>
                    <span className="text-[10px] font-mono text-white/70">{fiche.trajet.numero}</span>
                  </div>
                  <p className="text-[12px] text-white/80 mt-0.5">
                    {fiche.trajet.date_depart.split('-').reverse().join('/')} · {chaineHoraires(fiche.trajet)}
                  </p>
                  <p className="text-[11.5px] text-white/70 mt-0.5">
                    {(fiche.trajet.points_detail && fiche.trajet.points_detail.length > 0
                      ? fiche.trajet.points_detail
                      : [{ ville: fiche.trajet.ville_depart, lieu: null }, { ville: fiche.trajet.ville_arrivee, lieu: null }]
                    ).map((pt, i, arr) => (
                      <span key={i}>
                        <span className="font-bold text-white">{pt.ville}</span>
                        {pt.lieu && <span> ({pt.lieu})</span>}
                        {i < arr.length - 1 && <span> → </span>}
                      </span>
                    ))}
                  </p>
                  <p className="text-[11px] text-white/70 mt-1">
                    Chauffeur : <span className="font-semibold text-white">{fiche.trajet.chauffeur ?? 'non assigné'}</span>
                    {' · '}Bus : <span className="font-semibold text-white">{fiche.trajet.nom_bus}</span>
                    {' · '}Prix : <span className="font-semibold text-white">{fiche.trajet.prix_base} FCFA</span>
                  </p>
                </div>
                <button onClick={() => setFiche(null)} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm shrink-0" aria-label="Fermer">✕</button>
              </div>
              <div className="flex gap-1.5 mt-3 flex-wrap items-center">
                {([
                  ['reservations', 'Réservations'],
                  ['signalements', `Signalements (${fiche.trajet.signalements?.length ?? 0})`],
                  ['litiges', `Litiges (${fiche.trajet.nb_litiges ?? 0})`],
                ] as const).map(([cle, libelle]) => (
                  <button
                    key={cle}
                    onClick={() => setFiche({ trajet: fiche.trajet, onglet: cle })}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${fiche.onglet === cle ? 'bg-white text-green-800' : 'bg-white/15 text-white hover:bg-white/25'}`}
                  >
                    {libelle}
                  </button>
                ))}
                <Link
                  href={
                    fiche.onglet === 'reservations'
                      ? `/reservations?voyage=${encodeURIComponent(fiche.trajet.numero)}&date=${encodeURIComponent(fiche.trajet.date_depart)}`
                      : fiche.onglet === 'signalements'
                        ? `/signalements?voyage=${encodeURIComponent(fiche.trajet.numero)}&date=${encodeURIComponent(fiche.trajet.date_depart)}`
                        : `/litiges?voyage=${encodeURIComponent(fiche.trajet.numero)}`
                  }
                  className="ml-auto text-[11px] font-bold text-white underline underline-offset-2 hover:text-white/80 whitespace-nowrap"
                >
                  {fiche.onglet === 'reservations'
                    ? 'Aller vers Réservations →'
                    : fiche.onglet === 'signalements'
                      ? 'Aller vers Signalements →'
                      : 'Aller vers Litiges →'}
                </Link>
              </div>
            </div>

            <div className="px-7 py-5">
              {ficheChargement ? (
                <p className="text-[12px] text-ink-soft">Chargement…</p>
              ) : fiche.onglet === 'reservations' ? (
                (() => {
                  const actifs = fichePassagers.filter((p) => p.statut !== 'annule');
                  const argent = actifs.reduce((somme, p) => somme + Number(p.prix_agence ?? p.prix_total_client ?? 0), 0);
                  const remplissage = ficheCapacite > 0 ? Math.round((actifs.length / ficheCapacite) * 100) : 0;
                  const terme = ficheRecherche.trim().toLowerCase();
                  const listeFiltree = !terme ? fichePassagers : fichePassagers.filter((p) =>
                    [p.prenom, p.nom, p.numero, p.telephone, p.email, p.siege, p.ville_embarquement, p.ville_debarquement]
                      .join(' ').toLowerCase().includes(terme));
                  return (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        <div className="rounded-2xl bg-off-white p-4">
                          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1">Places</p>
                          <p className="text-[20px] font-display font-bold text-ink">{ficheCapacite || '—'}</p>
                        </div>
                        <div className="rounded-2xl bg-off-white p-4">
                          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1">Réservations</p>
                          <p className="text-[20px] font-display font-bold text-ink">{actifs.length}</p>
                        </div>
                        <div className="rounded-2xl bg-off-white p-4">
                          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1">Net perçu</p>
                          <p className="text-[20px] font-display font-bold text-green-700">{argent.toLocaleString('fr-FR')} F</p>
                        </div>
                        <div className="rounded-2xl bg-off-white p-4">
                          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1">Remplissage</p>
                          <p className="text-[20px] font-display font-bold text-ink">{remplissage}%</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 mb-2">
                        <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wide">
                          Passagers ({terme ? `${listeFiltree.length}/${fichePassagers.length}` : fichePassagers.length})
                        </p>
                        {fichePassagers.length > 0 && (
                          <input
                            value={ficheRecherche}
                            onChange={(e) => setFicheRecherche(e.target.value)}
                            placeholder="🔍 Rechercher un passager (nom, tél, siège, ID…)"
                            className="w-[280px] max-w-[55%] rounded-xl border border-line bg-off-white px-3 py-2 text-[12px]"
                          />
                        )}
                      </div>

                      {fichePassagers.length === 0 ? (
                        <div className="rounded-2xl border border-line p-8 text-center">
                          <p className="text-[13px] text-ink-soft">Aucune réservation sur ce trajet.</p>
                        </div>
                      ) : listeFiltree.length === 0 ? (
                        <div className="rounded-2xl border border-line p-8 text-center">
                          <p className="text-[13px] text-ink-soft">Aucun passager ne correspond à cette recherche.</p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-line divide-y divide-line overflow-hidden">
                          {listeFiltree.map((p, i) => {
                            const nomComplet = `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || 'Passager';
                            const options: string[] = [];
                            const nbBagages = Number(p.quantite_bagages) || 0;
                            if (Number(p.supplement_bagage) > 0) {
                              options.push(nbBagages > 0 ? `Bagage supplémentaire x${nbBagages}` : 'Bagage supplémentaire');
                            }
                            const troncon = `${p.ville_embarquement ?? ''} → ${p.ville_debarquement ?? ''}`.trim();
                            return (
                              <div key={p.numero ?? p.id ?? i} className="px-5 py-3.5 flex items-start gap-4">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                  {nomComplet.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-semibold text-ink">{nomComplet}</p>
                                    <span className="text-[10px] font-mono text-ink-soft">#{p.numero ?? ''}</span>
                                  </div>
                                  <p className="text-[12px] text-ink-soft">
                                    {formatTelephone(String(p.telephone ?? ''))} · Siège {p.siege ?? '—'}
                                  </p>
                                  {p.email && <p className="text-[11px] text-ink-soft truncate">{p.email}</p>}
                                  <p className="text-[11px] text-ink-soft mt-1">
                                    Options : <strong className="text-ink">{options.length ? options.join(', ') : 'Aucune'}</strong>
                                  </p>
                                  {troncon !== '→' && (
                                    <p className="text-[10.5px] text-purple font-semibold mt-0.5">Trajet associé : {troncon}</p>
                                  )}
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${p.statut === 'annule' ? 'bg-red/10 text-red' : p.qr_scanne ? 'bg-ink/10 text-ink' : 'bg-green-700/10 text-green-700'}`}>
                                  {p.statut === 'annule' ? 'Annulé' : p.qr_scanne ? 'Embarqué' : 'Confirmé'}
                                </span>
                                <p className="w-20 text-right text-[12px] font-bold text-ink shrink-0">
                                  {Number(p.prix_agence ?? p.prix_total_client ?? 0).toLocaleString('fr-FR')} F
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()
              ) : fiche.onglet === 'signalements' ? (
                (fiche.trajet.signalements ?? []).length === 0 ? (
                  <p className="text-[12px] text-ink-soft">Aucun signalement sur ce trajet.</p>
                ) : (
                  <div className="space-y-2">
                    {(fiche.trajet.signalements ?? []).map((sg, i) => (
                      <div key={i} className="rounded-xl border border-line bg-off-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-bold text-ink first-letter:uppercase">
                            {sg.categorie.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10.5px] font-mono text-ink-soft">{sg.heure}</span>
                        </div>
                        <p className="text-[11.5px] text-ink-soft mt-0.5">
                          Par <span className="font-semibold text-ink">{sg.passager}</span>
                          {sg.seuil_atteint && <span className="ml-1 font-bold text-red">· seuil atteint</span>}
                        </p>
                        {sg.commentaire && <p className="text-[11.5px] text-ink mt-1">{sg.commentaire}</p>}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                ficheLitiges.length === 0 ? (
                  <p className="text-[12px] text-ink-soft">Aucun litige sur ce trajet.</p>
                ) : (
                  <div className="space-y-2">
                    {ficheLitiges.map((l) => (
                      <div key={l.id} className="rounded-xl border border-line p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10.5px] text-ink-soft">{l.numero}</span>
                          <span className="text-[10.5px] font-bold text-ink-soft">
                            {l.statut === 'resolu' || l.statut === 'cloture' ? 'Résolu' : l.reponse_agence ? 'En attente de décision JEGO' : 'En attente de ta réponse'}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-ink-soft mt-1">
                          {l.collectif && (l.nb_clients ?? 1) > 1 ? `${l.nb_clients} clients` : (l.client ?? '')}
                          {l.montant ? ` · ${l.montant} F` : ''}
                          {l.date_ouverture ? ` · ouvert le ${l.date_ouverture} à ${l.heure_ouverture}` : ''}
                        </p>
                        <p className="text-[12px] text-ink mt-1.5 leading-relaxed">{l.description}</p>
                        {l.reponse_agence && (
                          <p className="text-[11.5px] text-ink-soft mt-1.5">
                            <span className="font-semibold text-ink">Ta réponse</span>
                            {l.date_reponse ? ` (le ${l.date_reponse} à ${l.heure_reponse})` : ''} : {l.reponse_agence}
                          </p>
                        )}
                        {(l.statut === 'resolu' || l.statut === 'cloture') && (
                          l.gagnant === 'agence' ? (
                            <p className="mt-1.5 text-[11.5px] font-bold text-green-700">Décision JEGO : en votre faveur</p>
                          ) : (
                            <p className="mt-1.5 text-[11.5px] font-bold text-red">Litige perdu{l.decision ? ` — ${l.decision}` : ''}</p>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chauffeur et bus : leur fiche s'ouvre ici aussi, avec un lien
          vers leur page pour la suite. */}
      {ficheRessource && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[70]" onClick={() => setFicheRessource(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-3xl max-w-xl w-full max-h-[88vh] overflow-y-auto shadow-xl">
            <div className="bg-gradient-to-br from-green-700 to-green-900 px-7 pt-7 pb-5 rounded-t-3xl">
              <div className="flex items-start gap-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-white/60 font-bold">
                    {ficheRessource.genre === 'chauffeur' ? 'Chauffeur' : 'Bus'}
                  </p>
                  <p className="text-[17px] font-display font-bold text-white mt-0.5">
                    {ficheRessource.genre === 'chauffeur'
                      ? (chauffeurVu ? `${chauffeurVu.prenom} ${chauffeurVu.nom}` : (ficheRessource.trajet.chauffeur ?? '—'))
                      : (busVu?.nom ?? ficheRessource.trajet.nom_bus)}
                  </p>
                  <p className="text-[11.5px] text-white/70 mt-0.5">
                    Sur le voyage <span className="font-mono">{ficheRessource.trajet.numero}</span>
                  </p>
                </div>
                <button onClick={() => setFicheRessource(null)} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm shrink-0" aria-label="Fermer">✕</button>
              </div>
              <div className="mt-3">
                <Link
                  href={ficheRessource.genre === 'chauffeur'
                    ? `/chauffeurs?focus=${ficheRessource.trajet.chauffeur_id}`
                    : `/flotte?focus=${ficheRessource.trajet.bus_id}`}
                  className="text-[11px] font-bold text-white underline underline-offset-2 hover:text-white/80"
                >
                  {ficheRessource.genre === 'chauffeur' ? 'Aller vers Chauffeurs →' : 'Aller vers Flotte →'}
                </Link>
              </div>
            </div>

            <div className="px-7 py-5">
              {ressourceChargement ? (
                <p className="text-[12px] text-ink-soft">Chargement…</p>
              ) : ficheRessource.genre === 'chauffeur' ? (
                !chauffeurVu ? (
                  <p className="text-[12px] text-ink-soft">Fiche du chauffeur introuvable.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-2xl bg-off-white p-4">
                        <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1">Voyages effectués</p>
                        <p className="text-[20px] font-display font-bold text-ink">{chauffeurVu.nombre_voyages ?? 0}</p>
                      </div>
                      <div className="rounded-2xl bg-off-white p-4">
                        <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1">Note moyenne</p>
                        <p className="text-[20px] font-display font-bold text-ink">
                          {chauffeurVu.note_moyenne != null ? chauffeurVu.note_moyenne : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-line p-4 space-y-1.5 text-[12.5px]">
                      <p><span className="text-ink-soft">Téléphone : </span><span className="font-semibold font-mono">{formatTelephone(chauffeurVu.telephone)}</span></p>
                      <p><span className="text-ink-soft">Email : </span><span className="font-semibold">{chauffeurVu.email ?? '—'}</span></p>
                      <p>
                        <span className="text-ink-soft">État : </span>
                        <span className={`font-semibold ${chauffeurVu.desactive_urgence ? 'text-red' : 'text-green-700'}`}>
                          {chauffeurVu.statut === 'supprime' ? 'Supprimé' : chauffeurVu.desactive_urgence ? 'Désactivé' : 'Actif'}
                        </span>
                      </p>
                    </div>
                  </>
                )
              ) : (
                !busVu ? (
                  <p className="text-[12px] text-ink-soft">Fiche du bus introuvable.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-2xl bg-off-white p-4">
                        <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1">Places</p>
                        <p className="text-[20px] font-display font-bold text-ink">{busVu.nombre_sieges ?? '—'}</p>
                      </div>
                      <div className="rounded-2xl bg-off-white p-4">
                        <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-1">Type</p>
                        <p className="text-[20px] font-display font-bold text-ink capitalize">{busVu.type_bus ?? '—'}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-line p-4 space-y-1.5 text-[12.5px]">
                      <p><span className="text-ink-soft">Disposition : </span><span className="font-semibold">{busVu.disposition ?? '—'}{busVu.nombre_rangees ? ` · ${busVu.nombre_rangees} rangées` : ''}</span></p>
                      <p className="text-ink-soft">
                        Équipements :{' '}
                        <span className="font-semibold text-ink">
                          {[
                            busVu.climatisation && 'climatisation',
                            busVu.toilettes && 'toilettes',
                            busVu.prises_usb && 'prises USB',
                            busVu.wifi && 'WiFi',
                            busVu.sieges_inclinables && 'sièges inclinables',
                          ].filter(Boolean).join(', ') || 'aucun'}
                        </span>
                      </p>
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {avisTrajet && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[70]" onClick={() => setAvisTrajet(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-3xl max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-xl">
            <div className="bg-gradient-to-br from-green-700 to-green-900 px-7 pt-7 pb-5 rounded-t-3xl sticky top-0 z-10 flex items-start gap-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-display font-bold text-white">
                  ★ {avisTrajet.note_moyenne ?? '—'} · {avisTrajet.nb_avis ?? 0} avis
                </p>
                <p className="text-[10.5px] text-white/70 mt-0.5">
                  {avisTrajet.ville_depart} → {avisTrajet.ville_arrivee} · <span className="font-mono">{avisTrajet.numero}</span>
                </p>
              </div>
              <button onClick={() => setAvisTrajet(null)} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm shrink-0" aria-label="Fermer">✕</button>
            </div>
            <div className="px-7 py-5 space-y-3">
              {avisChargement ? (
                <p className="text-[10px] text-ink-soft">Chargement des avis…</p>
              ) : avisListe.length === 0 ? (
                <p className="text-[10px] text-ink-soft">Aucun avis sur ce voyage.</p>
              ) : avisListe.map((a) => (
                <div key={a.id} className="rounded-xl border border-line p-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-bold text-amber">★ {a.note_globale}</span>
                    <span className="text-[9px] text-ink-soft">{a.voyageur ?? 'Voyageur anonyme'} · {a.date_avis}</span>
                  </div>
                  {a.commentaire && <p className="text-[10px] text-ink mt-1 leading-relaxed">{a.commentaire}</p>}
                  <p className="text-[9px] text-ink-soft mt-1">
                    Service {a.note_service ?? '—'} · Conduite {a.note_conduite ?? '—'} · Horaires {a.note_horaires ?? '—'} · Confort {a.note_confort ?? '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <ToastDemo message={toast} />
    </LayoutAgence>
  );
}
