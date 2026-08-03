'use client';

// ✅ BRANCHÉ (repli démo) — POST/GET /api/chauffeurs, PUT :id/desactiver,
// PUT :id/reactiver. Champs réels : nom, prenom, date_naissance,
// lieu_naissance, telephone, mot_de_passe (email/bus/missions n'existent
// pas côté backend — restent démo). Le mot de passe étant haché côté
// serveur, "voir le mot de passe" n'a plus de sens en mode réel — masqué
// hors démo.

import { useEffect, useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import { Panel, Badge, BtnMini, ToastDemo } from '../components/ui';
import TelephoneInput from '../components/TelephoneInput';
import { apiFetch } from '../lib/api';

type Chauffeur = {
  id: string | number;
  nom: string;
  prenom: string;
  telephone: string;
  statut: 'actif' | 'desactive';
  note_moyenne: number | null;
  nombre_voyages: number;
  // Démo uniquement :
  email?: string;
  dateNaissance?: string;
  busAssigne?: string | null;
  motDePasseDemo?: string;
  dateAdhesion?: string;
  missions?: { trajet: string; date: string; heure: string }[];
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

const chauffeursDemo: Chauffeur[] = [
  { id: '1', nom: "Eto'o", prenom: 'Paul', telephone: '+237 6 90 12 34 56', email: 'paul.etoo@gmail.com', dateNaissance: '1988-04-12', busAssigne: 'Confort Express 01', statut: 'actif', motDePasseDemo: 'chauffeur123', note_moyenne: 4.8, nombre_voyages: 214, dateAdhesion: '2025-03-12', missions: [
    { trajet: 'Douala → Yaounde', date: '2026-07-27', heure: '07:00' },
  ] },
  { id: '2', nom: 'Nkeng', prenom: 'Andre', telephone: '+237 6 90 22 33 44', email: 'andre.nkeng@gmail.com', dateNaissance: '1992-11-03', busAssigne: 'Confort 02', statut: 'actif', motDePasseDemo: 'route456', note_moyenne: 4.5, nombre_voyages: 98, dateAdhesion: '2025-08-04', missions: [] },
  { id: '3', nom: 'Biya', prenom: 'Robert', telephone: '+237 6 90 55 66 77', email: 'robert.biya@gmail.com', dateNaissance: '1979-07-22', busAssigne: null, statut: 'desactive', motDePasseDemo: 'trajet789', note_moyenne: null, nombre_voyages: 12, dateAdhesion: '2024-11-20', missions: [] },
];

type TriChauffeur = 'alpha' | 'notes';

function initiales(p: string, n: string) {
  return `${p[0] ?? ''}${n[0] ?? ''}`.toUpperCase();
}

export default function ChauffeursPage() {
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [modeDemo, setModeDemo] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [chauffeurVu, setChauffeurVu] = useState<Chauffeur | null>(null);
  // (remplacé par le flux codeMdp/codeMdpValide)
  const [tri, setTri] = useState<TriChauffeur>('alpha');
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'actif' | 'desactive'>('tous');

  const [confirmationStatut, setConfirmationStatut] = useState<Chauffeur | null>(null);
  const [texteConfirmation, setTexteConfirmation] = useState('');
  const [codeMdp, setCodeMdp] = useState<string | null>(null);
  const [codeMdpSaisi, setCodeMdpSaisi] = useState('');
  const [codeMdpValide, setCodeMdpValide] = useState(false);
  const [confirmationRenvoi, setConfirmationRenvoi] = useState(false);
  const [texteConfirmationRenvoi, setTexteConfirmationRenvoi] = useState('');

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
    setTimeout(() => setToast(null), 2200);
  }

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch('/api/chauffeurs');
      if (data.chauffeurs && data.chauffeurs.length > 0) {
        setChauffeurs(data.chauffeurs);
        setModeDemo(false);
      } else {
        setChauffeurs(chauffeursDemo);
        setModeDemo(true);
      }
    } catch {
      setChauffeurs(chauffeursDemo);
      setModeDemo(true);
    } finally {
      setChargement(false);
    }
  }
  useEffect(() => { charger(); }, []);

  const chauffeursAffiches = useMemo(() => {
    const copie = chauffeurs.filter((c) => filtreStatut === 'tous' || c.statut === filtreStatut);
    if (tri === 'notes') return [...copie].sort((a, b) => (b.note_moyenne ?? 0) - (a.note_moyenne ?? 0));
    return [...copie].sort((a, b) => a.nom.localeCompare(b.nom));
  }, [chauffeurs, tri, filtreStatut]);

  function envoyerCodeMdp() {
    const nouveau = String(Math.floor(100000 + Math.random() * 900000));
    setCodeMdp(nouveau);
    setCodeMdpValide(false);
    setCodeMdpSaisi('');
    notifier(`Code envoyé au mail du directeur (démo : ${nouveau})`);
  }

  function verifierCodeMdp() {
    if (codeMdpSaisi === codeMdp) {
      setCodeMdpValide(true);
    } else {
      notifier('Code incorrect');
    }
  }

  function renvoyerIdentifiants() {
    if (texteConfirmationRenvoi.trim().toUpperCase() !== 'RENVOYER') return;
    notifier(`Identifiants renvoyés par email (démo)${chauffeurVu ? ` à ${chauffeurVu.email ?? chauffeurVu.prenom}` : ''}`);
    setConfirmationRenvoi(false);
    setTexteConfirmationRenvoi('');
  }

  function demanderBasculeStatut(c: Chauffeur) {
    setConfirmationStatut(c);
    setTexteConfirmation('');
  }

  async function confirmerBasculeStatut() {
    if (!confirmationStatut) return;
    const motAttendu = confirmationStatut.statut === 'actif' ? 'DESACTIVER' : 'ACTIVER';
    if (texteConfirmation.trim().toUpperCase() !== motAttendu) return;
    const id = confirmationStatut.id;
    const action = confirmationStatut.statut === 'actif' ? 'desactiver' : 'reactiver';
    try {
      if (modeDemo) {
        setChauffeurs((prev) => prev.map((c) => (c.id === id ? { ...c, statut: c.statut === 'actif' ? 'desactive' : 'actif' } : c)));
      } else {
        await apiFetch(`/api/chauffeurs/${id}/${action}`, { method: 'PUT' });
        await charger();
      }
      notifier(action === 'desactiver' ? 'Chauffeur désactivé' : 'Chauffeur réactivé');
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setChauffeurVu(null);
      setConfirmationStatut(null);
    }
  }

  async function creerChauffeurSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim() || !email.trim() || !telephone.trim() || !dateNaissance || !lieuNaissance.trim()) return;
    setEnvoi(true);
    const motDePasseGenere = genererMotDePasse();
    try {
      if (modeDemo) {
        await new Promise((r) => setTimeout(r, 600));
      } else {
        // ⚠️ email envoyé mais ignoré côté backend — creerChauffeur() n'a pas
        // de colonne email pour l'instant, donc il n'est pas réellement sauvegardé.
        await apiFetch('/api/chauffeurs', {
          method: 'POST',
          body: JSON.stringify({ nom, prenom, email, telephone: `${indicatifTel} ${telephone}`.trim(), date_naissance: dateNaissance, lieu_naissance: lieuNaissance, mot_de_passe: motDePasseGenere }),
        });
        await charger();
      }
      // ⚠️ DÉMO — aucun envoi d'email réel n'a lieu, aucune route backend
      // n'existe pour ça. Le mot de passe généré n'est affiché nulle part
      // volontairement, pour rester cohérent avec "envoyé automatiquement".
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

        {modeDemo && <div className="text-xs font-semibold text-amber bg-amber-bg rounded-lg px-3 py-2 mb-4">Mode démo — backend injoignable, données factices</div>}
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
                      <Badge color={c.statut === 'actif' ? 'green' : 'red'}>{c.statut === 'actif' ? 'Actif' : 'Désactivé'}</Badge>
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
                <p className="text-sm text-ink-soft mb-6">{modeDemo ? 'Démo — rien de réel créé, aucun email envoyé.' : `${prenom} ${nom} a été créé. Ses identifiants de connexion ont été générés automatiquement (envoi par email non branché — aucune route backend pour ça pour l'instant).`}</p>
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
                <p className="text-[10.5px] text-ink-soft">🔐 Identifiants générés automatiquement et envoyés par email au chauffeur — pas besoin de les saisir.</p>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={() => { setChauffeurVu(null); setCodeMdp(null); setCodeMdpValide(false); }}>
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
              <div className="kv"><span>Email</span><span className="font-semibold">{chauffeurVu.email ?? "non fourni par l'API"}</span></div>
              <div className="kv"><span>Âge</span><span className="font-semibold">{calculerAge(chauffeurVu.dateNaissance) != null ? `${calculerAge(chauffeurVu.dateNaissance)} ans` : "non fourni par l'API"}</span></div>
              {modeDemo && chauffeurVu.motDePasseDemo && (
                <div className="border-t border-line pt-2 mt-1">
                  {!codeMdpValide ? (
                    codeMdp === null ? (
                      <button onClick={envoyerCodeMdp} className="text-[11.5px] font-bold text-green-700">🔐 Envoyer un code par email pour voir le mot de passe</button>
                    ) : (
                      <div>
                        <p className="text-[11px] text-ink-soft mb-1.5">Code envoyé au mail du directeur</p>
                        <div className="flex gap-2">
                          <input value={codeMdpSaisi} onChange={(e) => setCodeMdpSaisi(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Code à 6 chiffres" className="flex-1 rounded-lg bg-off-white border border-line px-3 py-2 text-[12px]" />
                          <button onClick={verifierCodeMdp} className="rounded-lg bg-green-700 text-white text-[11px] font-bold px-3">Valider</button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="kv">
                      <span>Mot de passe (démo)</span>
                      <span className="font-semibold text-ink font-mono">{chauffeurVu.motDePasseDemo}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="border-t border-line pt-2 mt-1">
                <button onClick={() => setConfirmationRenvoi(true)} className="text-[11.5px] font-bold text-green-700">📧 Renvoyer ses identifiants par email</button>
              </div>
              <div className="kv items-center">
                <div>
                  <span className="block">Statut</span>
                  <Badge color={chauffeurVu.statut === 'actif' ? 'green' : 'red'}>{chauffeurVu.statut === 'actif' ? 'Actif' : 'Désactivé'}</Badge>
                </div>
                <BtnMini variant={chauffeurVu.statut === 'actif' ? 'danger' : 'primary'} onClick={() => demanderBasculeStatut(chauffeurVu)}>
                  {chauffeurVu.statut === 'actif' ? 'Désactiver' : 'Réactiver'}
                </BtnMini>
              </div>
            </div>

            {!modeDemo && (
              <p className="text-[10.5px] text-ink-soft mb-4">Le mot de passe est chiffré côté serveur — il ne peut plus être consulté une fois créé, seulement réinitialisé.</p>
            )}

            <button onClick={() => { setChauffeurVu(null); setCodeMdp(null); setCodeMdpValide(false); }} className="w-full rounded-lg bg-off-white border border-line text-ink font-semibold text-sm py-3">Fermer</button>
          </div>
        </div>
      )}

      {confirmationStatut && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-[60]" onClick={() => setConfirmationStatut(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-2xl p-7 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-red-bg flex items-center justify-center mx-auto mb-4"><span className="text-xl">⚠</span></div>
            <p className="text-center text-sm font-bold text-ink mb-1">
              {confirmationStatut.statut === 'actif' ? 'Désactiver' : 'Réactiver'} {confirmationStatut.prenom} {confirmationStatut.nom} ?
            </p>
            <p className="text-center text-xs text-ink-soft mb-4">
              Pour confirmer, écris <strong>{confirmationStatut.statut === 'actif' ? 'DESACTIVER' : 'ACTIVER'}</strong> ci-dessous.
            </p>
            <input value={texteConfirmation} onChange={(e) => setTexteConfirmation(e.target.value)} placeholder={confirmationStatut.statut === 'actif' ? 'DESACTIVER' : 'ACTIVER'} className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-sm text-center font-bold mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setConfirmationStatut(null)} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-sm py-2.5">Annuler</button>
              <button onClick={confirmerBasculeStatut} disabled={texteConfirmation.trim().toUpperCase() !== (confirmationStatut.statut === 'actif' ? 'DESACTIVER' : 'ACTIVER')} className="flex-1 rounded-lg bg-red disabled:opacity-40 text-white font-semibold text-sm py-2.5">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {confirmationRenvoi && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-[60]" onClick={() => setConfirmationRenvoi(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-line rounded-2xl p-7 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-amber-bg flex items-center justify-center mx-auto mb-4"><span className="text-xl">📧</span></div>
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
      <ToastDemo message={toast} />
    </LayoutAgence>
  );
}
