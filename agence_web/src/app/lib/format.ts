import { separerTelephone, grouperNumero } from "./pays";

// Formatage uniforme des numéros de téléphone.
// Tous les indicatifs du monde sont reconnus (lib/pays.ts, même liste que
// l'application mobile) ; un numéro sans indicatif est camerounais.
// Résultat : indicatif, espace, numéro groupé — « +237 6 53 53 53 53 ».
export function formatTelephone(tel?: string | null): string {
  if (tel === undefined || tel === null) return "—";
  const brut = String(tel).trim();
  if (brut === "") return "—";
  const { pays, numero } = separerTelephone(brut);
  return `${pays.indicatif} ${grouperNumero(numero)}`;
}
