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

// Date au format AAAA-MM-JJ dans le fuseau LOCAL.
//
// `toISOString()` convertit d'abord en UTC : a Douala (UTC+1/+2), le
// 21 aout a minuit devient le 20 aout a 22h UTC, et la page demandait
// au serveur les trajets de la veille -- « Aucun trajet pour cette
// date » alors que l'agence en voyait trois.
export function dateISOLocale(d: Date): string {
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}
