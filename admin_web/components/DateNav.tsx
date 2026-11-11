"use client";
// Navigateur de date réutilisable : flèches ◀▶ + clic sur la date ouvre un
// calendrier CUSTOM (plus le sélecteur natif du navigateur). Pas de bouton
// « Revenir à aujourd'hui » : le calendrier marque déjà le jour même, et
// l'espace réservé laissait un vide à droite de la date.

import { useState } from "react";
import Calendrier from "./Calendrier";

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function memeJour(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DateNav({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  const [ouvert, setOuvert] = useState(false);

  function changerJour(delta: number) {
    const n = new Date(date);
    n.setDate(n.getDate() + delta);
    onChange(n);
  }

  const estAujourdhui = memeJour(date, new Date());

  return (
    <div className="flex items-center justify-center gap-2 bg-paper border border-line rounded-full px-2 py-1.5 w-[300px] mx-auto">
      <button onClick={() => changerJour(-1)} className="w-7 h-7 rounded-full hover:bg-green-500/10 text-ink-soft font-bold text-sm shrink-0">◀</button>

      <div className="relative">
        <button
          onClick={() => setOuvert((o) => !o)}
          className="text-[12.5px] font-semibold px-2 capitalize cursor-pointer hover:text-green-700 text-center w-[230px] truncate"
        >
          {estAujourdhui ? "Aujourd'hui" : formatDate(date)}
        </button>
        {ouvert && (
          <Calendrier
            mode="jour"
            value={date}
            onChange={(d) => { onChange(d); setOuvert(false); }}
            onFermer={() => setOuvert(false)}
          />
        )}
      </div>

      <button onClick={() => changerJour(1)} className="w-7 h-7 rounded-full hover:bg-green-500/10 text-ink-soft font-bold text-sm shrink-0">▶</button>
    </div>
  );
}
