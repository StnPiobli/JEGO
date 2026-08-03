"use client";
// Navigateur de date réutilisable : flèches ◀▶ + clic sur la date ouvre le
// sélecteur natif du navigateur (pas de swipe tactile, admin_web est un site desktop).

import { useRef } from "react";

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function toInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function DateNav({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function changerJour(delta: number) {
    const nouvelle = new Date(date);
    nouvelle.setDate(nouvelle.getDate() + delta);
    onChange(nouvelle);
  }

  function ouvrirCalendrier() {
    inputRef.current?.showPicker?.();
    inputRef.current?.focus();
  }

  const estAujourdhui = toInputValue(date) === toInputValue(new Date());

  return (
    <div className="flex items-center justify-center gap-2 bg-paper border border-line rounded-full px-2 py-1.5 relative w-fit mx-auto">
      <button onClick={() => changerJour(-1)} className="w-7 h-7 rounded-full hover:bg-green-500/10 text-ink-soft font-bold text-sm shrink-0">◀</button>
      <button onClick={ouvrirCalendrier} className="text-[12.5px] font-semibold px-2 capitalize cursor-pointer hover:text-green-700 text-center min-w-[180px]">
        {estAujourdhui ? "Aujourd'hui" : formatDate(date)}
      </button>
      <button onClick={() => changerJour(1)} className="w-7 h-7 rounded-full hover:bg-green-500/10 text-ink-soft font-bold text-sm shrink-0">▶</button>
      <input
        ref={inputRef}
        type="date"
        value={toInputValue(date)}
        onChange={(e) => e.target.value && onChange(new Date(e.target.value))}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
      />
      {!estAujourdhui && (
        <button onClick={() => onChange(new Date())} className="text-[11px] text-green-700 font-semibold ml-1">
          Revenir à aujourd&apos;hui
        </button>
      )}
    </div>
  );
}
