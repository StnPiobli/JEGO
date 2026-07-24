/// Donnees demo du trajet du jour et des billets attendus dessus.
/// DEMO : liste fixe en memoire -- au branchement, ceci viendra du
/// telechargement matinal des billets du trajet (voir cahier des
/// charges 8.2 : "Connexion matin -> Telechargement billets -> Scan
/// offline -> Resultat immediat -> Sync reseau").
class DonneesDemoChauffeur {
  static const trajetDuJour = {
    'ville_depart': 'Douala',
    'ville_arrivee': 'Yaounde',
    'heure_depart': '07:00',
    'bus': 'Confort 01',
    'total_passagers': 29,
  };

  /// Codes valides non encore scannes -- retires de cette liste et
  /// ajoutes a [codesDejaScannes] au premier scan reussi.
  static final Set<String> codesValides = {
    'JEGO-A1B2C3',
    'JEGO-D4E5F6',
    'JEGO-G7H8I9',
  };

  static final Map<String, String> nomsParCode = {
    'JEGO-A1B2C3': 'Jean Dupont — Siege 5A',
    'JEGO-D4E5F6': 'Marie Fotso — Siege 12B',
    'JEGO-G7H8I9': 'Paul Nkeng — Siege 3C',
  };

  static final Set<String> codesDejaScannes = {};

  /// Renvoie 'valide', 'deja_scanne' ou 'invalide'.
  static String verifier(String code) {
    if (codesDejaScannes.contains(code)) return 'deja_scanne';
    if (codesValides.contains(code)) {
      codesValides.remove(code);
      codesDejaScannes.add(code);
      return 'valide';
    }
    return 'invalide';
  }
}