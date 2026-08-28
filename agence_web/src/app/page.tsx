'use client';

// ✅ Connexion BRANCHÉE — POST /api/agences/connexion (email, mot_de_passe)
// ✅ Inscription BRANCHÉE — POST /api/agences/inscription, tous les champs
// réels collectés (nom, email, telephone, adresse, ville, registre_commerce,
// mot_de_passe).
// ✅ Redirection après connexion basée sur le VRAI statut renvoyé par le
// backend (en_attente / refuse / actif) — seul le contenu des pages de
// destination (pièces justificatives, complétion de profil...) est démo.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLangue } from './lib/langue';
import { apiFetch, setSession, onboardingComplet } from './lib/api';
import TelephoneInput from './components/TelephoneInput';
import PasswordStrength from './components/PasswordStrength';

export default function ConnexionAgence() {
  const langue = useLangue();
  const router = useRouter();
  const t = langue === 'en' ? {
    agencySpace: 'Agency space', login: 'Login', subtitle: 'Access the management of your trips, fleet and drivers.', emailRequired: 'Email and password are required.',
    password: 'Password', hide: 'Hide', show: 'Show', forgot: 'Forgot password?', loading: 'Signing in...', signIn: 'Sign in', newAgency: 'New agency?', requestSignup: 'Request signup', reserved: 'Space reserved for JEGO partner agencies.',
    signupTitle: 'Signup request', agencyName: 'Agency name', officialMail: 'Official agency email', address: 'Address', city: 'City', registre: 'Business registration number',
    cancel: 'Cancel', sendRequest: 'Send request', sentTitle: 'Request sent', sentText: 'Your agency is pending validation by JEGO.', close: 'Close', requiredFields: 'Name, email, phone and password are required.',
  } : {
    agencySpace: 'Espace Agence', login: 'Connexion', subtitle: 'Accède à la gestion de tes trajets, ta flotte et tes chauffeurs.', emailRequired: 'Email et mot de passe sont obligatoires.',
    password: 'Mot de passe', hide: 'Cacher', show: 'Voir', forgot: 'Mot de passe oublié ?', loading: 'Connexion...', signIn: 'Se connecter', newAgency: 'Nouvelle agence ?', requestSignup: 'Demander une inscription', reserved: 'Espace réservé aux agences partenaires JEGO.',
    signupTitle: "Demande d'inscription", agencyName: "Nom de l'agence", officialMail: "Email de l'agence", address: 'Adresse', city: 'Ville', registre: 'Numéro de registre de commerce',
    cancel: 'Annuler', sendRequest: 'Envoyer la demande', sentTitle: 'Demande envoyée', sentText: 'Ton agence est en attente de validation par JEGO.', close: 'Fermer', requiredFields: 'Nom, email, téléphone et mot de passe sont obligatoires.',
  };

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const [inscriptionOuverte, setInscriptionOuverte] = useState(false);
  const [nomAgence, setNomAgence] = useState('');
  const [emailInscription, setEmailInscription] = useState('');
  const [indicatifInscription, setIndicatifInscription] = useState('+237');
  const [telInscription, setTelInscription] = useState('');
  const [adresseInscription, setAdresseInscription] = useState('');
  const [villeInscription, setVilleInscription] = useState('');
  const [registreInscription, setRegistreInscription] = useState('');
  const [mdpInscription, setMdpInscription] = useState('');
  const [inscriptionEnvoyee, setInscriptionEnvoyee] = useState(false);
  const [erreurInscription, setErreurInscription] = useState('');
  const [envoiInscription, setEnvoiInscription] = useState(false);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!email.trim() || !motDePasse.trim()) {
      setErreur(t.emailRequired);
      return;
    }
    setChargement(true);
    try {
      const data = await apiFetch('/api/agences/connexion', {
        method: 'POST',
        body: JSON.stringify({ email, mot_de_passe: motDePasse }),
      });
      setSession(data.token, data.agence);
      router.push(routeSelonStatut(data.agence));
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setChargement(false);
    }
  }

  function routeSelonStatut(agence: { id: number; statut?: string; ville?: string | null; telephone?: string | null }): string {
    if (agence.statut === 'en_attente') return '/en-attente';
    if (agence.statut === 'refuse') return '/rejete';
    // Une agence deja renseignee (ville + telephone en base) n'a pas a
    // repasser par la premiere connexion, meme sur un nouveau navigateur
    // ou le flag local est absent.
    const dejaRenseignee = !!(agence.ville && agence.telephone);
    if (!dejaRenseignee && !onboardingComplet(agence.id)) return '/completer-profil';
    return '/accueil';
  }

  async function demanderInscription(e: React.FormEvent) {
    e.preventDefault();
    setErreurInscription('');
    if (!nomAgence.trim() || !emailInscription.trim() || !telInscription.trim() || !mdpInscription.trim()) {
      setErreurInscription(t.requiredFields);
      return;
    }
    setEnvoiInscription(true);
    try {
      await apiFetch('/api/agences/inscription', {
        method: 'POST',
        body: JSON.stringify({
          nom: nomAgence, email: emailInscription,
          telephone: `${indicatifInscription} ${telInscription}`.trim(),
          adresse: adresseInscription, ville: villeInscription,
          registre_commerce: registreInscription, mot_de_passe: mdpInscription,
        }),
      });
      setInscriptionEnvoyee(true);
    } catch (err) {
      setErreurInscription(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setEnvoiInscription(false);
    }
  }

  function fermerInscription() {
    setInscriptionOuverte(false);
    setInscriptionEnvoyee(false);
    setErreurInscription('');
    setNomAgence(''); setEmailInscription(''); setTelInscription(''); setAdresseInscription('');
    setVilleInscription(''); setRegistreInscription(''); setMdpInscription('');
  }

  return (
    <div className="min-h-screen bg-green-900 bg-[radial-gradient(circle_at_15%_20%,rgba(111,190,148,.12),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(111,190,148,.10),transparent_40%)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-[11px] bg-green-500 text-white flex items-center justify-center font-display font-bold text-lg -rotate-3 mb-3">J</div>
          <h1 className="text-[22px] font-display font-bold text-on-dark tracking-tight">JEGO</h1>
          <p className="text-[12px] text-green-300 mt-1">{t.agencySpace}</p>
        </div>

        <form onSubmit={seConnecter} className="bg-paper rounded-[18px] border border-line shadow-card p-7">
          <h2 className="text-[16px] font-display font-semibold text-ink mb-1">{t.login}</h2>
          <p className="text-[12px] text-ink-soft mb-5">{t.subtitle}</p>

          <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErreur(null); }}
            placeholder="contact@monagence.cm"
            className="w-full rounded-lg bg-off-white border border-line focus:border-green-500 outline-none px-4 py-2.5 text-[13px] mb-4"
          />

          <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">{t.password}</label>
          <div className="relative mb-1">
            <input
              type={motDePasseVisible ? 'text' : 'password'}
              value={motDePasse}
              onChange={(e) => { setMotDePasse(e.target.value); setErreur(null); }}
              placeholder="••••••••"
              className="w-full rounded-lg bg-off-white border border-line focus:border-green-500 outline-none px-4 py-2.5 pr-14 text-[13px]"
            />
            <button type="button" onClick={() => setMotDePasseVisible((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] font-bold text-green-700">
              {motDePasseVisible ? t.hide : t.show}
            </button>
          </div>

          {erreur && <p className="text-[11px] text-red font-medium mt-2 bg-red-bg rounded-lg px-3 py-2">{erreur}</p>}

          <div className="flex justify-end mb-4 mt-2">
            <button type="button" className="text-[11px] font-semibold text-green-700 hover:underline">{t.forgot}</button>
          </div>

          <button type="submit" disabled={chargement} className="w-full rounded-lg bg-green-700 hover:bg-green-900 disabled:opacity-60 text-white font-semibold text-[13px] py-3 transition-colors">
            {chargement ? t.loading : t.signIn}
          </button>

          <div className="flex items-center justify-center gap-1.5 mt-5 text-[11.5px]">
            <span className="text-ink-soft">{t.newAgency}</span>
            <button type="button" onClick={() => setInscriptionOuverte(true)} className="font-semibold text-green-700 hover:underline">{t.requestSignup}</button>
          </div>
        </form>

        <p className="text-center text-[10.5px] text-green-300/70 mt-5">{t.reserved}</p>

      </div>

      {inscriptionOuverte && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-50 overflow-y-auto" onClick={fermerInscription}>
          <div className="bg-paper rounded-[18px] border border-line p-7 max-w-md w-full my-8" onClick={(e) => e.stopPropagation()}>
            {!inscriptionEnvoyee ? (
              <form onSubmit={demanderInscription}>
                <h2 className="text-[16px] font-display font-semibold text-ink mb-4">{t.signupTitle}</h2>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">{t.agencyName}</label>
                    <input value={nomAgence} onChange={(e) => setNomAgence(e.target.value)} placeholder="Finexs Voyages" className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">{t.officialMail}</label>
                    <input type="email" value={emailInscription} onChange={(e) => setEmailInscription(e.target.value)} placeholder="contact@agence.cm" className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">Téléphone</label>
                    <TelephoneInput indicatif={indicatifInscription} numero={telInscription} onChangeIndicatif={setIndicatifInscription} onChangeNumero={setTelInscription} />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">{t.address}</label>
                    <input value={adresseInscription} onChange={(e) => setAdresseInscription(e.target.value)} className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">{t.city}</label>
                    <input value={villeInscription} onChange={(e) => setVilleInscription(e.target.value)} className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">{t.registre}</label>
                    <input value={registreInscription} onChange={(e) => setRegistreInscription(e.target.value)} className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">{t.password}</label>
                    <input type="password" value={mdpInscription} onChange={(e) => setMdpInscription(e.target.value)} className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px] outline-none" />
                    <PasswordStrength mdp={mdpInscription} />
                  </div>
                </div>

                {erreurInscription && <p className="text-[11px] text-red mt-3">{erreurInscription}</p>}

                <div className="flex gap-3 mt-5">
                  <button type="button" onClick={fermerInscription} className="flex-1 rounded-lg bg-off-white border border-line text-ink font-semibold text-[12px] py-2.5">{t.cancel}</button>
                  <button type="submit" disabled={envoiInscription} className="flex-1 rounded-lg bg-green-700 disabled:opacity-60 text-white font-semibold text-[12px] py-2.5">{envoiInscription ? '…' : t.sendRequest}</button>
                </div>
              </form>
            ) : (
              <div className="text-center py-3">
                <div className="w-12 h-12 rounded-full bg-ok-bg text-green-700 flex items-center justify-center mx-auto mb-3 text-lg">✓</div>
                <h2 className="text-[16px] font-display font-semibold text-ink">{t.sentTitle}</h2>
                <p className="text-[11.5px] text-ink-soft mt-2">{t.sentText}</p>
                <button onClick={fermerInscription} className="mt-5 w-full rounded-lg bg-green-700 text-white font-semibold text-[12px] py-2.5">{t.close}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
