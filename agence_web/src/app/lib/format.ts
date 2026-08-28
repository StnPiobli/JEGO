// Formatage uniforme des numéros de téléphone pour tout l'espace agence.
// Cameroun par défaut : tout numéro sans indicatif reçoit "+237".
// Un numéro qui a déjà un indicatif étranger (+33, +234…) est conservé.
// Résultat toujours de la forme "+237 6XXXXXXXX" (indicatif + espace).
export function formatTelephone(tel?: string | null): string {
  if (tel === undefined || tel === null) return "—";
  const brut = String(tel).trim();
  if (brut === "") return "—";

  const avaitPlus = brut.startsWith("+");
  // On retire espaces, points et le "+" pour raisonner sur les chiffres.
  let chiffres = brut.replace(/[\s.]/g, "");
  if (avaitPlus) chiffres = chiffres.slice(1);
  // 00237… (préfixe international) -> 237…
  if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);

  if (chiffres.startsWith("237")) return "+237 " + chiffres.slice(3);
  // Indicatif étranger explicite : on le garde tel quel.
  if (avaitPlus) return "+" + chiffres;
  // Pas d'indicatif du tout : Cameroun par défaut.
  return "+237 " + chiffres;
}
