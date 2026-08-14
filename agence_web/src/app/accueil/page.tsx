'use client';

// BRANCHÉ SUR LE VRAI BACKEND — GET /api/agences/tableau-de-bord,
// GET /api/programmation/mon-horizon (déjà utilisé ailleurs dans l'app).
// "vs hier" est un vrai calcul (trajets aujourd'hui vs hier), pas
// affiché du tout s'il n'y avait aucun trajet hier (division par zéro
// évitée, pas de faux "+infini%").

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LayoutAgence from '../components/LayoutAgence';
import { enregistrerLangue, lireLangue, type Langue } from '../lib/langue';
import { apiFetch } from '../lib/api';

type TableauDeBord = {
  trajetsAujourdhui: number;
  trajetsHier: number;
  variationTrajets: number | null;
  busActifs: number;
  topDestinations: { nom: string; reservations: number }[];
};

type Horizon = { horizon_jours: number; seuil_alerte: number; conforme: boolean; message: string };

const textes = {
  fr: {
    dashboard: 'Dashboard',
    bienvenue: 'Bienvenue dans l’espace JEGO.',
    langue: 'Langue',
    details: 'Voir les details →',
    trajetsAuj: "Trajets aujourd'hui",
    busFlotte: 'Bus dans la flotte',
    enService: 'En service',
    vsHier: 'vs hier',
    trajets: 'Trajets →',
    trajetsDesc: 'Planifier et suivre les trajets de programmation.',
    flotte: 'Ma flotte →',
    flotteDesc: 'Gerer tes bus et leur configuration.',
    acceder: 'Acceder',
    top: 'Top destinations',
    topDesc: 'Les lignes les plus sollicitees sur les 30 derniers jours.',
    aucuneDestination: 'Aucune reservation sur les 30 derniers jours.',
  },
  en: {
    dashboard: 'Dashboard',
    bienvenue: 'Welcome to the JEGO space.',
    langue: 'Language',
    details: 'View details →',
    trajetsAuj: "Today's trips",
    busFlotte: 'Buses in fleet',
    enService: 'In service',
    vsHier: 'vs yesterday',
    trajets: 'Trips →',
    trajetsDesc: 'Plan and monitor scheduled trips.',
    flotte: 'My fleet →',
    flotteDesc: 'Manage your buses and their configuration.',
    acceder: 'Open',
    top: 'Top destinations',
    topDesc: 'The most requested lines over the last 30 days.',
    aucuneDestination: 'No reservations in the last 30 days.',
  },
} as const;

export default function Accueil() {
  const [langue, setLangue] = useState<Langue>('fr');
  const [donnees, setDonnees] = useState<TableauDeBord | null>(null);
  const [horizon, setHorizon] = useState<Horizon | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    setLangue(lireLangue());
    const sync = () => setLangue(lireLangue());
    window.addEventListener('jego-lang-change', sync as EventListener);
    return () => window.removeEventListener('jego-lang-change', sync as EventListener);
  }, []);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/agences/tableau-de-bord'),
      apiFetch('/api/programmation/mon-horizon'),
    ])
      .then(([tb, h]) => { setDonnees(tb); setHorizon(h); })
      .catch(() => { setDonnees(null); setHorizon(null); })
      .finally(() => setChargement(false));
  }, []);

  const t = textes[langue];

  function changerLangue(langueSuivante: Langue) {
    setLangue(langueSuivante);
    enregistrerLangue(langueSuivante);
  }

  return (
    <LayoutAgence>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[46px] leading-none font-black text-ink mb-3">{t.dashboard}</h1>
            <p className="text-[15px] text-ink-soft">{t.bienvenue}</p>
          </div>

          <div className="bg-paper rounded-2xl border border-line p-2 shadow-[0_10px_22px_rgba(20,32,26,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft px-2 pb-2">{t.langue}</p>
            <div className="flex gap-2">
              <button onClick={() => changerLangue('fr')} className={`rounded-xl px-4 py-2 text-[12px] font-bold border ${langue === 'fr' ? 'bg-ink text-white border-ink' : 'bg-off-white text-ink-soft border-line'}`}>FR</button>
              <button onClick={() => changerLangue('en')} className={`rounded-xl px-4 py-2 text-[12px] font-bold border ${langue === 'en' ? 'bg-green-700 text-white border-green-700' : 'bg-off-white text-ink-soft border-line'}`}>EN</button>
            </div>
          </div>
        </div>

        {horizon && !horizon.conforme && (
          <div className="rounded-[28px] px-6 py-5 mb-8 bg-[linear-gradient(90deg,rgb(var(--c-amber-bg))_0%,rgb(var(--c-amber-bg))_100%)] border border-amber/55 flex items-center gap-4 shadow-[0_12px_28px_rgba(177,145,69,0.08)] overflow-hidden relative">
            <div className="w-14 h-14 rounded-full bg-green-700 text-white flex items-center justify-center text-2xl shadow-[0_16px_28px_rgba(11,158,99,0.25)] shrink-0">☆</div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-ink">{horizon.message}</p>
            </div>
            <Link href="/trajets" className="text-green-700 text-[15px] font-bold whitespace-nowrap">{t.details}</Link>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="relative overflow-hidden rounded-[30px] bg-paper border border-line p-7 shadow-[0_18px_48px_rgba(20,32,26,0.06)]">
            <div className="flex items-center gap-5 mb-6">
              <div className="w-16 h-16 rounded-full bg-[linear-gradient(180deg,rgb(var(--c-green-700))_0%,#063D2D_100%)] text-white flex items-center justify-center shadow-[0_16px_24px_rgba(8,90,56,0.24)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <p className="text-[16px] text-ink-soft mb-1">{t.trajetsAuj}</p>
                <p className="text-[58px] leading-none font-black text-ink">{chargement ? '—' : (donnees?.trajetsAujourdhui ?? 0)}</p>
              </div>
            </div>
            {!chargement && donnees && donnees.variationTrajets !== null && (
              <div className={`flex items-end gap-2 font-bold text-[15px] mb-1 ${donnees.variationTrajets >= 0 ? 'text-green-700' : 'text-red'}`}>
                <span>{donnees.variationTrajets >= 0 ? '↑' : '↓'} {donnees.variationTrajets >= 0 ? '+' : ''}{donnees.variationTrajets}%</span>
                <span className="text-ink-soft font-medium">{t.vsHier}</span>
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-[30px] bg-paper border border-line p-7 shadow-[0_18px_48px_rgba(20,32,26,0.06)]">
            <div className="flex items-center gap-5 mb-6">
              <div className="w-16 h-16 rounded-full bg-[linear-gradient(180deg,rgb(var(--c-green-700))_0%,#063D2D_100%)] text-white flex items-center justify-center shadow-[0_16px_24px_rgba(8,90,56,0.24)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="6" width="18" height="12" rx="3" />
                  <circle cx="7.5" cy="18" r="1.5" />
                  <circle cx="16.5" cy="18" r="1.5" />
                </svg>
              </div>
              <div>
                <p className="text-[16px] text-ink-soft mb-1">{t.busFlotte}</p>
                <p className="text-[58px] leading-none font-black text-ink">{chargement ? '—' : (donnees?.busActifs ?? 0)}</p>
              </div>
            </div>
            <p className="text-ink-soft text-[15px] mb-5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mr-2" />{t.enService}</p>
            <div className="absolute right-6 bottom-6 opacity-10">
              <svg width="180" height="90" viewBox="0 0 180 90" fill="none" stroke="rgb(var(--c-ink))" strokeWidth="1.5">
                <rect x="32" y="22" width="90" height="35" rx="8" />
                <circle cx="53" cy="60" r="7" fill="rgb(var(--c-ink))" stroke="none" />
                <circle cx="104" cy="60" r="7" fill="rgb(var(--c-ink))" stroke="none" />
                <path d="M121 34h18l9 14v9h-27" />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 mb-6">
          <Link href="/trajets" className="group relative overflow-hidden rounded-[30px] bg-paper border border-line p-8 shadow-[0_18px_48px_rgba(20,32,26,0.06)] hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-15 h-15 rounded-full bg-ok-bg text-green-700 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 20 3 17V7l6 3m0 10 6-3m-6 3V10m6 7 6 3V10l-6-3m0 10V7m0 0L9 4" />
                </svg>
              </div>
              <p className="text-[19px] font-black text-ink group-hover:text-green-700 transition-colors">{t.trajets}</p>
            </div>
            <p className="text-[15px] text-ink-soft max-w-[320px]">{t.trajetsDesc}</p>
            <button className="mt-7 px-7 py-3 rounded-2xl bg-[linear-gradient(180deg,#0D664B_0%,#073F30_100%)] text-white font-bold text-[15px] shadow-[0_18px_30px_rgba(10,81,51,0.22)]">{t.acceder}</button>
            <div className="absolute right-0 bottom-0 w-56 h-36 opacity-[0.09] pointer-events-none" style={{background:'radial-gradient(circle at 20% 20%, rgba(20,32,26,.9) 1px, transparent 1px)', backgroundSize:'12px 12px'}} />
          </Link>

          <Link href="/flotte" className="group relative overflow-hidden rounded-[30px] bg-paper border border-line p-8 shadow-[0_18px_48px_rgba(20,32,26,0.06)] hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-15 h-15 rounded-full bg-ok-bg text-green-700 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="6" width="18" height="12" rx="3" />
                  <circle cx="7.5" cy="18" r="1.5" />
                  <circle cx="16.5" cy="18" r="1.5" />
                </svg>
              </div>
              <p className="text-[19px] font-black text-ink group-hover:text-green-700 transition-colors">{t.flotte}</p>
            </div>
            <p className="text-[15px] text-ink-soft max-w-[320px]">{t.flotteDesc}</p>
            <button className="mt-7 px-7 py-3 rounded-2xl bg-[linear-gradient(180deg,#0D664B_0%,#073F30_100%)] text-white font-bold text-[15px] shadow-[0_18px_30px_rgba(10,81,51,0.22)]">{t.acceder}</button>
            <div className="absolute right-5 bottom-5 opacity-[0.12]">
              <svg width="155" height="92" viewBox="0 0 155 92" fill="none" stroke="rgb(var(--c-ink))" strokeWidth="1.5">
                <ellipse cx="78" cy="74" rx="62" ry="12" fill="rgb(var(--c-ink))" opacity="0.08" stroke="none" />
                <rect x="42" y="26" width="58" height="28" rx="8" />
                <path d="M100 32h18l8 11v11h-26" />
                <circle cx="54" cy="58" r="6" fill="rgb(var(--c-ink))" stroke="none" />
                <circle cx="104" cy="58" r="6" fill="rgb(var(--c-ink))" stroke="none" />
              </svg>
            </div>
          </Link>
        </div>

        <div className="rounded-[30px] bg-paper border border-line p-8 shadow-[0_18px_48px_rgba(20,32,26,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-[34px] leading-none font-black text-ink mb-2">{t.top}</h2>
              <p className="text-[14px] text-ink-soft">{t.topDesc}</p>
            </div>
          </div>

          {chargement ? (
            <p className="text-[14px] text-ink-soft">…</p>
          ) : !donnees || donnees.topDestinations.length === 0 ? (
            <p className="text-[14px] text-ink-soft">{t.aucuneDestination}</p>
          ) : (
            <div className="space-y-4">
              {donnees.topDestinations.map((destination, index) => (
                <div key={destination.nom} className="flex items-center justify-between gap-3 pb-4 border-b border-line last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-off-white flex items-center justify-center text-green-700 font-black">{index + 1}</div>
                    <span className="text-[16px] font-semibold text-ink">{destination.nom}</span>
                  </div>
                  <span className="text-[16px] font-black text-ink">{destination.reservations}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </LayoutAgence>
  );
}
