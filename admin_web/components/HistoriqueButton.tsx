"use client";
// Bouton "Historique" réutilisable — le contenu (entrees) est fourni par
// chaque page pour rester pertinent (pas le même historique générique partout).
// PRÊT À BRANCHER : passer les entrées chargées depuis le backend. Tant
// qu'aucune route de journal n'existe, les pages passent un tableau vide.

import { useState } from "react";
import DateNav from "./DateNav";

export type EntreeHistorique = { heure: string; action: string; auteur: string };

export default function HistoriqueButton({
  label = "Historique",
  entrees = [],
}: {
  label?: string;
  entrees?: EntreeHistorique[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [date, setDate] = useState(new Date());

  return (
    <div className="relative">
      <button
        onClick={() => setOuvert((v) => !v)}
        className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line text-ink-soft hover:border-green-500 hover:text-green-700"
      >
        🕒 {label}
      </button>
      {ouvert && (
        <div className="absolute right-0 top-10 z-40 w-[380px] bg-paper border border-line rounded-2xl shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-[13.5px] font-semibold">{label}</span>
            <button onClick={() => setOuvert(false)} className="text-ink-soft text-xs">✕</button>
          </div>
          <DateNav date={date} onChange={setDate} />
          <div className="mt-3 space-y-2 max-h-[240px] overflow-y-auto">
            {entrees.map((e, i) => (
              <div key={i} className="text-[12.5px] border-t border-dashed border-line pt-2 first:border-t-0 first:pt-0">
                <span className="font-mono text-[11px] text-ink-soft mr-2">{e.heure}</span>
                {e.action} <span className="text-ink-soft">— {e.auteur}</span>
              </div>
            ))}
            {entrees.length === 0 && (
              <div className="text-[12.5px] text-ink-soft py-2">Aucune entrée pour cette date.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
