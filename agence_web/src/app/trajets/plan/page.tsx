'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '../../components/Navigation';

/**
 * Plan des sieges en temps reel pour un trajet donne. Interface seule --
 * voir TODO. Deux points importants confirmes avant de construire :
 *
 * 1. GET /api/bus/:id/plan existe (voirPlanBus) et renvoie la structure
 *    du bus (numero, rangee, position, type_position, est_premium,
 *    statut in ['disponible','supprime_toilettes','desactive']) --
 *    mais c'est un plan STRUCTUREL du bus, pas le statut de vente pour
 *    UN trajet precis.
 * 2. Le statut de vente par trajet (vendu en ligne / reserve) vit
 *    ailleurs (billets, soft_locks, route publique GET /trajets/:id/plan
 *    dans reservationController) -- pas inspecte ce soir.
 * 3. AUCUNE route "vendu en physique" n'existe nulle part dans le
 *    backend actuel (verifie : recherche "physique" negative dans tout
 *    routes/). Le bouton ci-dessous est donc une FACADE : il met a jour
 *    l'affichage local uniquement, sans rien persister. A batir cote
 *    backend avant branchement (nouveau statut siege + route dediee).
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

// DONNEES DEMO -- bus 2+2, 8 rangees, structure/statuts illustratifs.
function genererSiegesDemo(): Siege[] {
  const sieges: Siege[] = [];
  const lettres = ['A', 'B', 'C', 'D'];
  const typesParPosition = ['fenetre_gauche', 'couloir_gauche', 'couloir_droit', 'fenetre_droite'];
  const scenarios: StatutVente[] = [
    'vendu_en_ligne', 'vendu_physique', 'disponible', 'reserve',
    'disponible', 'disponible', 'vendu_en_ligne', 'disponible',
  ];

  for (let rangee = 1; rangee <= 8; rangee++) {
    for (let pos = 0; pos < 4; pos++) {
      const idx = (rangee - 1) * 4 + pos;
      sieges.push({
        id: `s${idx}`,
        numero: `${rangee}${lettres[pos]}`,
        rangee,
        position: pos + 1,
        type_position: typesParPosition[pos],
        est_premium: rangee <= 2,
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
  const [siegeSelectionne, setSiegeSelectionne] = useState<Siege | null>(null);
  const [avertissement, setAvertissement] = useState(true);

  // TODO (branchement backend) : remplacer genererSiegesDemo() par un
  // vrai fetch GET /api/bus/:id/plan croise avec le statut de vente du
  // trajet (route a identifier/construire cote reservations).

  const rangees = Array.from(new Set(sieges.map((s) => s.rangee))).sort((a, b) => a - b);
  const nbVendus = sieges.filter((s) => s.statutVente === 'vendu_en_ligne' || s.statutVente === 'vendu_physique').length;
  const nbTotal = sieges.filter((s) => s.statutVente !== 'indisponible').length;

  function marquerVenduPhysique(siege: Siege) {
    // FACADE UNIQUEMENT -- voir avertissement en tete de fichier.
    setSieges((prev) =>
      prev.map((s) => (s.id === siege.id ? { ...s, statutVente: 'vendu_physique' } : s))
    );
    setSiegeSelectionne(null);
  }

  function selectionAleatoire() {
    // FACADE UNIQUEMENT. Choisit un nombre aleatoire (1 a 3) de sieges
    // actuellement disponibles et les marque vendus en physique.
    const disponibles = sieges.filter((s) => s.statutVente === 'disponible');
    if (disponibles.length === 0) return;
    const nb = Math.min(disponibles.length, 1 + Math.floor(Math.random() * 3));
    const melanges = [...disponibles].sort(() => Math.random() - 0.5).slice(0, nb);
    const idsChoisis = new Set(melanges.map((s) => s.id));
    setSieges((prev) =>
      prev.map((s) => (idsChoisis.has(s.id) ? { ...s, statutVente: 'vendu_physique' } : s))
    );
  }

  function selectionAleatoire() {
    // FACADE UNIQUEMENT, comme le marquage manuel. Choisit un siege
    // disponible au hasard et le marque vendu en physique -- pratique
    // pour tester sans cliquer chaque siege un par un.
    const disponibles = sieges.filter((s) => s.statutVente === 'disponible');
    if (disponibles.length === 0) return;
    const choisi = disponibles[Math.floor(Math.random() * disponibles.length)];
    marquerVenduPhysique(choisi);
  }

  return (
    <div className="min-h-screen bg-[#EEF1EE] p-6 md:p-10">
      <Navigation />
      <div className="max-w-3xl mx-auto">
        <Link
          href="/trajets"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64746C] hover:text-[#14201A] transition-colors mb-6"
        >
          ← Retour a la liste
        </Link>

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-extrabold text-[#14201A]">Plan des sieges</h1>
          <button
            onClick={selectionAleatoire}
            className="flex items-center gap-1.5 rounded-xl bg-[#F1F4F1] hover:bg-[#E7ECE8] text-[#14201A] font-bold text-xs px-4 py-2.5 transition-colors"
          >
            🎲 Selection aleatoire
          </button>
        </div>
        <p className="text-sm text-[#64746C] mb-1">Douala → Yaounde · 25 juil 2026 · 07:00</p>
        <p className="text-sm text-[#64746C] mb-6">Confort Express 01</p>

        {avertissement && (
          <div className="rounded-2xl p-4 mb-6 bg-[#D9534F]/6 border border-[#D9534F]/20 flex items-start gap-3">
            <span className="text-base shrink-0">⚠</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#14201A]">Ecran en facade</p>
              <p className="text-sm text-[#64746C] mt-0.5">
                Aucune route backend &quot;vendu en physique&quot; n&apos;existe encore. Marquer un siege
                ici ne change que l&apos;affichage local, rien n&apos;est enregistre.
              </p>
            </div>
            <button
              onClick={() => setAvertissement(false)}
              className="text-[#9AA69F] hover:text-[#64746C] shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Legende */}
        <div className="flex flex-wrap gap-4 mb-6">
          {(Object.keys(couleurs) as StatutVente[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded ${couleurs[s].bg}`} />
              <span className="text-xs text-[#64746C]">{couleurs[s].label}</span>
            </div>
          ))}
        </div>

        {/* Plan du bus */}
        <div className="bg-white rounded-3xl border border-[#E7ECE8] shadow-sm p-8">
          {/* Cabine chauffeur */}
          <div className="flex justify-end mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#F1F4F1] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA69F" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
              </svg>
            </div>
          </div>

          <div className="space-y-2.5">
            {rangees.map((rangee) => {
              const siegesRangee = sieges.filter((s) => s.rangee === rangee).sort((a, b) => a.position - b.position);
              const idxCouloir = siegesRangee.findIndex((s) => s.type_position.endsWith('_gauche')) + 1;

              return (
                <div key={rangee} className="flex items-center gap-2">
                  <span className="w-5 text-xs text-[#9AA69F] font-semibold">{rangee}</span>
                  <div className="flex gap-2 flex-1">
                    {siegesRangee.map((siege, i) => (
                      <div key={siege.id} className="flex items-center">
                        {i === idxCouloir && <div className="w-5" />}
                        <button
                          disabled={siege.statutVente !== 'disponible'}
                          onClick={() => setSiegeSelectionne(siege)}
                          className={`w-11 h-11 rounded-lg flex items-center justify-center text-[10px] font-bold transition-transform ${
                            couleurs[siege.statutVente].bg
                          } ${couleurs[siege.statutVente].text} ${
                            siege.statutVente === 'disponible' ? 'hover:scale-105 cursor-pointer' : 'cursor-default'
                          } ${siege.est_premium ? 'ring-2 ring-[#E6B84C] ring-offset-1' : ''}`}
                        >
                          {siege.numero}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stat */}
        <div className="mt-6 bg-white rounded-2xl border border-[#E7ECE8] px-5 py-4 flex items-center justify-between">
          <span className="text-sm font-bold text-[#14201A]">
            Places vendues : {nbVendus}/{nbTotal}
          </span>
          <span className="text-xs text-[#9AA69F]">Cercle dore = siege premium</span>
        </div>
      </div>

      {/* Popover confirmation vente physique */}
      {siegeSelectionne && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50"
          onClick={() => setSiegeSelectionne(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full"
          >
            <p className="text-sm font-bold text-[#14201A] mb-1">
              Marquer le siege {siegeSelectionne.numero} comme vendu ?
            </p>
            <p className="text-sm text-[#64746C] mb-5">
              A utiliser quand un client paie directement au guichet. Le siege deviendra
              indisponible en ligne.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSiegeSelectionne(null)}
                className="flex-1 rounded-xl bg-[#F1F4F1] hover:bg-[#E7ECE8] text-[#14201A] font-bold text-sm py-3 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => marquerVenduPhysique(siegeSelectionne)}
                className="flex-1 rounded-xl bg-[#E6B84C] hover:bg-[#D9A93A] text-[#14201A] font-bold text-sm py-3 transition-colors"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}