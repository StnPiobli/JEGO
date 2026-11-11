"use client";
// Calendrier custom (remplace le sélecteur natif du navigateur). Rendu = le
// PANNEAU du popover : l'appelant gère le déclencheur, l'ouverture, et place
// ce panneau dans un conteneur `relative`. Modes : jour / mois / année.

import { useState } from "react";

type Mode = "jour" | "mois" | "annee";
type Props = {
  mode?: Mode;
  value: Date | null;
  onChange: (d: Date) => void;
  onEffacer?: () => void;
  onFermer: () => void;
  align?: "left" | "center" | "right";
};

const JOURS = ["lu", "ma", "me", "je", "ve", "sa", "di"];
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function memeJour(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function Calendrier({ mode = "jour", value, onChange, onEffacer, onFermer, align = "center" }: Props) {
  const base = value ?? new Date();
  const [curseur, setCurseur] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const [niveau, setNiveau] = useState<"jours" | "mois" | "annees">(
    mode === "annee" ? "annees" : mode === "mois" ? "mois" : "jours"
  );

  const auj = new Date();

  const grille = (() => {
    const premier = new Date(curseur.getFullYear(), curseur.getMonth(), 1);
    const decalage = (premier.getDay() + 6) % 7;
    const debut = new Date(premier);
    debut.setDate(premier.getDate() - decalage);
    return Array.from({ length: 42 }, (_, i) => {
      const j = new Date(debut);
      j.setDate(debut.getDate() + i);
      return j;
    });
  })();

  const anneeDebut = Math.floor(curseur.getFullYear() / 12) * 12;
  const positionCls = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onFermer} />
      <div
        role="dialog"
        className={`absolute z-50 top-[calc(100%+8px)] ${positionCls} w-[288px] rounded-2xl bg-paper border border-line shadow-[0_20px_50px_rgba(20,32,26,0.18)] p-3.5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => (niveau === "jours" ? setCurseur(new Date(curseur.getFullYear(), curseur.getMonth() - 1, 1)) : niveau === "mois" ? setCurseur(new Date(curseur.getFullYear() - 1, curseur.getMonth(), 1)) : setCurseur(new Date(curseur.getFullYear() - 12, curseur.getMonth(), 1)))}
            className="w-8 h-8 rounded-xl text-ink-soft hover:bg-off-white flex items-center justify-center"
          >‹</button>

          <button
            type="button"
            onClick={() => setNiveau(niveau === "jours" ? "mois" : "annees")}
            className="text-[13px] font-bold text-ink hover:text-green-700 capitalize px-2 py-1 rounded-lg hover:bg-off-white"
          >
            {niveau === "jours"
              ? curseur.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
              : niveau === "mois"
              ? curseur.getFullYear()
              : `${anneeDebut} – ${anneeDebut + 11}`}
          </button>

          <button
            type="button"
            onClick={() => (niveau === "jours" ? setCurseur(new Date(curseur.getFullYear(), curseur.getMonth() + 1, 1)) : niveau === "mois" ? setCurseur(new Date(curseur.getFullYear() + 1, curseur.getMonth(), 1)) : setCurseur(new Date(curseur.getFullYear() + 12, curseur.getMonth(), 1)))}
            className="w-8 h-8 rounded-xl text-ink-soft hover:bg-off-white flex items-center justify-center"
          >›</button>
        </div>

        {niveau === "jours" && (
          <>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {JOURS.map((j) => <span key={j} className="h-7 flex items-center justify-center text-[10px] font-bold uppercase tracking-wide text-ink-soft">{j}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grille.map((j) => {
                const selectionne = value != null && memeJour(j, value);
                const estAuj = memeJour(j, auj);
                const horsMois = j.getMonth() !== curseur.getMonth();
                return (
                  <button
                    key={j.toISOString()}
                    type="button"
                    onClick={() => onChange(new Date(j.getFullYear(), j.getMonth(), j.getDate()))}
                    className={`h-9 rounded-full text-[12px] font-semibold transition
                      ${selectionne ? "bg-green-700 text-white shadow-sm"
                        : estAuj ? "text-green-700 ring-1 ring-inset ring-green-700/40 hover:bg-green-700/10"
                        : "text-ink hover:bg-off-white"}
                      ${horsMois && !selectionne ? "opacity-35" : ""}`}
                  >
                    {j.getDate()}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {niveau === "mois" && (
          <div className="grid grid-cols-3 gap-2">
            {MOIS_COURTS.map((m, i) => {
              const selectionne = value != null && value.getFullYear() === curseur.getFullYear() && value.getMonth() === i;
              const estAuj = auj.getFullYear() === curseur.getFullYear() && auj.getMonth() === i;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    if (mode === "mois") onChange(new Date(curseur.getFullYear(), i, 1));
                    else { setCurseur(new Date(curseur.getFullYear(), i, 1)); setNiveau("jours"); }
                  }}
                  className={`h-11 rounded-xl text-[12px] font-semibold capitalize transition
                    ${selectionne ? "bg-green-700 text-white" : estAuj ? "text-green-700 ring-1 ring-inset ring-green-700/40 hover:bg-green-700/10" : "text-ink hover:bg-off-white"}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        )}

        {niveau === "annees" && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, i) => anneeDebut + i).map((y) => {
              const selectionne = value != null && value.getFullYear() === y;
              const estAuj = auj.getFullYear() === y;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    if (mode === "annee") onChange(new Date(y, 0, 1));
                    else { setCurseur(new Date(y, curseur.getMonth(), 1)); setNiveau("mois"); }
                  }}
                  className={`h-11 rounded-xl text-[12px] font-semibold transition
                    ${selectionne ? "bg-green-700 text-white" : estAuj ? "text-green-700 ring-1 ring-inset ring-green-700/40 hover:bg-green-700/10" : "text-ink hover:bg-off-white"}`}
                >
                  {y}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
          <button
            type="button"
            onClick={() => onChange(mode === "annee" ? new Date(auj.getFullYear(), 0, 1) : mode === "mois" ? new Date(auj.getFullYear(), auj.getMonth(), 1) : new Date(auj.getFullYear(), auj.getMonth(), auj.getDate()))}
            className="flex-1 rounded-xl bg-green-700/10 hover:bg-green-700/16 text-green-700 text-[12px] font-bold py-2"
          >
            Aujourd&apos;hui
          </button>
          {onEffacer && (
            <button type="button" onClick={onEffacer} className="rounded-xl px-3.5 py-2 text-[12px] font-semibold text-ink-soft hover:bg-off-white">
              Effacer
            </button>
          )}
        </div>
      </div>
    </>
  );
}
