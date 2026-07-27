'use client';

import { useState } from 'react';
import Link from 'next/link';
import LayoutAgence from '../../components/LayoutAgence';

/**
 * Plan des sieges en temps reel pour un trajet donne. Interface seule.
 * Vente en physique : UN SEUL billet a la fois (aleatoire ou manuel,
 * meme flux) -- demande les infos du client, puis simule l'envoi d'un
 * mail de confirmation de reservation.
 *
 * Points confirmes/manquants cote backend, voir commentaires plus bas.
 * AUCUNE route "vendu en physique" n'existe nulle part.
 */

type StatutVente = 'disponible' | 'vendu_en_ligne' | 'vendu_physique' | 'reserve' | 'indisponible';

type Siege = {
  id: string;
  numero: string;
  rangee: number;
  position: number;
  type_position: string;
  est_premium: boolean;
  statutVente: StatutVente;
};

function genererSiegesDemo(): Siege[] {
  const sieges: Siege[] = [];
  const lettres = ['A', 'B', 'C', 'D'];
  const typesParPosition = ['fenetre_gauche', 'couloir_gauche', 'couloir_droit', 'fenetre_droite'];
  const scenarios: StatutVente[] = ['vendu_en_ligne', 'vendu_physique', 'disponible', 'reserve', 'disponible', 'disponible', 'vendu_en_ligne', 'disponible'];
  for (let rangee = 1; rangee <= 8; rangee++) {
    for (let pos = 0; pos < 4; pos++) {
      const idx = (rangee - 1) * 4 + pos;
      sieges.push({
        id: `s${idx}`, numero: `${rangee}${lettres[pos]}`, rangee, position: pos + 1,
        type_position: typesParPosition[pos], est_premium: rangee <= 2,
        statutVente: rangee === 8 && pos === 0 ? 'indisponible' : scenarios[idx % scenarios.length],
      });
    }
  }
  return sieges;
}

const couleurs: Record<StatutVente, { bg: string; text: string; label: string }> = {
  disponible: { bg: 'bg-[#0B9E63]', text: 'text-white', label: 'Disponible' },
  vendu_en_ligne: { bg: 'bg-[#D9534F]', text: 'text-white', label: 'Vendu en ligne' },
  vendu_physique: { bg: 'bg-[#E6B84C]', text: 'text-[#14201A]', label: 'Vendu en physique' },
  reserve: { bg: 'bg-[#9AA69F]', text: 'text-white', label: 'Reserve (verrou 5 min)' },
  indisponible: { bg: 'bg-[#E7ECE8]', text: 'text-[#9AA69F]', label: 'Indisponible' },
};

export default function PlanSieges() {
  const [sieges, setSieges] = useState<Siege[]>(genererSiegesDemo);
  const [siegeAVendre, setSiegeAVendre] = useState<Siege | null>(null);
  const [avertissement, setAvertissement] = useState(true);

  const [nomClient, setNomClient] = useState('');
  const [telClient, setTelClient] = useState('');
  const [emailClient, setEmailClient] = useState('');
  const [etapeVente, setEtapeVente] = useState<'formulaire' | 'confirmation'>('formulaire');

  const rangees = Array.from(new Set(sieges.map((s) => s.rangee))).sort((a, b) => a - b);
  const nbVendus = sieges.filter((s) => s.statutVente === 'vendu_en_ligne' || s.statutVente === 'vendu_physique').length;
  const nbTotal = sieges.filter((s) => s.statutVente !== 'indisponible').length;

  function ouvrirVente(siege: Siege) {
    setSiegeAVendre(siege);
    setEtapeVente('formulaire');
    setNomClient(''); setTelClient(''); setEmailClient('');
  }

  function selectionAleatoire() {
    const disponibles = sieges.filter((s) => s.statutVente === 'disponible');
    if (disponibles.length === 0) return;
    const choisi = disponibles[Math.floor(Math.random() * disponibles.length)];
    ouvrirVente(choisi);
  }

  function confirmerVente() {
    if (!siegeAVendre || !nomClient.trim() || !telClient.trim()) return;
    setSieges((prev) => prev.map((s) => (s.id === siegeAVendre.id ? { ...s, statutVente: 'vendu_physique' } : s)));
    setEtapeVente('confirmation');
    // FACADE : simule l'envoi d'un email de confirmation de reservation.
  }

  function fermerVente() {
    setSiegeAVendre(null);
  }

  return (
    <LayoutAgence>
      <div className="max-w-3xl mx-auto">
        <Link href="/trajets" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64746C] hover:text-[#14201A] transition-colors mb-6">
          ← Retour a la liste
        </Link>

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-extrabold text-[#14201A]">Plan des sieges</h1>
          <button
            onClick={selectionAleatoire}
            className="flex items-center gap-1.5 rounded-xl bg-[#F1F4F1] hover:bg-[#E7ECE8] text-[#14201A] font-bold text-xs px-4 py-2.5 transition-colors"
          >
            🎲 Vendre un siege au hasard
          </button>
        </div>
        <p className="text-sm text-[#64746C] mb-1">Douala → Yaounde · 26 juil 2026 · 07:00</p>
        <p className="text-sm text-[#64746C] mb-6">Confort Express 01</p>

        {avertissement && (
          <div className="rounded-2xl p-4 mb-6 bg-[#D9534F]/6 border border-[#D9534F]/20 flex items-start gap-3">
            <span className="text-base shrink-0">⚠</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#14201A]">Ecran en facade</p>
              <p className="text-sm text-[#64746C] mt-0.5">
                Aucune route backend &quot;vendu en physique&quot; n&apos;existe encore. L&apos;email de
                confirmation est simule, rien n&apos;est reellement envoye.
              </p>
            </div>
            <button onClick={() => setAvertissement(false)} className="text-[#9AA69F] hover:text-[#64746C] shrink-0">✕</button>
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-6">
          {(Object.keys(couleurs) as StatutVente[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded ${couleurs[s].bg}`} />
              <span className="text-xs text-[#64746C]">{couleurs[s].label}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-[#E7ECE8] shadow-sm p-8">
          <div className="flex justify-end mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#F1F4F1] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA69F" strokeWidth="2">
                <circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" />
              </svg>
            </div>
          </div>

          <div className="space-y-2.5">
            {rangees.map((rangee) => {
              const siegesRangee = sieges.filter((s) => s.rangee === rangee).sort((a, b) => a.position - b.position);
              let dernierIdxGauche = -1;
              siegesRangee.forEach((s, idx) => { if (s.type_position.endsWith('_gauche')) dernierIdxGauche = idx; });
              const idxCouloir = dernierIdxGauche + 1;

              return (
                <div key={rangee} className="flex items-center gap-2">
                  <span className="w-5 text-xs text-[#9AA69F] font-semibold">{rangee}</span>
                  <div className="flex gap-2 flex-1">
                    {siegesRangee.map((siege, i) => (
                      <div key={siege.id} className="flex items-center">
                        {i === idxCouloir && <div className="w-5" />}
                        <button
                          disabled={siege.statutVente !== 'disponible'}
                          onClick={() => ouvrirVente(siege)}
                          className={`relative w-11 h-11 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors ${couleurs[siege.statutVente].bg} ${couleurs[siege.statutVente].text} ${
                            siege.statutVente === 'disponible' ? 'hover:ring-2 hover:ring-[#14201A]/20 cursor-pointer' : 'cursor-default'
                          }`}
                        >
                          {siege.numero}
                          {siege.est_premium && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white shadow flex items-center justify-center text-[8px]">⭐</span>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-[#E7ECE8] px-5 py-4 flex items-center justify-between">
          <span className="text-sm font-bold text-[#14201A]">Places vendues : {nbVendus}/{nbTotal}</span>
          <span className="text-xs text-[#9AA69F]">⭐ = siege premium</span>
        </div>
      </div>

      {/* Formulaire vente un billet (manuel ou aleatoire, meme flux) */}
      {siegeAVendre && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={fermerVente}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-8 max-w-sm w-full">
            {etapeVente === 'formulaire' ? (
              <>
                <p className="text-sm font-bold text-[#14201A] mb-1">Vente du siege {siegeAVendre.numero}</p>
                <p className="text-xs text-[#64746C] mb-5">Un seul billet a la fois. Renseigne les infos du client.</p>
                <div className="space-y-3 mb-5">
                  <input value={nomClient} onChange={(e) => setNomClient(e.target.value)} placeholder="Nom du client" className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm" />
                  <input value={telClient} onChange={(e) => setTelClient(e.target.value)} placeholder="Telephone" className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm" />
                  <input type="email" value={emailClient} onChange={(e) => setEmailClient(e.target.value)} placeholder="Email (pour la confirmation)" className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm" />
                </div>
                <div className="flex gap-3">
                  <button onClick={fermerVente} className="flex-1 rounded-xl bg-[#F1F4F1] text-[#14201A] font-bold text-sm py-3">Annuler</button>
                  <button
                    onClick={confirmerVente}
                    disabled={!nomClient.trim() || !telClient.trim()}
                    className="flex-1 rounded-xl bg-[#E6B84C] disabled:opacity-40 text-[#14201A] font-bold text-sm py-3"
                  >
                    Vendre
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#0B9E63]/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="text-sm font-bold text-[#14201A] mb-1">Siege {siegeAVendre.numero} vendu</p>
                <p className="text-xs text-[#64746C] mb-6">
                  {emailClient
                    ? `Email de confirmation envoye a ${emailClient} (facade -- non branche).`
                    : 'Aucun email fourni -- confirmation non envoyee.'}
                </p>
                <button onClick={fermerVente} className="w-full rounded-xl bg-[#0B9E63] text-white font-bold text-sm py-3.5">Fermer</button>
              </div>
            )}
          </div>
        </div>
      )}
    </LayoutAgence>
  );
}