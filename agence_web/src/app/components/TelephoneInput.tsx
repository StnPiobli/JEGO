'use client';
// Champ téléphone avec indicatif pays séparé, prédéfini, Cameroun par défaut.

const INDICATIFS = [
  { code: '+237', pays: 'Cameroun' },
  { code: '+235', pays: 'Tchad' },
  { code: '+236', pays: 'Centrafrique' },
  { code: '+241', pays: 'Gabon' },
  { code: '+240', pays: 'Guinée équatoriale' },
  { code: '+242', pays: 'Congo' },
  { code: '+243', pays: 'RD Congo' },
  { code: '+234', pays: 'Nigeria' },
  { code: '+233', pays: 'Ghana' },
  { code: '+225', pays: "Côte d'Ivoire" },
  { code: '+221', pays: 'Sénégal' },
  { code: '+33', pays: 'France' },
  { code: '+1', pays: 'USA/Canada' },
];

export function decomposerTelephone(telephoneComplet: string): { indicatif: string; numero: string } {
  const trouve = INDICATIFS.find((i) => telephoneComplet.trim().startsWith(i.code));
  if (trouve) return { indicatif: trouve.code, numero: telephoneComplet.trim().slice(trouve.code.length).trim() };
  return { indicatif: '+237', numero: telephoneComplet.trim() };
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
  return (
    <div className="flex gap-2">
      <select
        value={indicatif}
        onChange={(e) => onChangeIndicatif(e.target.value)}
        className="rounded-xl border border-line bg-off-white px-2 py-3 text-[12px] font-bold text-ink w-[92px] shrink-0"
      >
        {INDICATIFS.map((i) => (
          <option key={i.code} value={i.code}>{i.code} {i.pays}</option>
        ))}
      </select>
      <input
        value={numero}
        onChange={(e) => onChangeNumero(e.target.value.replace(/[^\d\s]/g, ''))}
        placeholder={placeholder}
        className="flex-1 rounded-xl border border-line bg-off-white px-4 py-3 text-[13px] min-w-0"
      />
    </div>
  );
}
