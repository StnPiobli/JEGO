'use client';

import { useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { todayInputDate } from '../lib/date';

/**
 * Paiements, regle sur le jour J automatiquement, filtre calendrier
 * pour changer de date + filtre statut. PARTIELLEMENT REEL :
 * rapportAgence existe, contenu exact non verifie.
 */

type Versement = { id: string; date: string; trajet: string; numeroVoyage: string; trajetId: string; montant: number; statut: 'verse' | 'en_attente' };

const AUJOURDHUI = todayInputDate();

const TOUS_LES_VERSEMENTS: Versement[] = [
  { id: '1', date: AUJOURDHUI, trajet: 'Douala → Yaounde · 07:00', numeroVoyage: 'JG-260727-0700-DLYDE', trajetId: 't1', montant: 148000, statut: 'en_attente' },
  { id: '2', date: AUJOURDHUI, trajet: 'Yaounde → Douala · 14:00', numeroVoyage: 'JG-260727-1400-YDEDLA', trajetId: 't2', montant: 66000, statut: 'en_attente' },
  { id: '3', date: '2026-07-24', trajet: 'Douala → Bafoussam · 09:00', numeroVoyage: 'JG-260724-0900-DLABFM', trajetId: 't3', montant: 96000, statut: 'verse' },
  { id: '4', date: '2026-07-23', trajet: 'Douala → Yaounde · 07:00', numeroVoyage: 'JG-260723-0700-DLYDE', trajetId: 't4', montant: 156000, statut: 'verse' },
  { id: '5', date: '2026-07-22', trajet: 'Yaounde → Douala · 14:00', numeroVoyage: 'JG-260722-1400-YDEDLA', trajetId: 't5', montant: 121000, statut: 'verse' },
];

export default function Paiements() {
  const [dateChoisie, setDateChoisie] = useState(AUJOURDHUI);
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'verse' | 'en_attente'>('tous');

  const versementsDuJour = useMemo(() => {
    return TOUS_LES_VERSEMENTS.filter((v) => v.date === dateChoisie && (filtreStatut === 'tous' || v.statut === filtreStatut))
      .sort((a, b) => b.montant - a.montant);
  }, [dateChoisie, filtreStatut]);

  const total = versementsDuJour.reduce((s, v) => s + v.montant, 0);
  const enAttente = versementsDuJour.filter((v) => v.statut === 'en_attente').reduce((s, v) => s + v.montant, 0);

  return (
    <LayoutAgence>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-ink mb-1">Paiements</h1>
        <p className="text-[13px] text-ink-soft mb-4">Cette vue ne montre jamais la marge JEGO ni le prix exact paye par le client.</p>

        <div className="rounded-2xl p-3 mb-6 bg-amber/10 border border-amber/30">
          <p className="text-[11px] text-ink-soft">
            <code className="bg-paper px-1 py-0.5 rounded">rapportAgence</code> existe reellement, contenu exact non verifie.
          </p>
        </div>

                <DateNavigator date={dateChoisie} onChange={setDateChoisie} className="mb-6" />

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-paper rounded-2xl border border-line p-6">
            <p className="text-[11px] text-ink-soft mb-1">Total ce jour</p>
            <p className="text-[26px] font-extrabold text-green-700">{total.toLocaleString('fr-FR')} FCFA</p>
          </div>
          <div className="bg-paper rounded-2xl border border-line p-6">
            <p className="text-[11px] text-ink-soft mb-1">En attente (escrow)</p>
            <p className="text-[26px] font-extrabold text-amber">{enAttente.toLocaleString('fr-FR')} FCFA</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {(['tous', 'verse', 'en_attente'] as const).map((f) => (
            <button key={f} onClick={() => setFiltreStatut(f)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${filtreStatut === f ? 'bg-ink text-white' : 'bg-paper border border-line text-ink-soft'}`}>
              {f === 'tous' ? 'Tous' : f === 'verse' ? 'Verses' : 'En attente'}
            </button>
          ))}
        </div>

        <div className="bg-paper rounded-2xl border border-line overflow-hidden">
          <div className="divide-y divide--line">
            {versementsDuJour.map((v) => (
              <div key={v.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-ink">{v.trajet}</p>
                  <p className="text-[10px] font-mono text-ink-soft mt-0.5">{v.numeroVoyage} · #{v.trajetId}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${v.statut === 'verse' ? 'bg-green-700/10 text-green-700' : 'bg-amber/15 text-amber'}`}>
                  {v.statut === 'verse' ? 'Verse' : 'En attente'}
                </span>
                <p className="w-32 text-right text-[13px] font-extrabold text-ink">{v.montant.toLocaleString('fr-FR')} FCFA</p>
              </div>
            ))}
            {versementsDuJour.length === 0 && (
              <div className="p-10 text-center"><p className="text-[13px] text-ink-soft">Aucun versement ce jour.</p></div>
            )}
          </div>
        </div>
      </div>
    </LayoutAgence>
  );
}