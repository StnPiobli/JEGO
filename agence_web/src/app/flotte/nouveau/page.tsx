'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '../../components/Navigation';

/**
 * Configuration d'un bus, tout sur une seule page : infos de base a
 * gauche, apercu du plan genere EN TEMPS REEL a droite (se met a jour a
 * chaque changement de disposition/rangees), avec marquage interactif
 * des 4 categories issues du cahier des charges v4.0 section 11.1
 * fonctionnalites (Toilettes, Abimes, Premium) + Gate (ajout hors cahier des
 * charges : sieges supprimes par l'emplacement de la porte, meme logique que
 * Toilettes -- voir avertissement).
 *
 * Interface seule -- voir TODO. Contrat backend confirme :
 *   POST /api/bus (creerBus) : nom, type_bus, disposition,
 *     nombre_rangees, toilettes, climatisation, prises_usb, wifi,
 *     sieges_inclinables, supplement_premium
 *   PUT /api/bus/:id/sieges/toilettes { sieges: [...] }
 *   PUT /api/bus/:id/sieges/abime { sieges: [...] }
 *   PUT /api/bus/:id/sieges/premium { sieges: [...], supplement_premium? }
 *   (routes PUT appelables seulement APRES creation, une fois l'id connu)
 *   Gate : AUCUNE route backend nulle part -- facade permanente.
 */

const dispositions = ['1+1', '2+1', '1+2', '2+2', '2+3', '3+2'] as const;

const SCHEMAS_DISPOSITION: Record<string, string[]> = {
  '1+1': ['fenetre_gauche', 'fenetre_droite'],
  '2+1': ['fenetre_gauche', 'couloir_gauche', 'fenetre_droite'],
  '1+2': ['fenetre_gauche', 'couloir_droit', 'fenetre_droite'],
  '2+2': ['fenetre_gauche', 'couloir_gauche', 'couloir_droit', 'fenetre_droite'],
  '2+3': ['fenetre_gauche', 'couloir_gauche', 'couloir_droit', 'milieu', 'fenetre_droite'],
  '3+2': ['fenetre_gauche', 'milieu', 'couloir_gauche', 'couloir_droit', 'fenetre_droite'],
};
const LETTRES = ['A', 'B', 'C', 'D', 'E'];

const typesBus = [
  { valeur: 'standard', libelle: 'Standard' },
  { valeur: 'vip', libelle: 'VIP (tous premium)' },
  { valeur: 'mixte', libelle: 'Mixte (premium au choix)' },
] as const;

type Categorie = 'toilettes' | 'abime' | 'gate' | 'premium';

const modes: { valeur: Categorie; label: string; icone: string }[] = [
  { valeur: 'toilettes', label: 'Toilettes', icone: '🚽' },
  { valeur: 'abime', label: 'Abime', icone: '❌' },
  { valeur: 'gate', label: 'Porte (gate)', icone: '🚪' },
  { valeur: 'premium', label: 'Premium', icone: '⭐' },
];

export default function NouveauBus() {
  const [nom, setNom] = useState('');
  const [typeBus, setTypeBus] = useState<typeof typesBus[number]['valeur']>('standard');
  const [disposition, setDisposition] = useState<typeof dispositions[number]>('2+2');
  const [nombreRangees, setNombreRangees] = useState('8');
  const [climatisation, setClimatisation] = useState(true);
  const [prisesUsb, setPrisesUsb] = useState(false);
  const [wifi, setWifi] = useState(false);
  const [siegesInclinables, setSiegesInclinables] = useState(false);
  const [supplementPremium, setSupplementPremium] = useState('1000');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  const [modeMarquage, setModeMarquage] = useState<Categorie | null>(null);
  const [siegesToilettes, setSiegesToilettes] = useState<Set<string>>(new Set());
  const [siegesAbimes, setSiegesAbimes] = useState<Set<string>>(new Set());
  const [siegesGate, setSiegesGate] = useState<Set<string>>(new Set());
  const [siegesPremium, setSiegesPremium] = useState<Set<string>>(new Set());

  const schema = SCHEMAS_DISPOSITION[disposition];
  const nbRangees = Number(nombreRangees) || 0;
  const totalPlaces = nbRangees * schema.length;

  function categorieDe(numero: string): Categorie | null {
    if (siegesToilettes.has(numero)) return 'toilettes';
    if (siegesAbimes.has(numero)) return 'abime';
    if (siegesGate.has(numero)) return 'gate';
    if (siegesPremium.has(numero)) return 'premium';
    return null;
  }

  function toggleSiege(numero: string) {
    if (!modeMarquage) return;
    const setters: Record<Categorie, [Set<string>, (s: Set<string>) => void]> = {
      toilettes: [siegesToilettes, setSiegesToilettes],
      abime: [siegesAbimes, setSiegesAbimes],
      gate: [siegesGate, setSiegesGate],
      premium: [siegesPremium, setSiegesPremium],
    };
    const [current, setCurrent] = setters[modeMarquage];
    const copie = new Set(current);
    if (copie.has(numero)) {
      copie.delete(numero);
    } else {
      (['toilettes', 'abime', 'gate', 'premium'] as Categorie[]).forEach((c) => {
        if (c !== modeMarquage) setters[c][1]((s) => { const cc = new Set(s); cc.delete(numero); return cc; });
      });
      copie.add(numero);
    }
    setCurrent(copie);
  }

  const styleCategorie: Record<Categorie, string> = {
    toilettes: 'bg-[#64746C] text-white',
    abime: 'bg-[#D9534F] text-white',
    gate: 'bg-[#7C5CBF] text-white',
    premium: 'bg-[#E6B84C] text-[#14201A]',
  };

  function couleurSiege(numero: string): string {
    const cat = categorieDe(numero);
    if (cat) return styleCategorie[cat];
    if (typeBus === 'vip') return 'bg-[#0B9E63]/15 text-[#0B9E63] border border-[#0B9E63]/30';
    return 'bg-white border border-[#E7ECE8] text-[#64746C]';
  }

  async function creerBus(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!nom.trim() || !nombreRangees) {
      setErreur('Nom et nombre de rangees sont obligatoires.');
      return;
    }
    setEnregistrement(true);

    // TODO (branchement backend) :
    //   1. POST /api/bus -> recupere l'id genere
    //   2. PUT /api/bus/:id/sieges/toilettes { sieges: [...siegesToilettes] }
    //   3. PUT /api/bus/:id/sieges/abime { sieges: [...siegesAbimes] }
    //   4. PUT /api/bus/:id/sieges/premium { sieges: [...siegesPremium], supplement_premium }
    //   (siegesGate n'a pas de route -- rien a envoyer)

    await new Promise((r) => setTimeout(r, 700));
    setEnregistrement(false);
    setErreur('Creation non branchee pour l\'instant (interface uniquement).');
  }

  return (
    <div className="min-h-screen bg-[#EEF1EE] p-6 md:p-10">
      <Navigation />
      <div className="max-w-6xl mx-auto">
        <Link
          href="/flotte"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64746C] hover:text-[#14201A] transition-colors mb-6"
        >
          ← Retour a la flotte
        </Link>

        <h1 className="text-2xl font-extrabold text-[#14201A] mb-1">Nouveau bus</h1>
        <p className="text-sm text-[#64746C] mb-6">
          L&apos;apercu a droite se met a jour en temps reel selon tes choix.
        </p>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">
          {/* Formulaire */}
          <form onSubmit={creerBus} className="bg-white rounded-3xl border border-[#E7ECE8] shadow-sm p-8 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#64746C] mb-1.5">Nom du bus</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => { setNom(e.target.value); setErreur(null); }}
                placeholder="Confort Express 01"
                className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64746C] mb-1.5">Type de bus</label>
              <div className="space-y-2">
                {typesBus.map((t) => (
                  <button
                    key={t.valeur}
                    type="button"
                    onClick={() => setTypeBus(t.valeur)}
                    className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
                      typeBus === t.valeur
                        ? 'border-[#0B9E63] bg-[#0B9E63]/6 text-[#14201A] font-bold'
                        : 'border-[#E7ECE8] text-[#64746C] hover:border-[#D4D9D5]'
                    }`}
                  >
                    {t.libelle}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#64746C] mb-1.5">Disposition</label>
                <select
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value as typeof disposition)}
                  className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
                >
                  {dispositions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#64746C] mb-1.5">Nombre de rangees</label>
                <input
                  type="number"
                  min="1"
                  value={nombreRangees}
                  onChange={(e) => { setNombreRangees(e.target.value); setErreur(null); }}
                  className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64746C] mb-2">Equipements</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Climatisation', val: climatisation, set: setClimatisation, icone: '❄️' },
                  { label: 'Prises USB', val: prisesUsb, set: setPrisesUsb, icone: '🔌' },
                  { label: 'WiFi', val: wifi, set: setWifi, icone: '📶' },
                  { label: 'Sieges inclinables', val: siegesInclinables, set: setSiegesInclinables, icone: '💺' },
                ].map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => c.set(!c.val)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                      c.val ? 'border-[#0B9E63] bg-[#0B9E63]/6 text-[#14201A] font-semibold' : 'border-[#E7ECE8] text-[#64746C]'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] shrink-0 ${c.val ? 'bg-[#0B9E63] text-white' : 'bg-[#F1F4F1]'}`}>
                      {c.val ? '✓' : ''}
                    </span>
                    <span>{c.icone}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {typeBus === 'mixte' && (
              <div>
                <label className="block text-xs font-semibold text-[#64746C] mb-1.5">Supplement premium (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={supplementPremium}
                  onChange={(e) => setSupplementPremium(e.target.value)}
                  className="w-full rounded-xl bg-[#F1F4F1] border border-transparent focus:border-[#0B9E63] focus:bg-white outline-none px-4 py-3 text-sm text-[#14201A] transition-colors"
                />
              </div>
            )}

            {erreur && <p className="text-xs text-[#D9534F] font-medium">{erreur}</p>}

            <div className="flex gap-3 pt-2">
              <Link
                href="/flotte"
                className="flex-1 rounded-xl bg-[#F1F4F1] hover:bg-[#E7ECE8] text-[#14201A] font-bold text-sm py-3.5 text-center transition-colors"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={enregistrement}
                className="flex-1 rounded-xl bg-[#0B9E63] hover:bg-[#0A8D58] disabled:opacity-60 text-white font-bold text-sm py-3.5 transition-colors shadow-lg shadow-[#0B9E63]/25"
              >
                {enregistrement ? 'Enregistrement...' : 'Creer le bus'}
              </button>
            </div>
          </form>

          {/* Apercu temps reel, colle a droite */}
          <div className="lg:sticky lg:top-6">
            <div className="bg-white rounded-3xl border border-[#E7ECE8] shadow-sm p-6">
              <p className="text-xs font-semibold text-[#64746C] mb-3">Apercu en temps reel</p>

              <div className="flex flex-wrap gap-1.5 mb-1">
                {modes.map((m) => (
                  <button
                    key={m.valeur}
                    type="button"
                    onClick={() => setModeMarquage(modeMarquage === m.valeur ? null : m.valeur)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                      modeMarquage === m.valeur ? 'bg-[#14201A] text-white' : 'bg-[#F1F4F1] text-[#64746C]'
                    }`}
                  >
                    <span>{m.icone}</span>
                    {m.label}
                  </button>
                ))}
              </div>
              {modeMarquage === 'gate' && (
                <p className="text-[10px] text-[#7C5CBF] mb-3">
                  Sieges supprimes par l&apos;emplacement de la porte (comme toilettes). Ajout hors
                  cahier des charges -- aucune route backend, facade permanente.
                </p>
              )}
              {modeMarquage && modeMarquage !== 'gate' && (
                <p className="text-[11px] text-[#9AA69F] mb-3">
                  Clique un siege pour le marquer {modes.find((m) => m.valeur === modeMarquage)?.label.toLowerCase()}.
                </p>
              )}
              {!modeMarquage && <div className="mb-3" />}

              <div className="bg-[#F6F8F6] rounded-2xl border border-[#E7ECE8] p-4">
                <div className="flex justify-end mb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#E7ECE8] flex items-center justify-center">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9AA69F" strokeWidth="2">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                  {Array.from({ length: nbRangees }, (_, r) => r + 1).map((rangee) => {
                    let dernierIdxGauche = -1;
                    schema.forEach((t, idx) => { if (t.endsWith('_gauche')) dernierIdxGauche = idx; });
                    const idxCouloir = dernierIdxGauche + 1;
                    return (
                      <div key={rangee} className="flex items-center gap-1.5">
                        <span className="w-4 text-[9px] text-[#9AA69F] font-semibold shrink-0">{rangee}</span>
                        <div className="flex gap-1.5">
                          {schema.map((_, pos) => {
                            const numero = `${rangee}${LETTRES[pos]}`;
                            return (
                              <div key={pos} className="flex items-center">
                                {pos === idxCouloir && <div className="w-3" />}
                                <button
                                  type="button"
                                  onClick={() => toggleSiege(numero)}
                                  className={`w-7 h-7 rounded flex items-center justify-center text-[8px] font-bold transition-colors ${couleurSiege(numero)} ${
                                    modeMarquage ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                                  }`}
                                >
                                  {numero}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-[#64746C] mt-4 pt-4 border-t border-[#E7ECE8]">
                  {totalPlaces} places au total{typeBus === 'vip' && ' · toutes premium (VIP)'}
                </p>
              </div>

              {(siegesToilettes.size > 0 || siegesAbimes.size > 0 || siegesGate.size > 0 || siegesPremium.size > 0) && (
                <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-[#64746C]">
                  {siegesToilettes.size > 0 && <span>🚽 {siegesToilettes.size}</span>}
                  {siegesAbimes.size > 0 && <span>❌ {siegesAbimes.size}</span>}
                  {siegesGate.size > 0 && <span>🦵 {siegesGate.size}</span>}
                  {siegesPremium.size > 0 && <span>⭐ {siegesPremium.size}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}