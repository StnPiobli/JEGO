/// Configuration centrale de l'API JEGO.
class ApiConfig {
  /// true = donnees fictives locales, aucun appel reseau.
  /// false = appels reels vers le backend (branchement ulterieur).
  static const bool modeDemo = true;

  static const String baseUrl = 'http://10.0.2.2:3000';

  // ---- ROUTES — a remplir au moment du branchement ----
  static const String rechercheTrajets = '$baseUrl/api/trajets/recherche';
  static const String profilAgence = '$baseUrl/api/agences'; // + /:id
  static const String inscription = '$baseUrl/api/auth/inscription';
  static const String connexion = '$baseUrl/api/auth/connexion';
}