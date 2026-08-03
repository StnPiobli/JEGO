"use client";
// Double sécurité par mot-clé : il faut taper le mot exact pour activer le bouton.
// Remplace ConfirmModal pour toutes les actions vraiment sensibles (désactivation
// d'agence, changements de commissions, paramètres système...).

import { useState } from "react";

export default function TypeToConfirm({
  titre,
  message,
  mot,
  onConfirm,
  trigger,
  danger = false,
}: {
  titre: string;
  message: string;
  mot: string;
  onConfirm: () => void;
  trigger: (open: () => void) => React.ReactNode;
  danger?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");

  function fermer() {
    setOuvert(false);
    setSaisie("");
  }

  return (
    <>
      {trigger(() => setOuvert(true))}
      {ouvert && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-paper rounded-2xl shadow-card p-6 w-[400px]">
            <h3 className="font-display text-[15px] font-semibold mb-2">{titre}</h3>
            <p className="text-[13px] text-ink-soft mb-4">{message}</p>
            <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-1.5">
              Tape « {mot} » pour confirmer
            </label>
            <input
              autoFocus
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-line bg-transparent text-sm mb-5 font-mono"
              placeholder={mot}
            />
            <div className="flex justify-end gap-2">
              <button onClick={fermer} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-line text-ink-soft">
                Annuler
              </button>
              <button
                disabled={saisie.trim().toLowerCase() !== mot.toLowerCase()}
                onClick={() => { onConfirm(); fermer(); }}
                className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-35 disabled:cursor-not-allowed ${danger ? "bg-red" : "bg-green-700"}`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
