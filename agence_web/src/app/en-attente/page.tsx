'use client';

import { useRouter } from 'next/navigation';
import { getAgenceLocale, clearSession } from '../lib/api';

// Statut réel « en_attente » : le dossier a été reçu et attend la
// décision de l'équipe JEGO. Aucune action n'est requise de l'agence
// tant que la validation n'est pas prononcée.
export default function EnAttentePage() {
  const router = useRouter();
  const agence = getAgenceLocale();

  function seDeconnecter() {
    clearSession();
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-off-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-green-700 text-white flex items-center justify-center font-display font-bold -rotate-3">J</div>
            <span className="font-display font-bold text-ink">JEGO</span>
          </div>
          <button onClick={seDeconnecter} className="text-[11px] font-semibold text-ink-soft underline">Se déconnecter</button>
        </div>

        <div className="bg-paper rounded-2xl border border-line shadow-card p-7">
          <div className="w-14 h-14 rounded-full bg-amber-bg text-amber flex items-center justify-center text-2xl mb-4">⏳</div>
          <h1 className="text-[19px] font-display font-bold text-ink mb-2">En attente de validation</h1>
          <p className="text-[13px] text-ink-soft mb-1">
            Bonjour {agence?.nom ?? ''}, ton dossier a bien été reçu et est en cours d&apos;examen par l&apos;équipe JEGO.
          </p>
          <p className="text-[13px] text-ink-soft">Tu recevras un email dès qu&apos;une décision sera prise.</p>
        </div>
      </div>
    </div>
  );
}
