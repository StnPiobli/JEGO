'use client';

import { useState } from 'react';
import { useLangue } from './lib/langue';

export default function ConnexionAgence() {
  const langue = useLangue();
  const t = langue === 'en' ? {
    agencySpace: 'Agency space', login: 'Login', subtitle: 'Access the management of your trips, fleet and drivers.', emailRequired: 'Email and password are required.', unavailable: 'Login is not connected yet (interface only).',
    password: 'Password', hide: 'Hide', show: 'Show', forgot: 'Forgot password?', loading: 'Signing in...', signIn: 'Sign in', newAgency: 'New agency?', requestSignup: 'Request signup', reserved: 'Space reserved for JEGO partner agencies.',
    signupTitle: 'Signup request', signupText: 'The director personal contact will receive the unique 8-digit security code.', agencyName: 'Agency name', officialMail: 'Official agency email', directorContact: 'Director personal email or phone', codeOnly: 'The validation code will be sent only to this contact.',
    cancel: 'Cancel', sendRequest: 'Send request', sentTitle: 'Request sent', sentText: 'JEGO will use the agency email and the director contact to complete registration and send the security code.', close: 'Close', agencyAndContactRequired: 'Agency name, agency email and director email or phone are required.'
  } : {
    agencySpace: 'Espace Agence', login: 'Connexion', subtitle: 'Accede a la gestion de tes trajets, ta flotte et tes chauffeurs.', emailRequired: 'Email et mot de passe sont obligatoires.', unavailable: "Connexion non branchee pour l'instant (interface uniquement).",
    password: 'Mot de passe', hide: 'Cacher', show: 'Voir', forgot: 'Mot de passe oublie ?', loading: 'Connexion...', signIn: 'Se connecter', newAgency: 'Nouvelle agence ?', requestSignup: 'Demander une inscription', reserved: 'Espace reserve aux agences partenaires JEGO.',
    signupTitle: "Demande d'inscription", signupText: 'Le contact personnel du directeur recevra le code unique de securite a 8 chiffres.', agencyName: "Nom de l'agence", officialMail: "Mail officiel de l'agence", directorContact: 'Mail personnel ou telephone du directeur', codeOnly: 'Le code de validation sera envoye uniquement a ce contact.',
    cancel: 'Annuler', sendRequest: 'Envoyer la demande', sentTitle: 'Demande envoyee', sentText: "JEGO utilisera le mail de l'agence et le contact du directeur pour finaliser l'inscription et transmettre le code de securite.", close: 'Fermer', agencyAndContactRequired: "Le nom, le mail de l'agence et le mail ou telephone du directeur sont obligatoires."
  };
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const [inscriptionOuverte, setInscriptionOuverte] = useState(false);
  const [nomAgence, setNomAgence] = useState('');
  const [emailAgenceInscription, setEmailAgenceInscription] = useState('');
  const [contactDirecteur, setContactDirecteur] = useState('');
  const [inscriptionEnvoyee, setInscriptionEnvoyee] = useState(false);
  const [erreurInscription, setErreurInscription] = useState('');

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!email.trim() || !motDePasse.trim()) {
      setErreur(t.emailRequired);
      return;
    }
    setChargement(true);
    await new Promise((r) => setTimeout(r, 700));
    setChargement(false);
    setErreur(t.unavailable);
  }

  async function demanderInscription(e: React.FormEvent) {
    e.preventDefault();
    setErreurInscription('');
    if (!nomAgence.trim() || !emailAgenceInscription.trim() || !contactDirecteur.trim()) {
      setErreurInscription(t.agencyAndContactRequired);
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
    setInscriptionEnvoyee(true);
  }

  function fermerInscription() {
    setInscriptionOuverte(false);
    setInscriptionEnvoyee(false);
    setErreurInscription('');
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(11,158,99,.10),transparent_25%),#EEF1EE] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-[24px] font-extrabold text-[#14201A] tracking-tight">JEGO</h1>
          <p className="text-[12px] text-[#64746C] mt-1">{t.agencySpace}</p>
        </div>

        <form onSubmit={seConnecter} className="bg-white/92 backdrop-blur-md rounded-3xl border border-white shadow-[0_20px_60px_rgba(20,32,26,.10)] p-7">
          <h2 className="text-[17px] font-extrabold text-[#14201A] mb-1">{t.login}</h2>
          <p className="text-[12px] text-[#64746C] mb-5">{t.subtitle}</p>

          <label className="block text-[10px] font-semibold text-[#64746C] mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErreur(null); }}
            placeholder="contact@monagence.cm"
            className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-[12px] text-[#14201A] transition-colors mb-4"
          />

          <label className="block text-[10px] font-semibold text-[#64746C] mb-1.5">{t.password}</label>
          <div className="relative mb-1">
            <input
              type={motDePasseVisible ? 'text' : 'password'}
              value={motDePasse}
              onChange={(e) => { setMotDePasse(e.target.value); setErreur(null); }}
              placeholder="••••••••"
              className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 pr-11 text-[12px] text-[#14201A] transition-colors"
            />
            <button type="button" onClick={() => setMotDePasseVisible((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#0B9E63]">
              {motDePasseVisible ? t.hide : t.show}
            </button>
          </div>

          {erreur && <p className="text-[10px] text-[#D9534F] font-medium mt-2">{erreur}</p>}

          <div className="flex justify-end mb-5 mt-2">
            <button type="button" className="text-[10px] font-semibold text-[#0B9E63] hover:underline">{t.forgot}</button>
          </div>

          <button type="submit" disabled={chargement} className="w-full rounded-xl bg-[#0B9E63] hover:bg-[#0A8D58] disabled:opacity-60 text-white font-bold text-[12px] py-3.5 shadow-lg shadow-[#0B9E63]/20">
            {chargement ? t.loading : t.signIn}
          </button>

          <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px]">
            <span className="text-[#64746C]">{t.newAgency}</span>
            <button type="button" onClick={() => setInscriptionOuverte(true)} className="font-bold text-[#0B9E63] hover:underline">{t.requestSignup}</button>
          </div>
        </form>

        <p className="text-center text-[10px] text-[#9AA69F] mt-5">{t.reserved}</p>
      </div>

      {inscriptionOuverte && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-50" onClick={fermerInscription}>
          <div className="bg-white rounded-3xl p-7 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {!inscriptionEnvoyee ? (
              <form onSubmit={demanderInscription}>
                <h2 className="text-[18px] font-extrabold text-[#14201A] mb-1">{t.signupTitle}</h2>
                <p className="text-[11px] text-[#64746C] mb-5">{t.signupText}</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64746C] mb-1.5">{t.agencyName}</label>
                    <input value={nomAgence} onChange={(e) => setNomAgence(e.target.value)} placeholder="Finexs Voyages" className="w-full rounded-xl bg-[#F1F4F1] px-4 py-3 text-[12px] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64746C] mb-1.5">{t.officialMail}</label>
                    <input type="email" value={emailAgenceInscription} onChange={(e) => setEmailAgenceInscription(e.target.value)} placeholder="contact@agence.cm" className="w-full rounded-xl bg-[#F1F4F1] px-4 py-3 text-[12px] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64746C] mb-1.5">{t.directorContact}</label>
                    <input value={contactDirecteur} onChange={(e) => setContactDirecteur(e.target.value)} placeholder="directeur@gmail.com ou +237..." className="w-full rounded-xl bg-[#F1F4F1] px-4 py-3 text-[12px] outline-none" />
                    <p className="text-[9px] text-[#9AA69F] mt-1.5">{t.codeOnly}</p>
                  </div>
                </div>

                {erreurInscription && <p className="text-[10px] text-[#D9534F] mt-3">{erreurInscription}</p>}

                <div className="flex gap-3 mt-5">
                  <button type="button" onClick={fermerInscription} className="flex-1 rounded-xl bg-[#F1F4F1] text-[#14201A] font-bold text-[11px] py-3">{t.cancel}</button>
                  <button type="submit" className="flex-1 rounded-xl bg-[#0B9E63] text-white font-bold text-[11px] py-3">{t.sendRequest}</button>
                </div>
              </form>
            ) : (
              <div className="text-center py-3">
                <div className="w-12 h-12 rounded-full bg-[#0B9E63]/10 text-[#0B9E63] flex items-center justify-center mx-auto mb-3 text-lg">✓</div>
                <h2 className="text-[17px] font-extrabold text-[#14201A]">{t.sentTitle}</h2>
                <p className="text-[11px] text-[#64746C] mt-2">{t.sentText}</p>
                <button onClick={fermerInscription} className="mt-5 w-full rounded-xl bg-[#0B9E63] text-white font-bold text-[11px] py-3">{t.close}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
