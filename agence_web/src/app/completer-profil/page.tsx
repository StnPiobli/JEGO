'use client';

// ⚠️ DEMO — écran obligatoire à la première connexion après validation.
// Aucune route PUT de mise à jour de profil n'existe côté backend
// (agenceController.js n'a que inscription/connexion/monProfil), donc la
// sauvegarde reste locale (marque juste "onboarding terminé").

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAgenceLocale, marquerOnboardingComplet, clearSession } from '../lib/api';
import TelephoneInput from '../components/TelephoneInput';

export default function CompleterProfilPage() {
  const router = useRouter();
  const agence = getAgenceLocale();

  // Une agence deja renseignee (ville + telephone) n'a rien a completer :
  // on la renvoie directement au tableau de bord au lieu de la bloquer
  // sur ce formulaire.
  useEffect(() => {
    if (agence?.ville && agence?.telephone) router.replace('/accueil');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [nomAgence, setNomAgence] = useState(agence?.nom ?? '');
  const [description, setDescription] = useState('');
  const [indicatifTel, setIndicatifTel] = useState('+237');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [ville, setVille] = useState('');
  const [modeReception, setModeReception] = useState<'Orange Money' | 'MTN MoMo' | 'Virement bancaire' | 'Carte bancaire'>('Orange Money');
  const [nomRecepteur, setNomRecepteur] = useState('');
  const [numeroReception, setNumeroReception] = useState('');
  const [fichierIban, setFichierIban] = useState<File | null>(null);
  const [erreur, setErreur] = useState('');

  function valider(e: React.FormEvent) {
    e.preventDefault();
    if (!nomAgence.trim() || !telephone.trim() || !adresse.trim() || !ville.trim() || !numeroReception.trim()) {
      setErreur('Tous les champs sont obligatoires.');
      return;
    }
    if (modeReception === 'Carte bancaire' && !fichierIban) {
      setErreur("Le document IBAN est obligatoire pour le mode de réception 'Carte bancaire'.");
      return;
    }
    if ((modeReception === 'Orange Money' || modeReception === 'MTN MoMo') && !nomRecepteur.trim()) {
      setErreur('Le nom du récepteur est obligatoire pour Orange Money / MTN MoMo.');
      return;
    }
    if (agence) marquerOnboardingComplet(agence.id);
    router.push('/accueil');
  }

  return (
    <div className="h-screen bg-off-white flex items-start justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-green-700 text-white flex items-center justify-center font-display font-bold -rotate-3">J</div>
            <span className="font-display font-bold text-ink">JEGO</span>
          </div>
          <button onClick={() => { clearSession(); router.push('/'); }} className="text-[11px] font-semibold text-ink-soft underline">Se déconnecter</button>
        </div>

        <form onSubmit={valider} className="bg-paper rounded-2xl border border-line shadow-card p-7">
          <h1 className="text-[19px] font-display font-bold text-ink mb-1">Bienvenue sur JEGO</h1>
          <p className="text-[13px] text-ink-soft mb-5">Ton dossier est validé — complète les informations générales de ton agence avant de continuer.</p>

          <div className="grid md:grid-cols-2 gap-3.5">
            <div className="md:col-span-2">
              <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">Nom de l&apos;agence</label>
              <input value={nomAgence} onChange={(e) => setNomAgence(e.target.value)} className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">Description publique</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px]" />
            </div>
            <div>
              <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">Téléphone</label>
              <TelephoneInput indicatif={indicatifTel} numero={telephone} onChangeIndicatif={setIndicatifTel} onChangeNumero={setTelephone} />
            </div>
            <div>
              <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">Ville</label>
              <input value={ville} onChange={(e) => setVille(e.target.value)} className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">Adresse</label>
              <input value={adresse} onChange={(e) => setAdresse(e.target.value)} className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px]" />
            </div>

            <div className="md:col-span-2 pt-2 border-t border-dashed border-line mt-1">
              <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5 mt-2">Mode de réception des versements</label>
              <div className="flex flex-wrap gap-2">
                {(['Orange Money', 'MTN MoMo', 'Virement bancaire', 'Carte bancaire'] as const).map((m) => (
                  <button type="button" key={m} onClick={() => setModeReception(m)} className={`text-[11px] font-semibold py-2 px-3 rounded-lg border ${modeReception === m ? 'bg-ink text-white border-ink' : 'bg-off-white border-line text-ink-soft'}`}>{m}</button>
                ))}
              </div>
            </div>

            {(modeReception === 'Orange Money' || modeReception === 'MTN MoMo') && (
              <div className="md:col-span-2">
                <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">Nom du récepteur (titulaire du compte {modeReception})</label>
                <input value={nomRecepteur} onChange={(e) => setNomRecepteur(e.target.value)} className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px]" />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">{modeReception === 'Carte bancaire' ? 'IBAN' : 'Numéro / référence'}</label>
              <input value={numeroReception} onChange={(e) => setNumeroReception(e.target.value)} className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px]" />
            </div>

            {modeReception === 'Carte bancaire' && (
              <div className="md:col-span-2">
                {!fichierIban ? (
                  <label className="rounded-lg bg-off-white border border-line text-ink font-bold text-[11px] px-3 py-2 cursor-pointer inline-flex items-center gap-1.5">
                    📎 Téléverser le document IBAN (obligatoire)
                    <input type="file" className="hidden" onChange={(e) => setFichierIban(e.target.files?.[0] ?? null)} />
                  </label>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-ink-soft bg-off-white border border-line rounded-lg px-3 py-2 w-fit">
                    <span>{fichierIban.name} <span className="text-amber">(démo — non envoyé réellement)</span></span>
                    <button type="button" onClick={() => setFichierIban(null)} className="text-red font-bold">✕</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {erreur && <p className="text-[12px] text-red bg-red-bg rounded-lg px-3 py-2 mt-4">{erreur}</p>}

          <button type="submit" className="w-full rounded-lg bg-green-700 text-white font-semibold text-[13px] py-3 mt-5">Continuer vers mon espace</button>
        </form>
      </div>
    </div>
  );
}
