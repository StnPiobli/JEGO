'use client';

import { useState } from 'react';

/**
 * Ecran de connexion agence. Interface complete, mais l'appel reel a
 * l'API (POST /api/agences/connexion) n'est PAS encore branche --
 * voir TODO ci-dessous. Contrat backend deja confirme :
 *   body: { email, mot_de_passe }
 *   succes: { message, agence: {...}, token }
 *   echec (401): { error }
 */
export default function ConnexionAgence() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (!email.trim() || !motDePasse.trim()) {
      setErreur('Email et mot de passe sont obligatoires.');
      return;
    }

    setChargement(true);

    // TODO (branchement backend) : remplacer ce bloc par un vrai appel :
    //
    // try {
    //   const reponse = await fetch('http://localhost:5000/api/agences/connexion', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email, mot_de_passe: motDePasse }),
    //   });
    //   const donnees = await reponse.json();
    //   if (!reponse.ok) {
    //     setErreur(donnees.error || 'Email ou mot de passe incorrect.');
    //     return;
    //   }
    //   // Stocker donnees.token + donnees.agence, rediriger vers le tableau de bord.
    // } catch {
    //   setErreur('Impossible de contacter le serveur. Reessaie.');
    // } finally {
    //   setChargement(false);
    // }

    // Interface seule pour l'instant : simule un court delai puis affiche
    // une erreur neutre pour montrer l'etat "echec" de l'ecran.
    await new Promise((r) => setTimeout(r, 700));
    setChargement(false);
    setErreur('Connexion non branchee pour l\'instant (interface uniquement).');
  }

  return (
    <div className="min-h-screen bg-[#EEF1EE] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo / marque */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0B9E63] to-[#10C070] flex items-center justify-center shadow-lg shadow-[#0B9E63]/20 mb-4">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="6" width="18" height="12" rx="3" />
              <circle cx="7.5" cy="18" r="1.5" fill="white" />
              <circle cx="16.5" cy="18" r="1.5" fill="white" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-[#14201A] tracking-tight">JEGO</h1>
          <p className="text-sm text-[#64746C] mt-1">Espace Agence</p>
        </div>

        {/* Carte formulaire */}
        <form
          onSubmit={seConnecter}
          className="bg-white rounded-3xl border border-[#E7ECE8] shadow-sm p-8"
        >
          <h2 className="text-lg font-extrabold text-[#14201A] mb-1">Connexion</h2>
          <p className="text-sm text-[#64746C] mb-6">
            Accede a la gestion de tes trajets, ta flotte et tes chauffeurs.
          </p>

          <label className="block text-xs font-semibold text-[#64746C] mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErreur(null);
            }}
            placeholder="contact@monagence.cm"
            className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors mb-4"
          />

          <label className="block text-xs font-semibold text-[#64746C] mb-1.5">
            Mot de passe
          </label>
          <div className="relative mb-1">
            <input
              type={motDePasseVisible ? 'text' : 'password'}
              value={motDePasse}
              onChange={(e) => {
                setMotDePasse(e.target.value);
                setErreur(null);
              }}
              placeholder="••••••••"
              className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 pr-11 text-sm text-[#14201A] transition-colors"
            />
            <button
              type="button"
              onClick={() => setMotDePasseVisible((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AA69F] hover:text-[#64746C] transition-colors"
              tabIndex={-1}
            >
              {motDePasseVisible ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {erreur && (
            <p className="text-xs text-[#D9534F] font-medium mt-2 mb-2">{erreur}</p>
          )}

          <div className="flex justify-end mb-6 mt-2">
            <button
              type="button"
              className="text-xs font-semibold text-[#0B9E63] hover:underline"
            >
              Mot de passe oublie ?
            </button>
          </div>

          <button
            type="submit"
            disabled={chargement}
            className="w-full rounded-xl bg-[#0B9E63] hover:bg-[#0A8D58] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 transition-colors shadow-lg shadow-[#0B9E63]/25"
          >
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="flex items-center justify-center gap-1.5 mt-6 text-sm">
            <span className="text-[#64746C]">Nouvelle agence ?</span>
            <button type="button" className="font-bold text-[#0B9E63] hover:underline">
              Demander une inscription
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-[#9AA69F] mt-6">
          Espace reserve aux agences partenaires JEGO.
        </p>
      </div>
    </div>
  );
}