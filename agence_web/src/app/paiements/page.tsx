'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import LayoutAgence from '../components/LayoutAgence';
import DateNavigator from '../components/DateNavigator';
import { todayInputDate } from '../lib/date';
import { apiFetch } from '../lib/api';

/**
 * Versements réellement reçus par l'agence, lus depuis l'escrow.
 *
 * Un versement part 6 h après la déclaration d'arrivée du trajet.
 * Cette vue ne montre jamais la marge JEGO ni le prix exact payé par
 * le client : uniquement le net revenant à l'agence.
 */

type Versement = { id: string; date: string; trajet: string; numeroVoyage: string; trajetId: string; montant: number; statut: 'verse' | 'en_attente' };

const AUJOURDHUI = todayInputDate();

export default function Paiements() {
  const [dateChoisie, setDateChoisie] = useState(AUJOURDHUI);
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'verse' | 'en_attente'>('tous');
  const [versements, setVersements] = useState<Versement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const rep = await apiFetch('/api/agences/versements');
      const lignes = (rep.versements || []) as Record<string, unknown>[];
      setVersements(
        lignes.map((v) => {
          const date = String(v.date_depart ?? '').split('T')[0];
          const heure = String(v.heure_depart ?? '').slice(0, 5);
          return {
            id: String(v.trajet_id),
            date,
            trajet: `${v.depart ?? ''} → ${v.arrivee ?? ''} · ${heure}`,
            numeroVoyage: String(v.numero ?? ''),
            trajetId: String(v.trajet_id),
            // Net agence : la commission JEGO n'apparaît jamais ici.
            montant: Number(v.montant_agence ?? 0),
            statut: v.entierement_verse ? 'verse' : 'en_attente',
          } as Versement;
        }),
      );
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const versementsDuJour = useMemo(() => {
    return versements.filter((v) => v.date === dateChoisie && (filtreStatut === 'tous' || v.statut === filtreStatut))
      .sort((a, b) => b.montant - a.montant);
  }, [versements, dateChoisie, filtreStatut]);

  const total = versementsDuJour.reduce((s, v) => s + v.montant, 0);
  const enAttente = versementsDuJour.filter((v) => v.statut === 'en_attente').reduce((s, v) => s + v.montant, 0);

  return (
    <LayoutAgence>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-[28px] font-extrabold text-ink mb-1">Paiements</h1>
        <p className="text-[13px] text-ink-soft mb-4">Cette vue ne montre jamais la marge JEGO ni le prix exact paye par le client.</p>

        {erreur && (
          <div className="rounded-2xl p-3 mb-6 bg-red/6 border border-red/20">
            <p className="text-[11px] text-red">{erreur}</p>
            <button onClick={charger} className="text-[11px] font-bold text-green-700 mt-1">Réessayer</button>
          </div>
        )}
        {chargement && (
          <div className="rounded-2xl p-3 mb-6 bg-paper border border-line">
            <p className="text-[11px] text-ink-soft">Chargement des versements...</p>
          </div>
        )}

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