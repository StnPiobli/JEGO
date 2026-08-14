'use client';

// BRANCHÉ SUR LE VRAI BACKEND, sans repli démo.
// POST/GET /api/chauffeurs, PUT :id/desactiver (désactivation d'urgence
// réelle — coupe la session en cours), PUT :id/reactiver,
// POST :id/renvoyer-identifiants (envoi réel par email).
// Champs réels : nom, prenom, email, date_naissance, lieu_naissance,
// telephone, mot_de_passe.
// Le statut actif/inactif se lit sur desactive_urgence, pas sur la
// colonne statut (qui n'est jamais mise à jour côté backend).
// Les mots de passe sont hachés côté serveur : aucune fonctionnalité
// "voir le mot de passe" n'a de sens réel, seulement réinitialiser.

import { useEffect, useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import { Panel, Badge, BtnMini, ToastDemo } from '../components/ui';
import TelephoneInput from '../components/TelephoneInput';
import { apiFetch } from '../lib/api';

type Chauffeur = {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  desactive_urgence: boolean;
  note_moyenne: number | null;
  nombre_voyages: number;
  date_naissance?: string;
};

type TrajetChauffeur = {
  id: string;
  date_depart: string;
  heure_depart: string;
  statut: 'programme' | 'en_cours' | 'retard' | 'termine' | 'annule';
  ville_depart: string;
  ville_arrivee: string;
};

const libellesStatutTrajet: Record<TrajetChauffeur['statut'], string> = {
  programme: 'Programmé', en_cours: 'En cours', retard: 'Retard', termine: 'Terminé', annule: 'Annulé',
};
const couleurStatutTrajet: Record<TrajetChauffeur['statut'], 'green' | 'amber' | 'red' | 'grey'> = {
  programme: 'green', en_cours: 'amber', retard: 'red', termine: 'grey', annule: 'red',
};

function calculerAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  const aujourdhui = new Date();
  let age = aujourdhui.getFullYear() - naissance.getFullYear();
  const pasEncoreAnniversaire = aujourdhui.getMonth() < naissance.getMonth() || (aujourdhui.getMonth() === naissance.getMonth() && aujourdhui.getDate() < naissance.getDate());
  if (pasEncoreAnniversaire) age -= 1;
  return age;
}

type TriChauffeur = 'alpha' | 'notes';

function initiales(p: string, n: string) {
  return `${p[0] ?? ''}${n[0] ?? ''}`.toUpperCase();
}

export default function ChauffeursPage() {
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [chauffeurVu, setChauffeurVu] = useState<Chauffeur | null>(null);
  const [tri, setTri] = useState<TriChauffeur>('alpha');
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'actif' | 'desactive'>('tous');

  const [confirmationStatut, setConfirmationStatut] = useState<Chauffeur | null>(null);
  const [texteConfirmation, setTexteConfirmation] = useState('');
  const [confirmationRenvoi, setConfirmationRenvoi] = useState(false);
  const [texteConfirmationRenvoi, setTexteConfirmationRenvoi] = useState('');
  const [confirmationSuppression, setConfirmationSuppression] = useState<Chauffeur | null>(null);
  const [texteSuppression, setTexteSuppression] = useState('');
  const [trajetsChauffeur, setTrajetsChauffeur] = useState<TrajetChauffeur[]>([]);
  const [chargementTrajets, setChargementTrajets] = useState(false);

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [indicatifTel, setIndicatifTel] = useState('+237');
  const [dateNaissance, setDateNaissance] = useState('');
  const [lieuNaissance, setLieuNaissance] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  function genererMotDePasse() {
    return Math.random().toString(36).slice(-4) + Math.floor(1000 + Math.random() * 9000);
  }

  function notifier(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  }

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch('/api/chauffeurs');
      setChauffeurs(data.chauffeurs || []);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Impossible de charger les chauffeurs.');
      setChauffeurs([]);
    } finally {
      setChargement(false);
    }
  }
  useEffect(() => { charger(); }, []);

  const chauffeursAffiches = useMemo(() => {
    const copie = chauffeurs.filter((c) => {
      if (filtreStatut === 'tous') return true;
      const actif = !c.desactive_urgence;
      return filtreStatut === 'actif' ? actif : !actif;
    });
    if (tri === 'notes') return [...copie].sort((a, b) => (b.note_moyenne ?? 0) - (a.note_moyenne ?? 0));
    return [...copie].sort((a, b) => a.nom.localeCompare(b.nom));
  }, [chauffeurs, tri, filtreStatut]);

  useEffect(() => {
    if (!chauffeurVu) { setTrajetsChauffeur([]); return; }
    setChargementTrajets(true);
    apiFetch(`/api/trajets?chauffeur_id=${chauffeurVu.id}`)
      .then((data) => {
        const trajets: TrajetChauffeur[] = data.trajets || [];
        setTrajetsChauffeur(trajets.filter((t) => t.statut === 'programme' || t.statut === 'en_cours'));
      })
      .catch(() => setTrajetsChauffeur([]))
      .finally(() => setChargementTrajets(false));
  }, [chauffeurVu]);

  function demanderBasculeStatut(c: Chauffeur) {
    setConfirmationStatut(c);
    setTexteConfirmation('');
  }

  async function confirmerBasculeStatut() {
    if (!confirmationStatut) return;
    const estActif = !confirmationStatut.desactive_urgence;
    const motAttendu = estActif ? 'DESACTIVER' : 'ACTIVER';
    if (texteConfirmation.trim().toUpperCase() !== motAttendu) return;
    const id = confirmationStatut.id;
    const action = estActif ? 'desactiver' : 'reactiver';
    try {
      await apiFetch(`/api/chauffeurs/${id}/${action}`, { method: 'PUT' });
      await charger();
      notifier(action === 'desactiver' ? 'Chauffeur désactivé' : 'Chauffeur réactivé');
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setChauffeurVu(null);
      setConfirmationStatut(null);
    }
  }

  async function renvoyerIdentifiants() {
    if (texteConfirmationRenvoi.trim().toUpperCase() !== 'RENVOYER' || !chauffeurVu) return;
    try {
      const res = await apiFetch(`/api/chauffeurs/${chauffeurVu.id}/renvoyer-identifiants`, { method: 'POST' });
      notifier(res.message || 'Identifiants renvoyés par email');
    } catch (err) {
      notifier(err instanceof Error ? err.message : 'Erreur lors du renvoi');
    } finally {
      setConfirmationRenvoi(false);
      setTexteConfirmationRenvoi('');
    }
  }

  async function confirmerSuppression() {
    if (!confirmationSuppression || texteSuppression.trim().toUpperCase() !== 'SUPPRIMER') return;
    try {
      await apiFetch(`/api/chauffeurs/${confirmationSuppression.id}`, { method: 'DELETE' });
      await charger();
      notifier('Chauffeur supprimé');
      setChauffeurVu(null);
    } catch (err) {
      notifier(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setConfirmationSuppression(null);
      setTexteSuppression('');
    }
  }

  async function creerChauffeurSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim() || !email.trim() || !telephone.trim() || !dateNaissance || !lieuNaissance.trim()) return;
    setEnvoi(true);
    const motDePasseGenere = genererMotDePasse();
    try {
      await apiFetch('/api/chauffeurs', {
        method: 'POST',
        body: JSON.stringify({ nom, prenom, email, telephone: `${indicatifTel} ${telephone}`.trim(), date_naissance: dateNaissance, lieu_naissance: lieuNaissance, mot_de_passe: motDePasseGenere }),
      });
      await charger();
      setEnvoye(true);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur de création');
    } finally {
      setEnvoi(false);
    }
  }

  function fermerModaleCreation() {
    setModaleOuverte(false);
    setEnvoye(false);
    setNom(''); setPrenom(''); setEmail(''); setTelephone(''); setDateNaissance(''); setLieuNaissance('');
  }

  return (
    <LayoutAgence>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Chauffeurs</h1>
            <p className="text-sm text-ink-soft mt-1">Crée des comptes chauffeur et suis leurs accès.</p>
          </div>
          <button onClick={() => setModaleOuverte(true)} className="rounded-lg bg-green-700 hover:bg-green-900 text-white font-semibold text-sm px-5 py-2.5 transition-colors whitespace-nowrap">
            + Nouveau chauffeur
          </button>
        </div>

        {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs text-ink-soft font-semibold mr-1">Trier :</span>
          {([{ v: 'alpha', l: 'Alphabétique' }, { v: 'notes', l: 'Meilleures notes' }] as const).map((t) => (
            <button key={t.v} onClick={() => setTri(t.v)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${tri === t.v ? 'bg-green-700 text-white' : 'bg-paper border border-line text-ink-soft'}`}>{t.l}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-xs text-ink-soft font-semibold mr-1">Filtrer :</span>
          {([{ v: 'tous', l: 'Tous' }, { v: 'actif', l: 'Actifs' }, { v: 'desactive', l: 'Désactivés' }] as const).map((f) => (
            <button key={f.v} onClick={() => setFiltreStatut(f.v)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${filtreStatut === f.v ? 'bg-green-700 text-white' : 'bg-paper border border-line text-ink-soft'}`}>{f.l}</button>
          ))}
        </div>

        {chargement ? (
          <div className="text-sm text-ink-soft">Chargement…</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {chauffeursAffiches.map((c) => (
              <button key={c.id} onClick={() => setChauffeurVu(c)} className="text-left">
                <Panel>
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full bg-green-500 flex items-center justify-center text-white font-display font-bold shrink-0">{initiales(c.prenom, c.nom)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink">{c.prenom} {c.nom}</p>
                        <p className="text-xs text-ink-soft font-mono">{c.telephone}</p>
                      </div>
                      <Badge color={!c.desactive_urgence ? 'green' : 'red'}>{!c.desactive_urgence ? 'Actif' : 'Désactivé'}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-ink-soft">
                      <span>{c.nombre_voyages} voyage(s)</span>
                      {c.note_moyenne != null && <span className="flex items-center gap-1 font-bold text-ink">⭐ {c.note_moyenne}</span>}
                    </div>
                  </div>
                </Panel>
              </button>
            ))}
            {chauffeursAffiches.length === 0 && (
              <div className="md:col-span-2"><Panel><div className="p-10 text-center text-sm text-ink-soft">Aucun chauffeur pour ce filtre.</div></Panel></div>
            )}
          </div>
        )}
      </div>

      {modaleOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={fermerModaleCreation}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-2xl p-7 max-w-md w-full">
            {envoye ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-ok-bg flex items-center justify-center mx-auto mb-4"><span className="text-2xl">✓</span></div>
                <p className="text-[16px] font-display font-semibold text-ink mb-1">Chauffeur créé</p>
                <p className="text-sm text-ink-soft mb-6">{prenom} {nom} a été créé. Utilise &quot;Renvoyer ses identifiants&quot; depuis sa fiche pour lui envoyer un mot de passe par email.</p>
                <button onClick={fermerModaleCreation} className="w-full rounded-lg bg-green-700 text-white font-semibold text-sm py-3">Fermer</button>
              </div>
            ) : (
              <form onSubmit={creerChauffeurSubmit} className="space-y-3.5">
                <h2 className="text-[16px] font-display font-semibold text-ink">Nouveau chauffeur</h2>
                <div className="grid grid-cols-2 gap-3">
                  <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" className="rounded-lg bg-off-white border border-line px-4 py-2.5 text-sm" />
                  <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" className="rounded-lg bg-off-white border border-line px-4 py-2.5 text-sm" />
                </div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-sm" />
                <TelephoneInput indicatif={indicatifTel} numero={telephone} onChangeIndicatif={setIndicatifTel} onChangeNumero={setTelephone} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} className="rounded-lg bg-off-white border border-line px-4 py-2.5 text-sm" />
                  <input value={lieuNaissance} onChange={(e) => setLieuNaissance(e.target.value)} placeholder="Lieu de naissance" className="rounded-lg bg-off-white border border-line px-4 py-2.5 text-sm" />
                </div>
                <p className="text-[10.5px] text-ink-soft">🔐 Un mot de passe est généré automatiquement. Utilise &quot;Renvoyer ses identifiants&quot; depuis sa fiche pour le lui envoyer par email.</p>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={fermerModaleCreation} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-sm py-3">Annuler</button>
                  <button type="submit" disabled={envoi} className="flex-1 rounded-lg bg-green-700 disabled:opacity-60 text-white font-semibold text-sm py-3">{envoi ? 'Création…' : 'Créer'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {chauffeurVu && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={() => setChauffeurVu(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-2xl p-7 max-w-md w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-display font-bold shrink-0">{initiales(chauffeurVu.prenom, chauffeurVu.nom)}</div>
              <div>
                <p className="text-[16px] font-display font-semibold text-ink">{chauffeurVu.prenom} {chauffeurVu.nom}</p>
                <p className="text-xs text-ink-soft font-mono">{chauffeurVu.telephone}</p>
              </div>
            </div>

            <div className="bg-off-white rounded-xl p-4 space-y-2 mb-4">
              <div className="kv"><span>Voyages effectués</span><span className="font-semibold">{chauffeurVu.nombre_voyages}</span></div>
              <div className="kv"><span>Note moyenne</span><span className="font-semibold">{chauffeurVu.note_moyenne ?? '—'}</span></div>
              <div className="kv"><span>Email</span><span className="font-semibold">{chauffeurVu.email ?? '—'}</span></div>
              <div className="kv"><span>Âge</span><span className="font-semibold">{calculerAge(chauffeurVu.date_naissance) != null ? `${calculerAge(chauffeurVu.date_naissance)} ans` : '—'}</span></div>
              <div className="border-t border-line pt-2 mt-1">
                <button onClick={() => setConfirmationRenvoi(true)} className="text-[11.5px] font-bold text-green-700">📧 Renvoyer ses identifiants par email</button>
              </div>
              <div className="kv items-center">
                <div>
                  <span className="block">Statut</span>
                  <Badge color={!chauffeurVu.desactive_urgence ? 'green' : 'red'}>{!chauffeurVu.desactive_urgence ? 'Actif' : 'Désactivé'}</Badge>
                </div>
                <BtnMini variant={!chauffeurVu.desactive_urgence ? 'danger' : 'primary'} onClick={() => demanderBasculeStatut(chauffeurVu)}>
                  {!chauffeurVu.desactive_urgence ? 'Désactiver' : 'Réactiver'}
                </BtnMini>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wide mb-2">Trajets à venir</p>
              {chargementTrajets ? (
                <p className="text-[12px] text-ink-soft">Chargement…</p>
              ) : trajetsChauffeur.length === 0 ? (
                <p className="text-[12px] text-ink-soft">Aucun trajet programmé ou en cours pour l&apos;instant.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {trajetsChauffeur.map((t) => (
                    <div key={t.id} className="flex items-center justify-between bg-off-white rounded-lg px-3 py-2">
                      <div>
                        <p className="text-[12.5px] font-semibold text-ink">{t.ville_depart} → {t.ville_arrivee}</p>
                        <p className="text-[10.5px] text-ink-soft">{t.date_depart.split('-').reverse().join('/')} · {t.heure_depart}</p>
                      </div>
                      <Badge color={couleurStatutTrajet[t.statut]}>{libellesStatutTrajet[t.statut]}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[10.5px] text-ink-soft mb-4">Le mot de passe est chiffré côté serveur — il ne peut plus être consulté une fois créé, seulement réinitialisé via le renvoi par email.</p>

            <div className="flex gap-3">
              <button onClick={() => setChauffeurVu(null)} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-sm py-3">Fermer</button>
              <button onClick={() => setConfirmationSuppression(chauffeurVu)} className="rounded-lg bg-red-bg text-red font-semibold text-sm px-4 py-3">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {confirmationStatut && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-[60]" onClick={() => setConfirmationStatut(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-2xl p-7 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-red-bg flex items-center justify-center mx-auto mb-4"><span className="text-xl">⚠</span></div>
            <p className="text-center text-sm font-bold text-ink mb-1">
              {!confirmationStatut.desactive_urgence ? 'Désactiver' : 'Réactiver'} {confirmationStatut.prenom} {confirmationStatut.nom} ?
            </p>
            <p className="text-center text-xs text-ink-soft mb-4">
              Pour confirmer, écris <strong>{!confirmationStatut.desactive_urgence ? 'DESACTIVER' : 'ACTIVER'}</strong> ci-dessous.
            </p>
            <input value={texteConfirmation} onChange={(e) => setTexteConfirmation(e.target.value)} placeholder={!confirmationStatut.desactive_urgence ? 'DESACTIVER' : 'ACTIVER'} className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-sm text-center font-bold mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setConfirmationStatut(null)} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-sm py-2.5">Annuler</button>
              <button onClick={confirmerBasculeStatut} disabled={texteConfirmation.trim().toUpperCase() !== (!confirmationStatut.desactive_urgence ? 'DESACTIVER' : 'ACTIVER')} className="flex-1 rounded-lg bg-red disabled:opacity-40 text-white font-semibold text-sm py-2.5">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {confirmationRenvoi && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-[60]" onClick={() => setConfirmationRenvoi(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-2xl p-7 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-amber-bg flex items-center justify-center mx-auto mb-4"><span className="text-xl">💬</span></div>
            <p className="text-center text-sm font-bold text-ink mb-1">Renvoyer les identifiants ?</p>
            <p className="text-center text-xs text-ink-soft mb-4">
              Pour confirmer, écris <strong>RENVOYER</strong> ci-dessous.
            </p>
            <input value={texteConfirmationRenvoi} onChange={(e) => setTexteConfirmationRenvoi(e.target.value)} placeholder="RENVOYER" className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-sm text-center font-bold mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setConfirmationRenvoi(false)} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-sm py-2.5">Annuler</button>
              <button onClick={renvoyerIdentifiants} disabled={texteConfirmationRenvoi.trim().toUpperCase() !== 'RENVOYER'} className="flex-1 rounded-lg bg-green-700 disabled:opacity-40 text-white font-semibold text-sm py-2.5">Confirmer</button>
            </div>
          </div>
        </div>
      )}
      {confirmationSuppression && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-[60]" onClick={() => setConfirmationSuppression(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-2xl p-7 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-red-bg flex items-center justify-center mx-auto mb-4"><span className="text-xl">🗑</span></div>
            <p className="text-center text-sm font-bold text-ink mb-1">Supprimer {confirmationSuppression.prenom} {confirmationSuppression.nom} ?</p>
            <p className="text-center text-xs text-ink-soft mb-4">
              Action définitive. Si ce chauffeur est assigné à un trajet à venir ou en cours, la suppression sera refusée — retire-le du trajet ou utilise plutôt &quot;Désactiver&quot;. Un historique de trajets déjà terminés n&apos;empêche pas la suppression.
              Pour confirmer, écris <strong>SUPPRIMER</strong> ci-dessous.
            </p>
            <input value={texteSuppression} onChange={(e) => setTexteSuppression(e.target.value)} placeholder="SUPPRIMER" className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-sm text-center font-bold mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setConfirmationSuppression(null)} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-sm py-2.5">Annuler</button>
              <button onClick={confirmerSuppression} disabled={texteSuppression.trim().toUpperCase() !== 'SUPPRIMER'} className="flex-1 rounded-lg bg-red disabled:opacity-40 text-white font-semibold text-sm py-2.5">Confirmer</button>
            </div>
          </div>
        </div>
      )}
      <ToastDemo message={toast} />
    </LayoutAgence>
  );
}
