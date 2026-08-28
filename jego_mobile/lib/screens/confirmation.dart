import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/billets_store.dart';
import '../config/reservation.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/billet_qr.dart';
import '../config/notifs_store.dart';

/// Ecran de confirmation apres paiement valide.
/// 1 billet PAR PERSONNE, aller puis retour. Tous affiches, tous enregistres.
class EcranConfirmation extends StatefulWidget {
  final Reservation reservation;
  const EcranConfirmation({super.key, required this.reservation});

  @override
  State<EcranConfirmation> createState() => _EcranConfirmationState();
}

class _EcranConfirmationState extends State<EcranConfirmation> {
  late final List<String> _siegesAller;
  late final List<String> _siegesRetour;
  final List<Map<String, dynamic>> _billetsAller = [];
  final List<Map<String, dynamic>> _billetsRetour = [];

  Reservation get r => widget.reservation;

  /// Sièges effectivement attribués.
  ///
  /// Même en mode automatique, les places ont été choisies parmi les
  /// sièges réellement libres du bus avant le paiement : il n'y a
  /// donc plus rien à « révéler », on affiche ce qui a été payé.
  List<String> _siegesReveles(
      Map<String, dynamic> offre, List<String> choisis, bool auto) {
    return choisis;
  }

  @override
  void initState() {
    super.initState();
    _siegesAller = _siegesReveles(r.offreAller, r.siegesAller, r.autoAller);
    _siegesRetour = r.offreRetour == null
        ? <String>[]
        : _siegesReveles(r.offreRetour!, r.siegesRetour, r.autoRetour);

    final groupeAller = DateTime.now().microsecondsSinceEpoch.toString();
    for (var i = 0; i < r.passagers; i++) {
      _billetsAller.add(_billetData(
          r.offreAller, _siegesAller, r.villeAllerDepart,
          r.villeAllerArrivee, r.dateAllerAffichee,
          estRetour: false, indexPersonne: i, groupe: groupeAller));
    }
    if (r.offreRetour != null) {
      final groupeRetour = '${DateTime.now().microsecondsSinceEpoch}-r';
      for (var i = 0; i < r.passagers; i++) {
        _billetsRetour.add(_billetData(
            r.offreRetour!, _siegesRetour, r.villeAllerArrivee,
            r.villeAllerDepart, r.dateRetourAffichee,
            estRetour: true, indexPersonne: i, groupe: groupeRetour));
      }
    }

    // L'onglet Billets se remplit depuis le serveur, seule source de
    // verite. Y pousser les billets construits ici les affichait en
    // double des le rechargement suivant.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      BilletsStore.charger();
      // Le paiement vient de declencher « Billet confirme » cote
      // serveur : la cloche doit le montrer sans attendre un
      // redemarrage de l'application.
      NotifsStore.charger();
    });
  }

  Map<String, dynamic> _billetData(Map<String, dynamic> offre,
      List<String> sieges, String villeD, String villeA, String date,
      {required bool estRetour,
      required int indexPersonne,
      required String groupe}) {
    final siege = indexPersonne < sieges.length
        ? sieges[indexPersonne]
        : (sieges.isNotEmpty ? sieges.first : '');

    // Ce que le serveur a emis pour cette place.
    final emis = r.billetsEmis['$siege'] ?? const <String, dynamic>{};

    final flex = estRetour
        ? r.flexibleRetour[indexPersonne]
        : r.flexibleAller[indexPersonne];
    final bagages = estRetour
        ? r.bagagesRetour[indexPersonne]
        : r.bagagesAller[indexPersonne];
    final estCadeau = estRetour
        ? r.cadeauRetour[indexPersonne]
        : r.cadeauAller[indexPersonne];
    final cadeauNom = estRetour
        ? r.cadeauNomRetour[indexPersonne]
        : r.cadeauNomAller[indexPersonne];

    // Frais souscrits pour CE billet (ce voyageur).
    final frais = <Map<String, dynamic>>[];
    final prixBillet = offre['prix'] as int;
    frais.add({
      'libelle': Strings.t('prix_billet'),
      'montant': '$prixBillet FCFA'
    });
    final suppTotal = estRetour ? r.supplementsRetour : r.supplementsAller;
    final suppParPers = r.passagers > 0 ? suppTotal ~/ r.passagers : 0;
    if (suppParPers > 0) {
      frais.add({
        'libelle': Strings.t('recap_sieges'),
        'montant': '$suppParPers FCFA'
      });
    }
    if (bagages > 0) {
      frais.add({
        'libelle': '${Strings.t('recap_bagages')} × $bagages',
        'montant': '${bagages * Reservation.prixBagage} FCFA'
      });
    }
    if (flex) {
      frais.add({
        'libelle': Strings.t('recap_flexible'),
        'montant':
            '+${(prixBillet * Reservation.tauxFlexible).round()} FCFA'
      });
    }
    final total = frais.fold<int>(0, (s, f) {
      final m = RegExp(r'\d+')
          .allMatches('${f['montant']}')
          .map((x) => int.parse(x.group(0)!))
          .fold<int>(0, (a, b) => a + b);
      return s + m;
    });

    return {
      'id': '${offre['id']}-$groupe-$indexPersonne',
      'groupe': groupe,
      'num_resa': '${emis['numero'] ?? ''}',
      'ville_depart': villeD,
      'ville_arrivee': villeA,
      'point_depart': offre['point_depart'],
      'point_arrivee': offre['point_arrivee'],
      'heure_depart': offre['heure_depart'],
      'heure_arrivee': offre['heure_arrivee'],
      'date': date,
      'nom_agence': offre['nom_agence'],
      'categorie': offre['categorie'],
      'nombre_arrets': offre['nombre_arrets'],
      'arrets_liste': offre['arrets_liste'],
      'equipements': offre['equipements'],
      'sieges': [siege],
      'personne': indexPersonne + 1,
      'total_personnes': r.passagers,
      'flexible': flex,
      'cadeau': estCadeau,
      'cadeau_nom': cadeauNom,
      // QR signe par le serveur. Celui qui etait fabrique ici ne
      // passait aucune verification de signature : il ne scannait pas.
      'code_qr': '${emis['qr_code'] ?? ''}',
      'frais': frais,
      'total': total,
    };
  }

  @override
  Widget build(BuildContext context) {
    var delai = 300;
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 24, 18, 20),
                children: [
                  // Coche animee
                  Center(
                    child: Container(
                      width: 90,
                      height: 90,
                      decoration: BoxDecoration(
                        color: JegoTheme.vert.withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.check_circle_rounded,
                          color: JegoTheme.vert, size: 56),
                    ),
                  )
                      .animate()
                      .scale(
                          begin: const Offset(0.5, 0.5),
                          duration: 500.ms,
                          curve: Curves.easeOutBack)
                      .fadeIn(),
                  const SizedBox(height: 16),
                  Center(
                    child: Text(
                      Strings.t('confirm_titre'),
                      style: TextStyle(
                          color: JegoTheme.texte,
                          fontSize: 21,
                          fontWeight: FontWeight.w800),
                    ),
                  ).animate(delay: 150.ms).fadeIn(),
                  const SizedBox(height: 4),
                  Center(
                    child: Text(
                      '${_billetsAller.length + _billetsRetour.length} ${Strings.t('confirm_nb_billets')}',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: JegoTheme.texteSecondaire, fontSize: 13),
                    ),
                  ).animate(delay: 220.ms).fadeIn(),
                  const SizedBox(height: 24),
                  // TOUS les billets aller (1 par voyageur)
                  ..._billetsAller.asMap().entries.map((e) {
                    delai += 100;
                    final w = Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: BilletCarre(
                        etiquette: r.estAllerRetour
                            ? '${Strings.t('resultats_aller')}${r.passagers > 1 ? ' · ${Strings.t('voyageur')} ${e.key + 1}' : ''}'
                            : (r.passagers > 1
                                ? '${Strings.t('voyageur')} ${e.key + 1}'
                                : null),
                        villeDepart: e.value['ville_depart'],
                        villeArrivee: e.value['ville_arrivee'],
                        date: e.value['date'],
                        offre: e.value,
                        sieges: (e.value['sieges'] as List).map((s) => '$s').toList(),
                        auto: r.autoAller,
                      ),
                    );
                    return w
                        .animate(delay: delai.ms)
                        .fadeIn()
                        .slideY(begin: 0.15);
                  }),
                  // TOUS les billets retour (1 par voyageur)
                  ..._billetsRetour.asMap().entries.map((e) {
                    delai += 100;
                    final w = Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: BilletCarre(
                        etiquette:
                            '${Strings.t('resultats_retour')}${r.passagers > 1 ? ' · ${Strings.t('voyageur')} ${e.key + 1}' : ''}',
                        villeDepart: e.value['ville_depart'],
                        villeArrivee: e.value['ville_arrivee'],
                        date: e.value['date'],
                        offre: e.value,
                        sieges: (e.value['sieges'] as List).map((s) => '$s').toList(),
                        auto: r.autoRetour,
                      ),
                    );
                    return w
                        .animate(delay: delai.ms)
                        .fadeIn()
                        .slideY(begin: 0.15);
                  }),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 4, 18, 16),
              child: BoutonTactile(
                onTap: () => Navigator.of(context)
                    .popUntil((route) => route.isFirst),
                child: Container(
                  height: 56,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: JegoTheme.vert,
                    borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                    boxShadow: JegoTheme.ombreVerte,
                  ),
                  child: Text(
                    Strings.t('confirm_terminer'),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}