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

  function changerMois(delta: number) {
    setMoisAffiche((courant) => new Date(courant.getFullYear(), courant.getMonth() + delta, 1));
  }

  return (
    <div ref={conteneurRef} className={`relative bg-white rounded-2xl border border-[#E7ECE8] px-4 py-3 ${className}`}>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onChange(addDaysToInput(date, -1))}
          className="w-9 h-9 rounded-xl bg-[#F4F6F4] hover:bg-[#EAEFEB] flex items-center justify-center text-[#14201A]"
          aria-label={t.previousDay}
        >
          ←
        </button>

        <div className="relative min-w-[260px] max-w-[360px] flex-1">
          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            aria-expanded={ouvert}
            aria-haspopup="dialog"
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E7ECE8] hover:border-[#0B9E63]/35"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0B9E63" strokeWidth="2" className="shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#8B9890]">{t.selectedDate}</p>
              <p className="text-[12px] font-bold text-[#14201A] leading-tight first-letter:uppercase">{selectedDateLabel}</p>
            </div>
          </button>

          {ouvert && (
            <div
              role="dialog"
              aria-label={t.calendar}
              className="absolute z-[80] left-1/2 -translate-x-1/2 top-[calc(100%+10px)] w-[310px] rounded-2xl bg-white border border-[#E7ECE8] shadow-[0_24px_60px_rgba(20,32,26,0.18)] p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => changerMois(-1)} className="w-8 h-8 rounded-lg bg-[#F4F6F4] hover:bg-[#EAEFEB]" aria-label={t.previousMonth}>←</button>
                <p className="text-[12px] font-extrabold text-[#14201A] capitalize">
                  {moisAffiche.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                </p>
                <button type="button" onClick={() => changerMois(1)} className="w-8 h-8 rounded-lg bg-[#F4F6F4] hover:bg-[#EAEFEB]" aria-label={t.nextMonth}>→</button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {JOURS[langue].map((jour) => <span key={jour} className="h-7 flex items-center justify-center text-[9px] font-bold text-[#8B9890]">{jour}</span>)}
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
                      className={`h-8 rounded-lg text-[10px] font-semibold border ${selectionne ? 'bg-[#0B9E63] text-white border-[#0B9E63]' : estAujourdhui ? 'bg-[#0B9E63]/8 text-[#0B9E63] border-[#0B9E63]/25' : 'border-transparent hover:bg-[#F1F4F1] text-[#14201A]'} ${horsMois && !selectionne ? 'opacity-35' : ''}`}
                    >
                      {jour.getDate()}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => choisirJour(aujourdhui)}
                className="mt-3 w-full rounded-xl bg-[#0B9E63]/10 hover:bg-[#0B9E63]/16 text-[#0B9E63] text-[10px] font-bold py-2"
              >
                {t.backToday}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onChange(addDaysToInput(date, 1))}
          className="w-9 h-9 rounded-xl bg-[#F4F6F4] hover:bg-[#EAEFEB] flex items-center justify-center text-[#14201A]"
          aria-label={t.nextDay}
        >
          →
        </button>
      </div>
    </div>
  );
}
