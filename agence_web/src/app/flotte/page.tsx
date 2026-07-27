'use client';

import { useState } from 'react';
import Link from 'next/link';
import LayoutAgence from '../components/LayoutAgence';

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

const initialBus: Bus[] = [
  { id: 'b1', nom: 'Confort Express 01', type_bus: 'vip', disposition: '2+2', nombre_rangees: 8, toilettes: true, climatisation: true, prises_usb: true, wifi: true, sieges_inclinables: true, nombre_sieges: 32 },
  { id: 'b2', nom: 'Confort 02', type_bus: 'standard', disposition: '2+2', nombre_rangees: 8, toilettes: false, climatisation: true, prises_usb: false, wifi: false, sieges_inclinables: false, nombre_sieges: 32 },
  { id: 'b3', nom: 'Express 03', type_bus: 'mixte', disposition: '2+3', nombre_rangees: 6, toilettes: true, climatisation: true, prises_usb: true, wifi: false, sieges_inclinables: false, nombre_sieges: 30 },
];

const libellesType = { vip: 'VIP', standard: 'Standard', mixte: 'Mixte' };
const stylesType = { vip: 'bg-[#E6B84C]/15 text-[#8A6A1E]', standard: 'bg-[#F1F4F1] text-[#64746C]', mixte: 'bg-[#0B9E63]/10 text-[#0B9E63]' };
const equipements: { cle: keyof Bus; icone: string; label: string }[] = [
  { cle: 'climatisation', icone: '❄️', label: 'Climatisation' },
  { cle: 'toilettes', icone: '🚽', label: 'Toilettes' },
  { cle: 'prises_usb', icone: '🔌', label: 'USB' },
  { cle: 'wifi', icone: '📶', label: 'WiFi' },
  { cle: 'sieges_inclinables', icone: '💺', label: 'Inclinables' },
];

export default function Flotte() {
  const [bus, setBus] = useState<Bus[]>(initialBus);
  const [suppression, setSuppression] = useState<Bus | null>(null);

  return (
    <LayoutAgence>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[28px] font-extrabold text-[#14201A]">Ma flotte</h1>
            <p className="text-[13px] text-[#64746C] mt-1">Gere tes bus, leur configuration et leurs equipements.</p>
          </div>
          <Link href="/flotte/nouveau" className="rounded-xl bg-[#0B9E63] hover:bg-[#0A8D58] text-white font-bold text-[13px] px-5 py-3 transition-colors shadow-lg shadow-[#0B9E63]/25 whitespace-nowrap">+ Nouveau bus</Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {bus.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-[#E7ECE8] p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[14px] font-extrabold text-[#14201A]">{b.nom}</p>
                  <p className="text-[12px] text-[#64746C] mt-0.5">{b.disposition} · {b.nombre_rangees} rangees · {b.nombre_sieges} places</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${stylesType[b.type_bus]}`}>{libellesType[b.type_bus]}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {equipements.filter((eq) => b[eq.cle]).map((eq) => <span key={eq.cle} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F1F4F1] text-[11px] text-[#64746C]"><span>{eq.icone}</span>{eq.label}</span>)}
              </div>

              <div className="flex gap-2">
                <Link href={`/flotte/nouveau?edit=${b.id}`} className="flex-1 text-center rounded-xl bg-[#14201A] text-white font-bold text-[13px] px-4 py-2.5">Modifier</Link>
                <button onClick={() => setSuppression(b)} className="flex-1 rounded-xl bg-[#D9534F]/10 text-[#D9534F] font-bold text-[13px] px-4 py-2.5">Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {suppression && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={() => setSuppression(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-6 max-w-md w-full">
            <p className="text-[18px] font-extrabold text-[#14201A] mb-2">Supprimer ce bus ?</p>
            <p className="text-[13px] text-[#64746C] mb-5">{suppression.nom} sera retire de la liste de la flotte dans cette facade.</p>
            <div className="flex gap-3">
              <button onClick={() => setSuppression(null)} className="flex-1 rounded-xl bg-[#F1F4F1] text-[#14201A] font-bold text-[13px] py-3">Annuler</button>
              <button onClick={() => { setBus((prev) => prev.filter((item) => item.id !== suppression.id)); setSuppression(null); }} className="flex-1 rounded-xl bg-[#D9534F] text-white font-bold text-[13px] py-3">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </LayoutAgence>
  );
}
