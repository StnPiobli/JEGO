'use client';

import Link from 'next/link';
import Navigation from '../components/Navigation';

/**
 * Tableau de bord agence. Interface seule -- voir TODO. Chiffres et
 * horizon en donnees demo, a remplacer par de vrais appels une fois
 * branche (memes routes que trajets/page.tsx : mon-horizon, /trajets, /bus).
 */

const statsDemo = {
  trajetsProgrammes: 12,
  busDansLaFlotte: 3,
  horizonJours: 9,
  seuilAlerte: 14,
};

export default function Accueil() {
  return (
    <div className="min-h-screen bg-[#EEF1EE] p-6 md:p-10">
      <Navigation />

      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-extrabold text-[#14201A] mb-1">Tableau de bord</h1>
        <p className="text-sm text-[#64746C] mb-8">Vue d&apos;ensemble de ton activite JEGO.</p>

        {/* Alerte horizon si besoin */}
        {statsDemo.horizonJours < statsDemo.seuilAlerte && (
          <div className="rounded-2xl p-4 mb-6 bg-[#E6B84C]/10 border border-[#E6B84C]/30 flex items-center gap-3">
            <span className="text-base">⚠</span>
            <p className="text-sm text-[#14201A] flex-1">
              <strong>Programme incomplet</strong> — {statsDemo.horizonJours} jours d&apos;avance seulement
              (minimum {statsDemo.seuilAlerte}).
            </p>
            <Link href="/trajets" className="text-sm font-bold text-[#0B9E63] hover:underline whitespace-nowrap">
              Voir →
            </Link>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-[#E7ECE8] p-6">
            <p className="text-xs text-[#9AA69F] mb-1">Trajets programmes</p>
            <p className="text-3xl font-extrabold text-[#14201A]">{statsDemo.trajetsProgrammes}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E7ECE8] p-6">
            <p className="text-xs text-[#9AA69F] mb-1">Bus dans la flotte</p>
            <p className="text-3xl font-extrabold text-[#14201A]">{statsDemo.busDansLaFlotte}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/trajets"
            className="bg-white rounded-2xl border border-[#E7ECE8] p-6 hover:border-[#0B9E63]/40 transition-colors group"
          >
            <p className="text-sm font-extrabold text-[#14201A] mb-1 group-hover:text-[#0B9E63] transition-colors">
              Programmation des trajets →
            </p>
            <p className="text-xs text-[#64746C]">Gerer tes trajets et ton horizon de programmation.</p>
          </Link>
          <Link
            href="/flotte"
            className="bg-white rounded-2xl border border-[#E7ECE8] p-6 hover:border-[#0B9E63]/40 transition-colors group"
          >
            <p className="text-sm font-extrabold text-[#14201A] mb-1 group-hover:text-[#0B9E63] transition-colors">
              Ma flotte →
            </p>
            <p className="text-xs text-[#64746C]">Gerer tes bus et leur configuration.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}