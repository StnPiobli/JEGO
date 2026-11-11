'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addDaysToInput, formatDateInput, todayInputDate } from '../lib/date';
import { useLangue } from '../lib/langue';

type Props = {
  date: string;
  onChange: (date: string) => void;
  className?: string;
};

const JOURS: Record<'fr' | 'en', string[]> = {
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

const MOIS: Record<'fr' | 'en', string[]> = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function dateDepuisInput(dateInput: string) {
  const [annee, mois, jour] = dateInput.split('-').map(Number);
  return new Date(annee, (mois || 1) - 1, jour || 1);
}

function memeJour(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DateNavigator({ date, onChange, className = '' }: Props) {
  const langue = useLangue();
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [vue, setVue] = useState<'jours' | 'mois' | 'annees'>('jours');
  const [moisAffiche, setMoisAffiche] = useState(() => {
    const d = dateDepuisInput(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const t = langue === 'en'
    ? {
        selectedDate: 'Selected date',
        calendar: 'Calendar',
        previousMonth: 'Previous month',
        nextMonth: 'Next month',
        backToday: 'Back to today',
        previousDay: 'Previous day',
        nextDay: 'Next day',
      }
    : {
        selectedDate: 'Date selectionnee',
        calendar: 'Calendrier',
        previousMonth: 'Mois precedent',
        nextMonth: 'Mois suivant',
        backToday: "Revenir a aujourd'hui",
        previousDay: 'Jour precedent',
        nextDay: 'Jour suivant',
      };

  useEffect(() => {
    const d = dateDepuisInput(date);
    setMoisAffiche(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [date]);

  useEffect(() => {
    function fermerEnDehors(e: MouseEvent) {
      if (!conteneurRef.current?.contains(e.target as Node)) setOuvert(false);
    }
    function fermerAvecEchap(e: KeyboardEvent) {
      if (e.key === 'Escape') setOuvert(false);
    }
    document.addEventListener('mousedown', fermerEnDehors);
    document.addEventListener('keydown', fermerAvecEchap);
    return () => {
      document.removeEventListener('mousedown', fermerEnDehors);
      document.removeEventListener('keydown', fermerAvecEchap);
    };
  }, []);

  const joursCalendrier = useMemo(() => {
    const premier = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), 1);
    const decalageLundi = (premier.getDay() + 6) % 7;
    const debut = new Date(premier);
    debut.setDate(premier.getDate() - decalageLundi);
    return Array.from({ length: 42 }, (_, index) => {
      const jour = new Date(debut);
      jour.setDate(debut.getDate() + index);
      return jour;
    });
  }, [moisAffiche]);

  const dateSelectionnee = dateDepuisInput(date);
  const aujourdhui = dateDepuisInput(todayInputDate());
  const locale = langue === 'en' ? 'en-GB' : 'fr-FR';
  const selectedDateLabel = dateSelectionnee.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  function choisirJour(jour: Date) {
    onChange(formatDateInput(jour));
    setOuvert(false);
  }

  return (
    <div ref={conteneurRef} className={`relative bg-paper rounded-xl border border-line px-3 py-1.5 ${className}`}>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onChange(addDaysToInput(date, -1))}
          className="w-8 h-8 rounded-lg bg-off-white hover:bg-grey-bg flex items-center justify-center text-ink"
          aria-label={t.previousDay}
        >
          ←
        </button>

        <div className="relative w-[300px] shrink-0">
          <button
            type="button"
            onClick={() => { setVue('jours'); setOuvert((v) => !v); }}
            aria-expanded={ouvert}
            aria-haspopup="dialog"
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-off-white border border-line hover:border-green-700/35"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--c-green-700))" strokeWidth="2" className="shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className="text-[12.5px] font-bold text-ink first-letter:uppercase truncate">{selectedDateLabel}</p>
          </button>

          {ouvert && (
            <div
              role="dialog"
              aria-label={t.calendar}
              className="absolute z-[80] left-1/2 -translate-x-1/2 top-[calc(100%+10px)] w-[310px] rounded-2xl bg-paper border border-line shadow-[0_24px_60px_rgba(20,32,26,0.18)] p-4"
            >
              {(() => { const anneeDebut = Math.floor(moisAffiche.getFullYear() / 12) * 12; return (
              <>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => vue === 'jours' ? setMoisAffiche(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() - 1, 1)) : vue === 'mois' ? setMoisAffiche(new Date(moisAffiche.getFullYear() - 1, moisAffiche.getMonth(), 1)) : setMoisAffiche(new Date(moisAffiche.getFullYear() - 12, moisAffiche.getMonth(), 1))}
                  className="w-8 h-8 rounded-lg bg-off-white hover:bg-grey-bg" aria-label={t.previousMonth}
                >←</button>
                {/* Titre cliquable : jours -> mois -> années (sélection rapide) */}
                <button
                  type="button"
                  onClick={() => setVue(vue === 'jours' ? 'mois' : 'annees')}
                  className="text-[12.5px] font-extrabold text-ink capitalize px-2 py-1 rounded-lg hover:bg-off-white hover:text-green-700"
                >
                  {vue === 'jours'
                    ? moisAffiche.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
                    : vue === 'mois'
                    ? moisAffiche.getFullYear()
                    : `${anneeDebut} – ${anneeDebut + 11}`}
                </button>
                <button
                  type="button"
                  onClick={() => vue === 'jours' ? setMoisAffiche(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 1)) : vue === 'mois' ? setMoisAffiche(new Date(moisAffiche.getFullYear() + 1, moisAffiche.getMonth(), 1)) : setMoisAffiche(new Date(moisAffiche.getFullYear() + 12, moisAffiche.getMonth(), 1))}
                  className="w-8 h-8 rounded-lg bg-off-white hover:bg-grey-bg" aria-label={t.nextMonth}
                >→</button>
              </div>

              {vue === 'jours' && (
                <>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {JOURS[langue].map((jour) => <span key={jour} className="h-7 flex items-center justify-center text-[10px] font-bold uppercase tracking-wide text-ink-soft">{jour}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {joursCalendrier.map((jour) => {
                      const selectionne = memeJour(jour, dateSelectionnee);
                      const estAujourdhui = memeJour(jour, aujourdhui);
                      const horsMois = jour.getMonth() !== moisAffiche.getMonth();
                      return (
                        <button
                          key={jour.toISOString()}
                          type="button"
                          onClick={() => choisirJour(jour)}
                          className={`h-9 rounded-full text-[12px] font-semibold transition ${selectionne ? 'bg-green-700 text-white shadow-sm' : estAujourdhui ? 'text-green-700 ring-1 ring-inset ring-green-700/40 hover:bg-green-700/10' : 'text-ink hover:bg-off-white'} ${horsMois && !selectionne ? 'opacity-35' : ''}`}
                        >
                          {jour.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {vue === 'mois' && (
                <div className="grid grid-cols-3 gap-2">
                  {MOIS[langue].map((m, i) => {
                    const selectionne = dateSelectionnee.getFullYear() === moisAffiche.getFullYear() && dateSelectionnee.getMonth() === i;
                    const estAuj = aujourdhui.getFullYear() === moisAffiche.getFullYear() && aujourdhui.getMonth() === i;
                    return (
                      <button key={m} type="button"
                        onClick={() => { setMoisAffiche(new Date(moisAffiche.getFullYear(), i, 1)); setVue('jours'); }}
                        className={`h-11 rounded-xl text-[12px] font-semibold capitalize transition ${selectionne ? 'bg-green-700 text-white' : estAuj ? 'text-green-700 ring-1 ring-inset ring-green-700/40 hover:bg-green-700/10' : 'text-ink hover:bg-off-white'}`}
                      >{m}</button>
                    );
                  })}
                </div>
              )}

              {vue === 'annees' && (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 12 }, (_, i) => anneeDebut + i).map((y) => {
                    const selectionne = dateSelectionnee.getFullYear() === y;
                    const estAuj = aujourdhui.getFullYear() === y;
                    return (
                      <button key={y} type="button"
                        onClick={() => { setMoisAffiche(new Date(y, moisAffiche.getMonth(), 1)); setVue('mois'); }}
                        className={`h-11 rounded-xl text-[12px] font-semibold transition ${selectionne ? 'bg-green-700 text-white' : estAuj ? 'text-green-700 ring-1 ring-inset ring-green-700/40 hover:bg-green-700/10' : 'text-ink hover:bg-off-white'}`}
                      >{y}</button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => choisirJour(aujourdhui)}
                className="mt-3 w-full rounded-xl bg-green-700/10 hover:bg-green-700/16 text-green-700 text-[10px] font-bold py-2"
              >
                {t.backToday}
              </button>
              </>
              ); })()}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onChange(addDaysToInput(date, 1))}
          className="w-8 h-8 rounded-lg bg-off-white hover:bg-grey-bg flex items-center justify-center text-ink"
          aria-label={t.nextDay}
        >
          →
        </button>
      </div>
    </div>
  );
}
