'use client';

// BRANCHÉ SUR LE VRAI BACKEND — GET /api/bus, PUT /api/bus/:id/desactiver.
// Pas de suppression réelle (les trajets référencent le bus sans
// cascade) : "Supprimer" désactive le bus, qui sort de la liste.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LayoutAgence from '../components/LayoutAgence';
import { apiFetch } from '../lib/api';

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

const libellesType = { vip: 'VIP', standard: 'Standard', mixte: 'Mixte' };
const stylesType = { vip: 'bg-amber/15 text-amber', standard: 'bg-off-white text-ink-soft', mixte: 'bg-green-700/10 text-green-700' };
const equipements: { cle: keyof Bus; icone: string; label: string }[] = [
  { cle: 'climatisation', icone: '❄️', label: 'Climatisation' },
  { cle: 'toilettes', icone: '🚽', label: 'Toilettes' },
  { cle: 'prises_usb', icone: '🔌', label: 'USB' },
  { cle: 'wifi', icone: '📶', label: 'WiFi' },
  { cle: 'sieges_inclinables', icone: '💺', label: 'Inclinables' },
];

export default function Flotte() {
  const [bus, setBus] = useState<Bus[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [suppression, setSuppression] = useState<Bus | null>(null);

  async function charger() {
    setChargement(true);
    setErreur(null);
    try {
      const data = await apiFetch('/api/bus');
      setBus(data.bus || []);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Impossible de charger la flotte.');
      setBus([]);
    } finally {
      setChargement(false);
    }
  }
  useEffect(() => { charger(); }, []);

  async function confirmerSuppression() {
    if (!suppression) return;
    try {
      await apiFetch(`/api/bus/${suppression.id}/desactiver`, { method: 'PUT' });
      await charger();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur lors de la désactivation.');
    } finally {
      setSuppression(null);
    }
  }

  return (
    <LayoutAgence>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[28px] font-extrabold text-ink">Ma flotte</h1>
            <p className="text-[13px] text-ink-soft mt-1">Gère tes bus, leur configuration et leurs équipements.</p>
          </div>
          <Link href="/flotte/nouveau" className="rounded-xl bg-green-700 hover:bg-green-900 text-white font-bold text-[13px] px-5 py-3 transition-colors shadow-lg shadow--green-700/25 whitespace-nowrap">+ Nouveau bus</Link>
        </div>

        {erreur && <div className="text-xs text-red bg-red-bg rounded-lg px-3 py-2 mb-4">{erreur}</div>}

        {chargement ? (
          <div className="text-sm text-ink-soft">Chargement…</div>
        ) : bus.length === 0 ? (
          <div className="bg-paper rounded-2xl border border-line p-10 text-center text-sm text-ink-soft">Aucun bus dans ta flotte pour l&apos;instant.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {bus.map((b) => (
              <div key={b.id} className="bg-paper rounded-2xl border border-line p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[14px] font-extrabold text-ink">{b.nom}</p>
                    <p className="text-[12px] text-ink-soft mt-0.5">{b.disposition} · {b.nombre_rangees} rangées · {b.nombre_sieges} places</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${stylesType[b.type_bus]}`}>{libellesType[b.type_bus]}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {equipements.filter((eq) => b[eq.cle]).map((eq) => <span key={eq.cle} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-off-white text-[11px] text-ink-soft"><span>{eq.icone}</span>{eq.label}</span>)}
                </div>

                <div className="flex gap-2">
                  <Link href={`/flotte/nouveau?edit=${b.id}`} className="flex-1 text-center rounded-xl bg-ink text-white font-bold text-[13px] px-4 py-2.5">Modifier</Link>
                  <button onClick={() => setSuppression(b)} className="flex-1 rounded-xl bg-red/10 text-red font-bold text-[13px] px-4 py-2.5">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {suppression && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={() => setSuppression(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-paper rounded-3xl p-6 max-w-md w-full">
            <p className="text-[18px] font-extrabold text-ink mb-2">Supprimer ce bus ?</p>
            <p className="text-[13px] text-ink-soft mb-5">{suppression.nom} sera désactivé et retiré de ta flotte active. Les trajets déjà effectués avec ce bus restent inchangés dans l&apos;historique.</p>
            <div className="flex gap-3">
              <button onClick={() => setSuppression(null)} className="flex-1 rounded-xl bg-off-white text-ink font-bold text-[13px] py-3">Annuler</button>
              <button onClick={confirmerSuppression} className="flex-1 rounded-xl bg-red text-white font-bold text-[13px] py-3">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </LayoutAgence>
  );
}
