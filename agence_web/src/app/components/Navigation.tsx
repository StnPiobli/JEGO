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
];

export default function Navigation() {
  const chemin = usePathname();

  return (
    <div className="max-w-6xl mx-auto mb-6">
      <div className="flex items-center justify-between bg-white rounded-2xl border border-[#E7ECE8] px-5 py-3">
        <div className="flex items-center gap-8">
          <Link href="/accueil" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0B9E63] to-[#10C070] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="3" y="6" width="18" height="12" rx="3" />
                <circle cx="7.5" cy="18" r="1.5" fill="white" />
                <circle cx="16.5" cy="18" r="1.5" fill="white" />
              </svg>
            </div>
            <span className="font-extrabold text-[#14201A] text-sm">JEGO</span>
          </Link>

          <div className="flex items-center gap-1">
            {liens.map((l) => {
              const actif = chemin === l.href || chemin?.startsWith(l.href + '/');
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    actif ? 'bg-[#0B9E63]/10 text-[#0B9E63]' : 'text-[#64746C] hover:bg-[#F1F4F1]'
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
          className="text-xs font-semibold text-[#9AA69F] hover:text-[#D9534F] transition-colors"
        >
          Se deconnecter
        </Link>
      </div>
    </div>
  );
}