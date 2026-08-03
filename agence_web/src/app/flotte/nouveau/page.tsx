'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import LayoutAgence from '../../components/LayoutAgence';
import { useLangue } from '../../lib/langue';
import { apiFetch } from '../../lib/api';

// ✅ Création BRANCHÉE — POST /api/bus (nom, type_bus, disposition,
// nombre_rangees, toilettes, climatisation, prises_usb, wifi,
// sieges_inclinables, supplement_premium). ⚠️ Modification reste DÉMO —
// aucune route PUT n'existe pour éditer un bus existant.

type Categorie = 'toilettes' | 'abime' | 'porte' | 'premium';
type TypeBus = 'standard' | 'vip' | 'mixte';

const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F'];
const SCHEMAS_DISPOSITION = {
  '1+1': ['A', 'B'],
  '1+2': ['A', 'B', 'C'],
  '2+1': ['A', 'B', 'C'],
  '2+2': ['A', 'B', 'C', 'D'],
  '2+3': ['A', 'B', 'C', 'D', 'E'],
  '3+2': ['A', 'B', 'C', 'D', 'E'],
  '3+3': ['A', 'B', 'C', 'D', 'E', 'F'],
} as const;
const typesBus = [
  { valeur: 'standard', libelle: 'Standard' },
  { valeur: 'vip', libelle: 'VIP (tous premium)' },
  { valeur: 'mixte', libelle: 'Mixte (premium au choix)' },
] as const;
const dispositions = ['1+1', '1+2', '2+1', '2+2', '2+3', '3+2', '3+3'] as const;

export default function NouveauBus() {
  const langue = useLangue();
  const t = langue === 'en' ? {
    editBus: 'Edit bus', newBus: 'New bus', config: 'Bus configuration and seat layout preview shown clearly on the right.', backFleet: 'Back to fleet',
    busName: 'Bus name', layout: 'Layout', rows: 'Number of rows', equipment: 'Equipment', premiumSupplement: 'Premium surcharge',
    cancel: 'Cancel', save: 'Update bus', create: 'Create bus', saving: 'Saving...', seatPlan: 'Seat plan', seatPlanText: 'The live layout preview stays directly on the right for a clear view.', totalSeats: 'total seats',
    required: 'Bus name and row count are required.', created: 'Bus created successfully (demo).', updated: 'Bus updated successfully (demo).',
    standardBlocked: 'Premium seat selection is disabled for a standard bus.', doorArea: 'Door area', toilets: 'Toilets', damaged: 'Damaged', premium: 'Premium'
  } : {
    editBus: 'Modifier un bus', newBus: 'Nouveau bus', config: 'Configuration du bus et apercu du plan affiche clairement a droite.', backFleet: 'Retour flotte',
    busName: 'Nom du bus', layout: 'Disposition', rows: 'Nombre de rangees', equipment: 'Equipements', premiumSupplement: 'Supplement premium',
    cancel: 'Annuler', save: 'Mettre a jour le bus', create: 'Creer le bus', saving: 'Enregistrement...', seatPlan: 'Plan des sieges', seatPlanText: 'Le plan en generation reste directement a droite pour une visualisation nette.', totalSeats: 'places au total',
    required: 'Nom et nombre de rangees requis.', created: 'Bus cree avec succes (facade).', updated: 'Bus modifie avec succes (facade).',
    standardBlocked: 'La selection premium est automatiquement bloquee pour un bus standard.', doorArea: 'Espace porte', toilets: 'Toilettes', damaged: 'Abime', premium: 'Premium'
  };

  const params = useSearchParams();
  const router = useRouter();
  const busId = params.get('id');
  const isEdition = !!busId;

  const base = useMemo(() => {
    if (!isEdition) return null;
    return {
      nom: params.get('nom') || 'Confort Express 04',
      typeBus: (params.get('type') as TypeBus) || 'standard',
      disposition: (params.get('disposition') as keyof typeof SCHEMAS_DISPOSITION) || '2+3',
      nombreRangees: params.get('rangees') || '13',
      climatisation: (params.get('climatisation') || '1') === '1',
      prisesUsb: (params.get('prisesUsb') || '1') === '1',
      wifi: (params.get('wifi') || '1') === '1',
      siegesInclinables: (params.get('siegesInclinables') || '1') === '1',
      supplementPremium: params.get('supplementPremium') || '1000',
    };
  }, [isEdition, params]);

  const [nom, setNom] = useState(base?.nom || '');
  const [typeBus, setTypeBus] = useState<TypeBus>(base?.typeBus || 'standard');
  const [disposition, setDisposition] = useState<keyof typeof SCHEMAS_DISPOSITION>(base?.disposition || '2+3');
  const [nombreRangees, setNombreRangees] = useState(base?.nombreRangees || '13');
  const [climatisation, setClimatisation] = useState(base?.climatisation ?? true);
  const [prisesUsb, setPrisesUsb] = useState(base?.prisesUsb ?? true);
  const [wifi, setWifi] = useState(base?.wifi ?? true);
  const [siegesInclinables, setSiegesInclinables] = useState(base?.siegesInclinables ?? true);
  const [supplementPremium, setSupplementPremium] = useState(base?.supplementPremium || '1000');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [succes, setSucces] = useState('');

  const [modeMarquage, setModeMarquage] = useState<Categorie | null>(null);
  const [siegesToilettes, setSiegesToilettes] = useState<Set<string>>(new Set());
  const [siegesAbimes, setSiegesAbimes] = useState<Set<string>>(new Set());
  const [siegesPorte, setSiegesPorte] = useState<Set<string>>(new Set());
  const [siegesPremium, setSiegesPremium] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeBus === 'standard') {
      setSiegesPremium(new Set());
      if (modeMarquage === 'premium') setModeMarquage(null);
      setSucces(t.standardBlocked);
      const timeout = window.setTimeout(() => setSucces(''), 2200);
      return () => window.clearTimeout(timeout);
    }
    if (typeBus === 'vip') {
      setSiegesPremium(new Set());
      if (modeMarquage === 'premium') setModeMarquage(null);
    }
  }, [typeBus, modeMarquage, t.standardBlocked]);

  const schema = SCHEMAS_DISPOSITION[disposition];
  const [placesGauche] = disposition.split('+').map(Number);
  const nbRangees = Number(nombreRangees) || 0;
  const totalPlaces = nbRangees * schema.length;

  function categorieDe(numero: string): Categorie | null {
    if (siegesToilettes.has(numero)) return 'toilettes';
    if (siegesAbimes.has(numero)) return 'abime';
    if (siegesPorte.has(numero)) return 'porte';
    if (typeBus === 'mixte' && siegesPremium.has(numero)) return 'premium';
    return null;
  }

  function toggleSiege(numero: string) {
    if (!modeMarquage) return;
    if (modeMarquage === 'premium' && typeBus !== 'mixte') return;
    const setters: Record<Categorie, [Set<string>, (s: Set<string>) => void]> = {
      toilettes: [siegesToilettes, setSiegesToilettes],
      abime: [siegesAbimes, setSiegesAbimes],
      porte: [siegesPorte, setSiegesPorte],
      premium: [siegesPremium, setSiegesPremium],
    };
    const [current, setCurrent] = setters[modeMarquage];
    const copie = new Set(current);
    if (copie.has(numero)) copie.delete(numero);
    else {
      (['toilettes', 'abime', 'porte', 'premium'] as Categorie[]).forEach((c) => {
        if (c !== modeMarquage) {
          const autreSet = new Set(setters[c][0]);
          autreSet.delete(numero);
          setters[c][1](autreSet);
        }
      });
      copie.add(numero);
    }
    setCurrent(copie);
  }

  const styleCategorie: Record<Categorie, string> = {
    toilettes: 'bg-ink-soft text-white',
    abime: 'bg-red text-white',
    porte: 'bg-purple text-white',
    premium: 'bg-amber text-ink',
  };

  function couleurSiege(numero: string): string {
    const cat = categorieDe(numero);
    if (cat) return styleCategorie[cat];
    if (typeBus === 'vip') return 'bg-green-700/15 text-green-700 border border-green-700/30';
    return 'bg-paper border border-line text-ink-soft';
  }

  const equipements = useMemo(() => ([
    { label: 'Climatisation', value: climatisation, setValue: setClimatisation, icone: '❄️' },
    { label: 'Prises USB', value: prisesUsb, setValue: setPrisesUsb, icone: '🔌' },
    { label: 'WiFi', value: wifi, setValue: setWifi, icone: '📶' },
    { label: 'Sieges inclinables', value: siegesInclinables, setValue: setSiegesInclinables, icone: '💺' },
  ]), [climatisation, prisesUsb, wifi, siegesInclinables]);

  const modes = [
    { valeur: 'toilettes' as const, label: t.toilets, icone: '🚻' },
    { valeur: 'abime' as const, label: t.damaged, icone: '❌' },
    { valeur: 'porte' as const, label: t.doorArea, icone: '🚪' },
    { valeur: 'premium' as const, label: t.premium, icone: '⭐', disabled: typeBus !== 'mixte' },
  ];

  async function creerBus(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces('');
    if (!nom.trim() || !nombreRangees) {
      setErreur(t.required);
      return;
    }
    setEnregistrement(true);
    if (isEdition) {
      // Aucune route PUT de modification n'existe côté backend — reste démo.
      setTimeout(() => {
        setEnregistrement(false);
        setSucces(t.updated);
      }, 900);
      return;
    }
    try {
      await apiFetch('/api/bus', {
        method: 'POST',
        body: JSON.stringify({
          nom,
          type_bus: typeBus,
          disposition,
          nombre_rangees: Number(nombreRangees),
          toilettes: siegesToilettes.size > 0,
          climatisation,
          prises_usb: prisesUsb,
          wifi,
          sieges_inclinables: siegesInclinables,
          supplement_premium: typeBus === 'mixte' ? Number(supplementPremium) : null,
        }),
      });
      setSucces(t.created);
      router.push('/flotte');
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur de création');
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <LayoutAgence>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-[28px] font-extrabold text-ink">{isEdition ? t.editBus : t.newBus}</h1>
            <p className="text-[13px] text-ink-soft mt-1">{t.config}</p>
          </div>
          <Link href="/flotte" className="rounded-xl bg-off-white text-ink font-bold text-[13px] px-5 py-3">{t.backFleet}</Link>
        </div>

        <form onSubmit={creerBus} className="grid lg:grid-cols-[minmax(360px,0.86fr)_minmax(420px,1.14fr)] gap-6 items-start">
          <div className="bg-paper rounded-3xl border border-line p-6 space-y-5">
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1.5">{t.busName}</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} className="w-full rounded-xl px-4 py-3 text-[13px]" placeholder="Confort Express 04" />
            </div>

            <div className="grid grid-cols-1 gap-3">
              {typesBus.map((type) => (
                <button type="button" key={type.valeur} onClick={() => setTypeBus(type.valeur)} className={`w-full rounded-xl border px-4 py-3 text-left text-[13px] ${typeBus === type.valeur ? 'border-green-700 bg-green-700/8 text-green-700 font-bold' : 'border-line text-ink-soft'}`}>{type.libelle}</button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1.5">{t.layout}</label>
                <select value={disposition} onChange={(e) => setDisposition(e.target.value as keyof typeof SCHEMAS_DISPOSITION)} className="w-full rounded-xl px-4 py-3 text-[13px]">
                  {dispositions.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1.5">{t.rows}</label>
                <input value={nombreRangees} onChange={(e) => setNombreRangees(e.target.value)} type="number" min="1" className="w-full rounded-xl px-4 py-3 text-[13px]" />
              </div>
            </div>

            <div>
              <p className="text-[12px] font-bold text-ink-soft mb-3">{t.equipment}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {equipements.map((item) => (
                  <button key={item.label} type="button" onClick={() => item.setValue(!item.value)} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left min-w-0 overflow-hidden ${item.value ? 'border-green-700 bg-green-700/8' : 'border-line bg-off-white'}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-lg shrink-0">{item.icone}</span>
                      <span className="text-[13px] font-semibold text-ink leading-tight break-words">{item.label}</span>
                    </div>
                    <span className={`inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${item.value ? 'bg-green-700' : 'bg-line'}`}><span className={`h-5 w-5 rounded-full bg-paper shadow-sm transition-transform ${item.value ? 'translate-x-5' : 'translate-x-0.5'}`} /></span>
                  </button>
                ))}
              </div>
            </div>

            {typeBus === 'mixte' && (
              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1.5">{t.premiumSupplement}</label>
                <input value={supplementPremium} onChange={(e) => setSupplementPremium(e.target.value)} type="number" className="w-full rounded-xl px-4 py-3 text-[13px]" />
              </div>
            )}

            {erreur && <p className="text-[12px] text-red">{erreur}</p>}
            {succes && <p className="text-[12px] text-green-700">{succes}</p>}

            <div className="flex gap-3 pt-2 flex-wrap">
              <Link href="/flotte" className="flex-1 min-w-[180px] text-center rounded-xl bg-off-white text-ink font-bold text-[13px] px-5 py-3">{t.cancel}</Link>
              <button disabled={enregistrement} className="flex-1 min-w-[180px] rounded-xl bg-green-700 hover:bg-green-900 disabled:opacity-60 text-white font-bold text-[13px] px-5 py-3">{enregistrement ? t.saving : isEdition ? t.save : t.create}</button>
            </div>
          </div>

          <div className="bg-paper rounded-3xl border border-line p-6 lg:sticky lg:top-6">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div>
                <p className="text-[18px] font-extrabold text-ink">{t.seatPlan}</p>
                <p className="text-[12px] text-ink-soft">{t.seatPlanText}</p>
              </div>
              <p className="text-[12px] text-ink-soft">{totalPlaces} {t.totalSeats}</p>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {modes.map((m) => (
                <button
                  key={m.valeur}
                  type="button"
                  disabled={m.disabled}
                  onClick={() => !m.disabled && setModeMarquage(m.valeur === modeMarquage ? null : m.valeur)}
                  className={`rounded-xl px-3 py-2 text-[12px] font-bold border min-h-[42px] ${m.disabled ? 'border-line bg-off-white text-ink-soft cursor-not-allowed' : modeMarquage === m.valeur ? 'border-ink bg-ink text-white' : 'border-line bg-off-white text-ink-soft'}`}
                >
                  <span className="inline-flex items-center gap-1.5 whitespace-normal text-left">{m.icone} <span>{m.label}</span></span>
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-line p-5 overflow-x-auto">
              <div className="min-w-[420px] space-y-3">
                {Array.from({ length: nbRangees }).map((_, indexRangee) => (
                  <div key={indexRangee} className="flex items-center gap-4">
                    <span className="w-7 text-[12px] text-ink-soft font-semibold text-right">{indexRangee + 1}</span>
                    <div className="flex items-center gap-3">
                      {schema.map((_, seatIndex) => {
                        const numero = `${indexRangee + 1}${LETTRES[seatIndex]}`;
                        const isAisle = seatIndex === placesGauche - 1 && seatIndex < schema.length - 1;
                        return (
                          <div key={numero} className="flex items-center gap-3">
                            <button type="button" onClick={() => toggleSiege(numero)} className={`w-12 h-12 rounded-xl text-[13px] font-semibold ${couleurSiege(numero)}`}>{numero}</button>
                            {isAisle && <div className="w-4" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>
      </div>
    </LayoutAgence>
  );
}
