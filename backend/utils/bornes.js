// ═══════════════════════════════════════════════════
// BORNES DES VALEURS SAISIES (prix, rangées…)
//
// Un simple « la valeur est-elle remplie ? » laissait passer un prix de
// -5 000 FCFA (billet à total négatif) ou un bus de 100 000 rangées (une
// requête SQL par siège, la base saturée). Chaque nombre saisi est donc
// un entier dans une plage réaliste.
// ═══════════════════════════════════════════════════
const BORNES = {
  prix_base: { min: 100, max: 500000, libelle: 'Le prix du billet' },
  prix_bagage_supplementaire: { min: 0, max: 100000, libelle: 'Le prix du bagage supplémentaire' },
  supplement_premium: { min: 0, max: 100000, libelle: 'Le supplément siège premium' },
  nombre_rangees: { min: 1, max: 30, libelle: 'Le nombre de rangées' },
};

/**
 * Renvoie null si la valeur est un entier dans la plage, sinon le message
 * d'erreur à afficher. Une valeur absente (undefined/null/'') est
 * acceptée quand `facultatif` est vrai.
 */
function verifierBorne(nom, valeur, facultatif = false) {
  const b = BORNES[nom];
  if (valeur === undefined || valeur === null || valeur === '') {
    return facultatif ? null : `${b.libelle} est obligatoire.`;
  }
  const n = Number(valeur);
  if (!Number.isInteger(n) || n < b.min || n > b.max) {
    return `${b.libelle} doit être un nombre entier entre ${b.min.toLocaleString('fr-FR')} et ${b.max.toLocaleString('fr-FR')}.`;
  }
  return null;
}

module.exports = { verifierBorne, BORNES };
