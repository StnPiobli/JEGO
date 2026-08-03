'use client';

// ⚠️ DEMO — aucune route backend pour "demande de pièces" ou "message à
// JEGO" pendant l'attente de validation. Le statut réel (en_attente) vient
// bien de la vraie connexion, mais tout le contenu de cette page est démo.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAgenceLocale, clearSession } from '../lib/api';

export default function EnAttentePage() {
  const router = useRouter();
  const agence = getAgenceLocale();
  // Démo : bascule entre "en attente simple" et "pièces justificatives demandées"
  const [piecesDemandees, setPiecesDemandees] = useState(true);
  const [message, setMessage] = useState('');
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [envoye, setEnvoye] = useState(false);

  function envoyer() {
    setEnvoye(true);
    setMessage('');
    setFichiers([]);
    setTimeout(() => setEnvoye(false), 3000);
  }

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
          {!piecesDemandees ? (
            <>
              <div className="w-14 h-14 rounded-full bg-amber-bg text-amber flex items-center justify-center text-2xl mb-4">⏳</div>
              <h1 className="text-[19px] font-display font-bold text-ink mb-2">En attente de validation</h1>
              <p className="text-[13px] text-ink-soft mb-1">
                Bonjour {agence?.nom ?? ''}, ton dossier a bien été reçu et est en cours d&apos;examen par l&apos;équipe JEGO.
              </p>
              <p className="text-[13px] text-ink-soft">Tu recevras un email dès qu&apos;une décision sera prise.</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-red-bg text-red flex items-center justify-center text-2xl mb-4">📎</div>
              <h1 className="text-[19px] font-display font-bold text-ink mb-2">Pièces justificatives demandées</h1>
              <p className="text-[13px] text-ink-soft mb-5">
                JEGO a besoin de documents complémentaires pour valider ton dossier. Envoie-les ci-dessous, avec un message si besoin.
              </p>

              {envoye && <div className="bg-ok-bg text-green-700 text-[12px] font-semibold rounded-lg px-3 py-2 mb-4">Envoyé à JEGO (démo) — en attente de nouvelle réponse.</div>}

              <label className="block text-[10.5px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">Message (optionnel)</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full rounded-lg bg-off-white border border-line px-4 py-2.5 text-[13px] mb-3" />

              <label className="rounded-lg bg-off-white border border-line text-ink font-bold text-[11px] px-3 py-2 cursor-pointer inline-flex items-center gap-1.5 mb-2">
                📎 Joindre des documents
                <input type="file" multiple className="hidden" onChange={(e) => setFichiers(Array.from(e.target.files ?? []))} />
              </label>
              {fichiers.length > 0 && (
                <ul className="mb-4 text-[11px] text-ink-soft space-y-1">
                  {fichiers.map((f, i) => (
                    <li key={i} className="flex items-center justify-between bg-off-white rounded-lg px-2.5 py-1.5">
                      <span>{f.name} <span className="text-amber">(démo)</span></span>
                      <button type="button" onClick={() => setFichiers((prev) => prev.filter((_, idx) => idx !== i))} className="text-red font-bold ml-2">✕</button>
                    </li>
                  ))}
                </ul>
              )}

              <button onClick={envoyer} className="w-full rounded-lg bg-green-700 text-white font-semibold text-[13px] py-3 mt-2">Envoyer à JEGO</button>
            </>
          )}

          <div className="mt-6 pt-4 border-t border-dashed border-line">
            <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wide mb-2">Démo — basculer la vue</p>
            <div className="flex gap-2">
              <button onClick={() => setPiecesDemandees(false)} className={`flex-1 text-[11px] font-semibold py-2 rounded-lg ${!piecesDemandees ? 'bg-ink text-white' : 'bg-off-white border border-line text-ink-soft'}`}>En attente simple</button>
              <button onClick={() => setPiecesDemandees(true)} className={`flex-1 text-[11px] font-semibold py-2 rounded-lg ${piecesDemandees ? 'bg-ink text-white' : 'bg-off-white border border-line text-ink-soft'}`}>Pièces demandées</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
