/// Registre des comptes chauffeur. Sans serveur backend dans cette
/// session, ce registre vit ici -- au branchement, il sera remplace par
/// une vraie table "chauffeurs" en base, alimentee uniquement par les
/// agences (jamais par auto-inscription).
const Map<String, Map<String, String>> comptesChauffeurs = {
  'CHF-001': {
    'motdepasse': 'chauffeur123',
    'nom': 'Paul',
    'agence': 'Finexs Voyages',
  },
};

bool estCompteChauffeur(String identifiant) => comptesChauffeurs.containsKey(identifiant);

bool motDePasseChauffeurValide(String identifiant, String motDePasse) {
  final compte = comptesChauffeurs[identifiant];
  return compte != null && compte['motdepasse'] == motDePasse;
}