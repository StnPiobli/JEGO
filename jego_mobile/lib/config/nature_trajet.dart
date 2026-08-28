import '../l10n/strings.dart';

/// Ce qu'un trajet est, en langage de voyageur.
///
/// La base ne stocke qu'une chose : `categorie`, recopiee du type de bus
/// (standard / vip / mixte). « Nuit » et « express » ne sont stockes
/// nulle part, alors que les filtres de recherche les proposent.
///
/// Ces deux notions se deduisent de donnees bien reelles : l'heure de
/// depart et le nombre d'arrets. agence_web et admin_web les calculent
/// deja de cette facon a l'affichage ; ce fichier reprend leurs regles
/// a l'identique pour que les trois surfaces disent la meme chose.
class NatureTrajet {
  /// Seuils repris tels quels d'agence_web et d'admin_web, ou la regle
  /// est deja en place. Un meme trajet doit porter l'etiquette « Nuit »
  /// pour l'agence et pour le voyageur, sinon les deux ne parlent plus
  /// du meme voyage.
  static const int heureDebutNuit = 22;
  static const int heureFinNuit = 3;

  static int _heureDepart(Map<String, dynamic> offre) {
    final brut = '${offre['heure_depart'] ?? ''}';
    final h = int.tryParse(brut.split(':').first);
    return (h != null && h >= 0 && h < 24) ? h : -1;
  }

  static bool estDeNuit(Map<String, dynamic> offre) {
    final h = _heureDepart(offre);
    if (h < 0) return false;
    return h >= heureDebutNuit || h < heureFinNuit;
  }

  /// Express = sans arret intermediaire. Le bus part et arrive, rien
  /// entre les deux : c'est le trajet le plus rapide de la ligne.
  /// Express = aucun arret intermediaire sur le troncon achete. En
  /// l'absence d'information, on ne dit rien : mieux vaut une etiquette
  /// manquante qu'une etiquette fausse sur un trajet qui s'arrete
  /// quatre fois.
  static bool estExpress(Map<String, dynamic> offre) {
    final n = int.tryParse('${offre['nombre_arrets'] ?? ''}');
    if (n != null) return n == 0;
    final liste = offre['arrets_liste'];
    if (liste is List) return liste.isEmpty;
    return false;
  }

  /// Classe du bus : Standard, Mixte ou VIP. Derivee de la composition
  /// des sieges, jamais saisie par l'agence.
  static String? classe(Map<String, dynamic> offre) {
    switch ('${offre['categorie'] ?? ''}'.toLowerCase()) {
      case 'vip':
        return Strings.t('cat_vip');
      case 'mixte':
        return Strings.t('cat_mixte');
      case 'standard':
        return Strings.t('cat_standard');
      default:
        return null;
    }
  }

  /// Toutes les etiquettes a afficher, dans l'ordre d'importance.
  static List<String> etiquettes(Map<String, dynamic> offre) {
    final e = <String>[];
    if (estDeNuit(offre)) e.add(Strings.t('cat_nuit'));
    if (estExpress(offre)) e.add(Strings.t('cat_express'));
    final c = classe(offre);
    if (c != null) e.add(c);
    return e;
  }

  /// Vrai si le trajet repond au filtre demande ('nuit', 'express',
  /// 'vip', 'standard'). Sert a rendre les filtres de recherche
  /// reellement operants.
  static bool correspondAuFiltre(Map<String, dynamic> offre, String filtre) {
    switch (filtre.toLowerCase()) {
      case 'nuit':
        return estDeNuit(offre);
      case 'express':
        return estExpress(offre);
      default:
        return '${offre['categorie'] ?? ''}'.toLowerCase() ==
            filtre.toLowerCase();
    }
  }
}
