'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Liste de la flotte. Interface seule -- voir TODO. Contrat backend
 * confirme (listerBus) :
 *   GET /api/bus -> { bus: [{ id, nom, type_bus, disposition,
 *     nombre_rangees, toilettes, climatisation, prises_usb, wifi,
 *     sieges_inclinables, supplement_premium, statut, nombre_sieges }] }
 */

type Bus = {
  id: string;
  nom: string;
  type_bus: 'vip' | 'standard' | 'mixte';
  disposition: string;
  nombre_rangees: number;
  toilettes: boolean;
  climatisation: boolean;
  prises_usb: boolean;
  wifi: boolean;
  sieges_inclinables: boolean;
  nombre_sieges: number;
};

const busDemo: Bus[] = [
  {
    id: 'b1', nom: 'Confort Express 01', type_bus: 'vip', disposition: '2+2',
    nombre_rangees: 8, toilettes: true, climatisation: true, prises_usb: true,
    wifi: true, sieges_inclinables: true, nombre_sieges: 32,
  },
  {
    id: 'b2', nom: 'Confort 02', type_bus: 'standard', disposition: '2+2',
    nombre_rangees: 8, toilettes: false, climatisation: true, prises_usb: false,
    wifi: false, sieges_inclinables: false, nombre_sieges: 32,
  },
  {
    id: 'b3', nom: 'Express 03', type_bus: 'mixte', disposition: '2+3',
    nombre_rangees: 6, toilettes: true, climatisation: true, prises_usb: true,
    wifi: false, sieges_inclinables: false, nombre_sieges: 30,
  },
];

const libellesType: Record<Bus['type_bus'], string> = {
  vip: 'VIP', standard: 'Standard', mixte: 'Mixte',
};

const stylesType: Record<Bus['type_bus'], string> = {
  vip: 'bg-[#E6B84C]/15 text-[#8A6A1E]',
  standard: 'bg-[#F1F4F1] text-[#64746C]',
  mixte: 'bg-[#0B9E63]/10 text-[#0B9E63]',
};

const equipements: { cle: keyof Bus; icone: string; label: string }[] = [
  { cle: 'climatisation', icone: '❄️', label: 'Clim' },
  { cle: 'toilettes', icone: '🚽', label: 'Toilettes' },
  { cle: 'prises_usb', icone: '🔌', label: 'USB' },
  { cle: 'wifi', icone: '📶', label: 'WiFi' },
  { cle: 'sieges_inclinables', icone: '💺', label: 'Inclinables' },
];

export default function Flotte() {
  const [bus] = useState<Bus[]>(busDemo);

  // TODO (branchement backend) : remplacer busDemo par un vrai
  // useEffect appelant GET http://localhost:5000/api/bus (avec token).

  return (
    <div className="min-h-screen bg-[#EEF1EE] p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#14201A]">Ma flotte</h1>
            <p className="text-sm text-[#64746C] mt-1">
              Gere tes bus, leur configuration et leurs equipements.
            </p>
          </div>
          <Link
            href="/flotte/nouveau"
            className="rounded-xl bg-[#0B9E63] hover:bg-[#0A8D58] text-white font-bold text-sm px-5 py-3 transition-colors shadow-lg shadow-[#0B9E63]/25 whitespace-nowrap"
          >
            + Nouveau bus
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {bus.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-[#E7ECE8] p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-extrabold text-[#14201A]">{b.nom}</p>
                  <p className="text-xs text-[#64746C] mt-0.5">
                    {b.disposition} · {b.nombre_rangees} rangees · {b.nombre_sieges} places
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${stylesType[b.type_bus]}`}>
                  {libellesType[b.type_bus]}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {equipements
                  .filter((eq) => b[eq.cle])
                  .map((eq) => (
                    <span
                      key={eq.cle}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F1F4F1] text-xs text-[#64746C]"
                    >
                      <span>{eq.icone}</span>
                      {eq.label}
                    </span>
                  ))}
              </div>

              <Link
                href="/trajets/plan"
                className="text-xs font-bold text-[#0B9E63] hover:underline"
              >
                Voir le plan des sieges →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}