import 'api.dart';

/// Tarifs et règles affichés avant le paiement, lus sur le serveur au
/// démarrage. Ce sont les réglages que le serveur applique : si l'admin
/// change le prix d'une option, l'écran affiche le nouveau prix. Les
/// valeurs ci-dessous ne servent que tant que le serveur n'a pas répondu.
class Tarifs {
  static int choixSiege = 500;
  static int optionFlexiblePourcent = 10;
  static int flexibleDelaiHeures = 24;
  static int flexibleAvantDelaiPourcent = 80;
  static int flexibleApresDelaiPourcent = 50;
  static int retardSeuilHeures = 4;
  static int retardPoints = 500;
  static int pointsPar1000 = 10;
  static int palierReductionPoints = 500;
  static int palierReductionFcfa = 500;
  static int palierGratuitPoints = 1000;

  static Future<void> charger() async {
    try {
      final t = await ApiService.tarifs();
      int lire(String cle, int defaut) => int.tryParse('${t[cle]}') ?? defaut;
      choixSiege = lire('option_choix_siege_fcfa', choixSiege);
      optionFlexiblePourcent = lire('option_flexible_pourcent', optionFlexiblePourcent);
      flexibleDelaiHeures = lire('flexible_delai_heures', flexibleDelaiHeures);
      flexibleAvantDelaiPourcent =
          lire('flexible_remboursement_avant_delai_pourcent', flexibleAvantDelaiPourcent);
      flexibleApresDelaiPourcent =
          lire('flexible_remboursement_apres_delai_pourcent', flexibleApresDelaiPourcent);
      retardSeuilHeures = lire('retard_seuil_compensation_heures', retardSeuilHeures);
      retardPoints = lire('retard_points_compensation', retardPoints);
      pointsPar1000 = lire('points_par_1000_fcfa', pointsPar1000);
      palierReductionPoints = lire('points_palier_reduction_points', palierReductionPoints);
      palierReductionFcfa = lire('points_palier_reduction_fcfa', palierReductionFcfa);
      palierGratuitPoints = lire('points_palier_gratuit_points', palierGratuitPoints);
    } catch (_) {
      // Hors ligne : les valeurs par défaut, le serveur fera foi au paiement.
    }
  }

  /// Remplace les repères {…} des textes par les vraies valeurs.
  static String remplir(String texte) {
    if (!texte.contains('{')) return texte;
    return texte
        .replaceAll('{flex_delai}', '$flexibleDelaiHeures')
        .replaceAll('{flex_avant}', '$flexibleAvantDelaiPourcent')
        .replaceAll('{flex_apres}', '$flexibleApresDelaiPourcent')
        .replaceAll('{flex_option}', '$optionFlexiblePourcent')
        .replaceAll('{palier_points}', '$palierReductionPoints')
        .replaceAll('{palier_gratuit}', '$palierGratuitPoints');
  }
}
