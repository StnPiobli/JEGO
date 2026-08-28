import 'session.dart';

/// Données de la réservation en cours, transportées dans tout le
/// tunnel d'achat.
///
/// Les montants affichés ici servent à informer le voyageur pendant
/// le parcours ; le montant qui fait foi est celui calculé par le
/// backend au moment du paiement.
class Reservation {
  Map<String, dynamic> offreAller;
  Map<String, dynamic>? offreRetour;
  int passagers;

  /// Numéros de sièges : du TEXTE (« 1A », « 10B »), jamais des entiers.
  List<String> siegesAller;
  List<String> siegesRetour;
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

  /// Identifiants serveur des sièges choisis (numéro affiché -> UUID).
  /// Le backend raisonne en UUID, l'interface en numéros de siège.
  Map<String, String> idSiegesAller;
  Map<String, String> idSiegesRetour;

  /// Billets reellement emis par le serveur, indexes par numero de
  /// siege. Contient le vrai numero (BIL-XXXXX-XXXXX) et le QR signe.
  /// Rempli au paiement : avant, il n'y a pas de billet.
  Map<String, Map<String, dynamic>> billetsEmis = {};

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
    Map<String, String>? idSiegesAller,
    Map<String, String>? idSiegesRetour,
    this.villeAllerDepart = '',
    this.villeAllerArrivee = '',
    this.dateAllerAffichee = '',
    this.dateRetourAffichee = '',
  })  : idSiegesAller = idSiegesAller ?? <String, String>{},
        idSiegesRetour = idSiegesRetour ?? <String, String>{},
        bagagesAller = bagagesAller ?? List.filled(passagers, 0),
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


  // Barème indicatif affiché pendant le parcours. Le montant qui
  // fait foi est celui calculé par le serveur au paiement.
  static const int prixBagage = 1000; // FCFA / bagage supp -> agence
  static const double tauxFlexible = 0.10;
  /// Solde réel de points JEGO du voyageur connecté, renvoyé par le
  /// serveur à la connexion. Aucun solde n'est inventé : un compte
  /// neuf démarre naturellement à zéro.
  static int get pointsDisponibles => Session.pointsFidelite;

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