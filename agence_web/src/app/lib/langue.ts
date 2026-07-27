'use client';

import { useEffect, useState } from 'react';

export type Langue = 'fr' | 'en';

export const LANGUE_STORAGE_KEY = 'jego_agence_langue';

export const NAV_LABELS: Record<Langue, Record<string, string>> = {
  fr: {
    accueil: 'Accueil',
    trajets: 'Trajets',
    flotte: 'Flotte',
    chauffeurs: 'Chauffeurs',
    reservations: 'Reservations',
    paiements: 'Paiements',
    statistiques: 'Statistiques',
    incidents: 'Incidents',
    litiges: 'Litiges',
    discussion: 'Discussion',
    profil: 'Profil agence',
    collapse: 'Replier',
    expand: 'Deplier',
    logout: 'Se deconnecter',
    notifications: 'Notifications',
  },
  en: {
    accueil: 'Home',
    trajets: 'Trips',
    flotte: 'Fleet',
    chauffeurs: 'Drivers',
    reservations: 'Bookings',
    paiements: 'Payments',
    statistiques: 'Statistics',
    incidents: 'Incidents',
    litiges: 'Disputes',
    discussion: 'Messages',
    profil: 'Agency profile',
    collapse: 'Collapse',
    expand: 'Expand',
    logout: 'Sign out',
    notifications: 'Notifications',
  },
};

export function lireLangue(): Langue {
  if (typeof window === 'undefined') return 'fr';
  const stockee = window.localStorage.getItem(LANGUE_STORAGE_KEY);
  return stockee === 'en' ? 'en' : 'fr';
}

export function enregistrerLangue(langue: Langue) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUE_STORAGE_KEY, langue);
  window.dispatchEvent(new CustomEvent('jego-lang-change', { detail: langue }));
}

export function useLangue() {
  const [langue, setLangue] = useState<Langue>('fr');

  useEffect(() => {
    const sync = () => setLangue(lireLangue());
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === LANGUE_STORAGE_KEY) sync();
    };
    window.addEventListener('jego-lang-change', sync as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('jego-lang-change', sync as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return langue;
}
