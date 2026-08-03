// ⚠️ DEMO PARTAGÉE — utilisée par la liste des trajets ET le plan des
// sièges, pour que les tronçons/prix soient cohérents entre les deux pages.
//
// Chaque combinaison origine→destination a son PROPRE prix, fixé
// librement par l'agence — ce n'est PAS la somme des tronçons adjacents
// (l'agence peut faire un tarif dégressif sur la longue distance, ou
// l'inverse). Pour n points sur la ligne, il y a n*(n-1)/2 combinaisons
// possibles au total.

export type CombinaisonPrix = { depart: string; arrivee: string; prix: number };

export type TrajetDemoAvecArrets = {
  id: string;
  numeroVoyage: string;
  points: string[]; // [villeDepart, ...arrets, villeArrivee], dans l'ordre du trajet
  prixCombinaisons: CombinaisonPrix[]; // une entrée par paire (depart, arrivee) possible, prix indépendant
};

export const trajetsDemoAvecArrets: TrajetDemoAvecArrets[] = [
  {
    id: '1', numeroVoyage: 'JG-260727-0700-DLYDE',
    points: ['Douala', 'Loum', 'Pouma', 'Yaounde'],
    prixCombinaisons: [
      { depart: 'Douala', arrivee: 'Loum', prix: 1200 },
      { depart: 'Douala', arrivee: 'Pouma', prix: 2000 },
      { depart: 'Douala', arrivee: 'Yaounde', prix: 3720 },
      { depart: 'Loum', arrivee: 'Pouma', prix: 1000 },
      { depart: 'Loum', arrivee: 'Yaounde', prix: 2600 },
      { depart: 'Pouma', arrivee: 'Yaounde', prix: 1800 },
    ],
  },
  {
    id: '2', numeroVoyage: 'JG-260727-1400-YDE-DLA',
    points: ['Yaounde', 'Douala'],
    prixCombinaisons: [{ depart: 'Yaounde', arrivee: 'Douala', prix: 3500 }],
  },
  {
    id: '3', numeroVoyage: 'JG-260728-0630-DLA-BFM',
    points: ['Douala', 'Bafoussam'],
    prixCombinaisons: [{ depart: 'Douala', arrivee: 'Bafoussam', prix: 4200 }],
  },
  {
    id: '4', numeroVoyage: 'JG-260726-1830-KBI-DLA',
    points: ['Kribi', 'Douala'],
    prixCombinaisons: [{ depart: 'Kribi', arrivee: 'Douala', prix: 3200 }],
  },
];

/** Génère toutes les combinaisons possibles (n*(n-1)/2) à partir d'une liste de points ordonnés. */
export function genererToutesLesCombinaisons(points: string[]): { depart: string; arrivee: string }[] {
  const resultats: { depart: string; arrivee: string }[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      resultats.push({ depart: points[i], arrivee: points[j] });
    }
  }
  return resultats;
}

/** Sous-trajets vendables pour un trajet démo donné, avec leur prix propre. */
export function tousLesSousTrajets(t: TrajetDemoAvecArrets): { label: string; prix: number }[] {
  return t.prixCombinaisons.map((c) => ({ label: `${c.depart} → ${c.arrivee}`, prix: c.prix }));
}
