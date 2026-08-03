'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Barre de navigation partagee entre tous les ecrans authentifies.
 * Pas de vraie deconnexion branchee -- voir TODO. Reutilisee (importee
 * directement) dans chaque page plutot qu'un layout partage, pour
 * limiter le risque de casser le routage existant ce soir.
 */

const liens = [
  { href: '/accueil', label: 'Accueil' },
  { href: '/trajets', label: 'Trajets' },
  { href: '/flotte', label: 'Flotte' },
  { href: '/chauffeurs', label: 'Chauffeurs' },
  { href: '/reservations', label: 'Reservations' },
  { href: '/paiements', label: 'Paiements' },
  { href: '/incidents', label: 'Incidents / Litiges' },
  { href: '/discussion', label: 'Discussion' },
];

export default function Navigation() {
  const chemin = usePathname();

  return (
    <div className="max-w-6xl mx-auto mb-6">
      <div className="flex items-center justify-between bg-paper rounded-2xl border border-line px-5 py-3">
        <div className="flex items-center gap-8">
          <Link href="/accueil" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="3" y="6" width="18" height="12" rx="3" />
                <circle cx="7.5" cy="18" r="1.5" fill="white" />
                <circle cx="16.5" cy="18" r="1.5" fill="white" />
              </svg>
            </div>
            <span className="font-extrabold text-ink text-sm">JEGO</span>
          </Link>

          <div className="flex items-center gap-1 overflow-x-auto">
            {liens.map((l) => {
              const actif = chemin === l.href || chemin?.startsWith(l.href + '/');
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    actif ? 'bg-green-700/10 text-green-700' : 'text-ink-soft hover:bg-off-white'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* TODO (branchement backend) : vraie deconnexion (suppression token) */}
        <Link
          href="/"
          className="text-xs font-semibold text-ink-soft hover:text-red transition-colors"
        >
          Se deconnecter
        </Link>
      </div>
    </div>
  );
}