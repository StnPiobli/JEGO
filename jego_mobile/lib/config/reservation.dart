/// Donnees de la reservation en cours, transportees dans tout le tunnel.
/// Prix FICTIFS (demo) — a remplacer par parametres_systeme au branchement.
class Reservation {
  Map<String, dynamic> offreAller;
  Map<String, dynamic>? offreRetour;
  int passagers;

  List<int> siegesAller;
  List<int> siegesRetour;
  bool autoAller;
  bool autoRetour;
  int supplementsAller; // frais de siege deja calcules (choix + premium)
  int supplementsRetour;

  // Options PAR VOYAGEUR (listes de taille = passagers)
  List<int> bagagesAller;
  List<int> bagagesRetour;
  List<bool> flexibleAller;
  List<bool> flexibleRetour;

  // Cadeau PAR BILLET (listes de taille = passagers, aller et retour separes)
  List<bool> cadeauAller;
  List<String> cadeauNomAller;
  List<String> cadeauTelAller;
  List<bool> cadeauRetour;
  List<String> cadeauNomRetour;
  List<String> cadeauTelRetour;

  // Points JEGO (global)
  int pointsReduction; // reduction en FCFA appliquee
  int pointsConsommes; // nb de points utilises

  // Villes et dates (pour l'affichage du billet)
  String villeAllerDepart;
  String villeAllerArrivee;
  String dateAllerAffichee;
  String dateRetourAffichee;

  Reservation({
    required this.offreAller,
    this.offreRetour,
    required this.passagers,
    this.siegesAller = const [],
    this.siegesRetour = const [],
    this.autoAller = false,
    this.autoRetour = false,
    this.supplementsAller = 0,
    this.supplementsRetour = 0,
    List<int>? bagagesAller,
    List<int>? bagagesRetour,
    List<bool>? flexibleAller,
    List<bool>? flexibleRetour,
    List<bool>? cadeauAller,
    List<String>? cadeauNomAller,
    List<String>? cadeauTelAller,
    List<bool>? cadeauRetour,
    List<String>? cadeauNomRetour,
    List<String>? cadeauTelRetour,
    this.pointsReduction = 0,
    this.pointsConsommes = 0,
    this.villeAllerDepart = '',
    this.villeAllerArrivee = '',
    this.dateAllerAffichee = '',
    this.dateRetourAffichee = '',
  })  : bagagesAller = bagagesAller ?? List.filled(passagers, 0),
        bagagesRetour = bagagesRetour ?? List.filled(passagers, 0),
        flexibleAller = flexibleAller ?? List.filled(passagers, false),
        flexibleRetour = flexibleRetour ?? List.filled(passagers, false),
        cadeauAller = cadeauAller ?? List.filled(passagers, false),
        cadeauNomAller = cadeauNomAller ?? List.filled(passagers, ''),
        cadeauTelAller = cadeauTelAller ?? List.filled(passagers, ''),
        cadeauRetour = cadeauRetour ?? List.filled(passagers, false),
        cadeauNomRetour = cadeauNomRetour ?? List.filled(passagers, ''),
        cadeauTelRetour = cadeauTelRetour ?? List.filled(passagers, '');

  bool get estAllerRetour => offreRetour != null;

  /// Numero de reservation court, sert a recuperer le billet ailleurs.
  static String genererNumero() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final ms = DateTime.now().microsecondsSinceEpoch;
    var n = ms;
    final buf = StringBuffer('JEGO-');
    for (var i = 0; i < 6; i++) {
      buf.write(chars[n % chars.length]);
      n = n ~/ chars.length + i * 7;
    }
    return buf.toString();
  }

  // Prix FICTIFS (demo)
  static const int prixBagage = 1000; // FCFA / bagage supp -> agence
  static const double tauxFlexible = 0.10;
  static const int pointsDisponibles = 1200; // solde demo du voyageur

  int get prixBilletsAller => (offreAller['prix'] as int) * passagers;
  int get prixBilletsRetour =>
      offreRetour == null ? 0 : (offreRetour!['prix'] as int) * passagers;

  int get totalBagagesAller => bagagesAller.fold<int>(0, (s, b) => s + b);
  int get totalBagagesRetour =>
      bagagesRetour.fold<int>(0, (s, b) => s + b);

  int get coutBagages =>
      (totalBagagesAller + totalBagagesRetour) * prixBagage;

  int get coutFlexible {
    var t = 0;
    final prixUnitAller = offreAller['prix'] as int;
    for (final f in flexibleAller) {
      if (f) t += (prixUnitAller * tauxFlexible).round();
    }
    if (offreRetour != null) {
      final prixUnitRetour = offreRetour!['prix'] as int;
      for (final f in flexibleRetour) {
        if (f) t += (prixUnitRetour * tauxFlexible).round();
      }
    }
    return t;
  }

  int get sousTotal =>
      prixBilletsAller +
      prixBilletsRetour +
      supplementsAller +
      supplementsRetour +
      coutBagages +
      coutFlexible;

  int get total {
    final t = sousTotal - pointsReduction;
    return t < 0 ? 0 : t;
  }
}