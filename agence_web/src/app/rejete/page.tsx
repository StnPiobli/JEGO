'use client';

// Motif réel : saisi par l'admin au moment du refus, stocké sur
// l'agence et renvoyé à la connexion.
import { useRouter } from 'next/navigation';
import { getAgenceLocale, clearSession } from '../lib/api';

export default function RejetePage() {
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
          <div className="w-14 h-14 rounded-full bg-red-bg text-red flex items-center justify-center text-2xl mb-4">✕</div>
          <h1 className="text-[19px] font-display font-bold text-ink mb-2">Dossier rejeté</h1>
          <p className="text-[13px] text-ink-soft mb-1">
            Bonjour {agence?.nom ?? ''}, ton dossier d&apos;inscription n&apos;a malheureusement pas été validé par JEGO.
          </p>
          {agence?.motif_desactivation && (
            <div className="bg-off-white rounded-lg px-3 py-2.5 mt-3 mb-4">
              <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wide mb-1">Motif</p>
              <p className="text-[13px] text-ink">{agence.motif_desactivation}</p>
            </div>
          )}
          <p className="text-[12px] text-ink-soft">Pour toute question, contacte le support JEGO.</p>
        </div>
      </div>
    </div>
  );
}
