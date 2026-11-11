'use client';
// Champ téléphone avec indicatif pays séparé, Cameroun par défaut.
//
// Tous les pays, par ordre alphabétique, avec une recherche par nom ou
// par indicatif — la même liste que l'application mobile (lib/pays.ts).

import { useEffect, useMemo, useRef, useState } from 'react';
import { PAYS, CAMEROUN, sansAccent, separerTelephone, grouperNumero, urlDrapeau, type Pays } from '../lib/pays';

export function decomposerTelephone(telephoneComplet: string): { indicatif: string; numero: string } {
  if (!telephoneComplet || !telephoneComplet.trim()) return { indicatif: CAMEROUN.indicatif, numero: '' };
  const { pays, numero } = separerTelephone(telephoneComplet);
  return { indicatif: pays.indicatif, numero: grouperNumero(numero) };
}

function Drapeau({ code }: { code: string }) {
  const [erreur, setErreur] = useState(false);
  if (erreur) {
    return <span className="w-[22px] h-[15px] rounded-[3px] bg-line text-[8px] font-bold text-ink-soft flex items-center justify-center shrink-0">{code}</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={urlDrapeau(code)} alt="" width={22} height={15} onError={() => setErreur(true)} className="w-[22px] h-[15px] rounded-[3px] object-cover border border-black/10 shrink-0" />;
}

export default function TelephoneInput({
  indicatif,
  numero,
  onChangeIndicatif,
  onChangeNumero,
  placeholder = '6XX XX XX XX',
}: {
  indicatif: string;
  numero: string;
  onChangeIndicatif: (v: string) => void;
  onChangeNumero: (v: string) => void;
  placeholder?: string;
}) {
  // Le code ISO est gardé à part : +1 est partagé par les États-Unis et le
  // Canada, l'indicatif seul ne dit pas lequel a été choisi.
  const [code, setCode] = useState<string>(() => separerTelephone(indicatif).pays.code);
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState('');
  const boite = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const actuel = PAYS.find((p) => p.code === code);
    if (actuel?.indicatif !== indicatif) setCode(separerTelephone(indicatif).pays.code);
  }, [indicatif, code]);

  // Clic en dehors : la liste se referme.
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [ouvert]);

  const pays = PAYS.find((p) => p.code === code) ?? CAMEROUN;

  const affiches = useMemo(() => {
    const q = sansAccent(recherche.trim());
    if (!q) return PAYS;
    const chiffres = q.replace(/\D/g, '');
    return PAYS.filter((p) => sansAccent(p.nom).includes(q) || (chiffres !== '' && p.indicatif.slice(1).startsWith(chiffres)));
  }, [recherche]);

  function choisir(p: Pays) {
    setCode(p.code);
    onChangeIndicatif(p.indicatif);
    setOuvert(false);
    setRecherche('');
  }

  return (
    <div className="flex gap-2 relative" ref={boite}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="rounded-xl border border-line bg-off-white px-2.5 py-3 text-[12px] font-bold text-ink shrink-0 flex items-center gap-1.5"
      >
        <Drapeau code={pays.code} />
        <span>{pays.indicatif}</span>
        <span className="text-ink-soft text-[10px]">▾</span>
      </button>
      <input
        value={numero}
        onChange={(e) => onChangeNumero(e.target.value.replace(/[^\d\s]/g, ''))}
        placeholder={placeholder}
        maxLength={pays.max + Math.ceil(pays.max / 2)}
        className="flex-1 rounded-xl border border-line bg-off-white px-4 py-3 text-[13px] min-w-0"
      />

      {ouvert && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-[300px] max-w-[90vw] rounded-xl border border-line bg-paper shadow-lg overflow-hidden">
          <div className="p-2 border-b border-line">
            <input
              autoFocus
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un pays ou un indicatif"
              className="w-full rounded-lg bg-off-white border border-line px-3 py-2 text-[12.5px]"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {affiches.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-ink-soft text-center">Aucun pays ne correspond.</p>
            ) : affiches.map((p) => {
              const actif = p.code === pays.code;
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => choisir(p)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12.5px] border-b border-line last:border-b-0 ${actif ? 'bg-green-700/10 font-bold' : 'hover:bg-off-white'}`}
                >
                  <Drapeau code={p.code} />
                  <span className="flex-1 truncate text-ink">{p.nom}</span>
                  <span className={actif ? 'text-green-700' : 'text-ink-soft'}>{p.indicatif}</span>
                  <span className="w-3 text-green-700">{actif ? '✓' : ''}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
