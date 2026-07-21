import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/reservation.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/champ_telephone.dart';
import '../widgets/timer_softlock.dart';
import 'connexion_inscription.dart' show ChampJego;
import 'paiement.dart';

class EcranOptionsReservation extends StatefulWidget {
  final Reservation reservation;
  const EcranOptionsReservation({super.key, required this.reservation});

  @override
  State<EcranOptionsReservation> createState() =>
      _EcranOptionsReservationState();
}

class _EcranOptionsReservationState extends State<EcranOptionsReservation> {
  // Un controleur de nom + tel par billet (aller/retour x voyageur).
  late final List<TextEditingController> _nomAller;
  late final List<TextEditingController> _telAller;
  late final List<TextEditingController> _nomRetour;
  late final List<TextEditingController> _telRetour;
  late final List<Pays> _paysAller;
  late final List<Pays> _paysRetour;

  bool _erreurCadeau = false;

  Reservation get r => widget.reservation;

  @override
  void initState() {
    super.initState();
    _nomAller = List.generate(r.passagers, (_) => TextEditingController());
    _telAller = List.generate(r.passagers, (_) => TextEditingController());
    _nomRetour = List.generate(r.passagers, (_) => TextEditingController());
    _telRetour = List.generate(r.passagers, (_) => TextEditingController());
    _paysAller =
        List.generate(r.passagers, (_) => PaysTelephone.cameroun);
    _paysRetour =
        List.generate(r.passagers, (_) => PaysTelephone.cameroun);
  }

  @override
  void dispose() {
    for (final c in [
      ..._nomAller,
      ..._telAller,
      ..._nomRetour,
      ..._telRetour
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  bool _cadeauxValides() {
    for (var i = 0; i < r.passagers; i++) {
      if (r.cadeauAller[i]) {
        if (_nomAller[i].text.trim().isEmpty ||
            !PaysTelephone.valide(_paysAller[i], _telAller[i].text)) {
          return false;
        }
      }
      if (r.estAllerRetour && r.cadeauRetour[i]) {
        if (_nomRetour[i].text.trim().isEmpty ||
            !PaysTelephone.valide(_paysRetour[i], _telRetour[i].text)) {
          return false;
        }
      }
    }
    return true;
  }

  void _versPaiement() {
    if (!_cadeauxValides()) {
      setState(() => _erreurCadeau = true);
      return;
    }
    // Enregistre les noms/tel des cadeaux dans la reservation.
    for (var i = 0; i < r.passagers; i++) {
      if (r.cadeauAller[i]) {
        r.cadeauNomAller[i] = _nomAller[i].text.trim();
        r.cadeauTelAller[i] =
            '${_paysAller[i].indicatif}${_telAller[i].text.trim()}';
      }
      if (r.estAllerRetour && r.cadeauRetour[i]) {
        r.cadeauNomRetour[i] = _nomRetour[i].text.trim();
        r.cadeauTelRetour[i] =
            '${_paysRetour[i].indicatif}${_telRetour[i].text.trim()}';
      }
    }
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => EcranPaiement(reservation: r)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 8),
              child: Row(
                children: [
                  BoutonTactile(
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border:
                            Border.all(color: JegoTheme.bordCarte, width: 1),
                      ),
                      child: const Icon(Icons.arrow_back_rounded,
                          size: 20, color: JegoTheme.texte),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Text(
                    Strings.t('options_titre'),
                    style: const TextStyle(
                      color: JegoTheme.texte,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  const TimerSoftLock(),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 6, 18, 20),
                children: [
                  _blocTrajet(
                    titre: r.estAllerRetour
                        ? Strings.t('resultats_aller')
                        : Strings.t('options_votre_trajet'),
                    prixUnit: r.offreAller['prix'] as int,
                    bagages: r.bagagesAller,
                    flexible: r.flexibleAller,
                    cadeau: r.cadeauAller,
                    nomCtrl: _nomAller,
                    telCtrl: _telAller,
                    pays: _paysAller,
                    onPays: (i, p) => setState(() => _paysAller[i] = p),
                  ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1),
                  if (r.estAllerRetour) ...[
                    const SizedBox(height: 12),
                    _blocTrajet(
                      titre: Strings.t('resultats_retour'),
                      prixUnit: r.offreRetour!['prix'] as int,
                      bagages: r.bagagesRetour,
                      flexible: r.flexibleRetour,
                      cadeau: r.cadeauRetour,
                      nomCtrl: _nomRetour,
                      telCtrl: _telRetour,
                      pays: _paysRetour,
                      onPays: (i, p) => setState(() => _paysRetour[i] = p),
                    )
                        .animate(delay: 80.ms)
                        .fadeIn(duration: 400.ms)
                        .slideY(begin: 0.1),
                  ],
                  const SizedBox(height: 12),
                  _blocPoints()
                      .animate(delay: 200.ms)
                      .fadeIn(duration: 400.ms)
                      .slideY(begin: 0.1),
                  const SizedBox(height: 12),
                  _blocRecap()
                      .animate(delay: 260.ms)
                      .fadeIn(duration: 400.ms)
                      .slideY(begin: 0.1),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 4, 18, 16),
              child: BoutonTactile(
                onTap: _versPaiement,
                child: Container(
                  height: 56,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: JegoTheme.vert,
                    borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
                    boxShadow: JegoTheme.ombreVerte,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '${Strings.t('vers_paiement')} · ${r.total} FCFA',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_rounded,
                          color: Colors.white, size: 20),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _carte({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.bordCarte, width: 1),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: child,
    );
  }

  Widget _blocTrajet({
    required String titre,
    required int prixUnit,
    required List<int> bagages,
    required List<bool> flexible,
    required List<bool> cadeau,
    required List<TextEditingController> nomCtrl,
    required List<TextEditingController> telCtrl,
    required List<Pays> pays,
    required void Function(int, Pays) onPays,
  }) {
    final coutFlex = (prixUnit * Reservation.tauxFlexible).round();
    return _carte(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: JegoTheme.vert.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                ),
                child: Text(
                  titre,
                  style: const TextStyle(
                    color: JegoTheme.vert,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          for (var i = 0; i < r.passagers; i++) ...[
            if (i > 0)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 10),
                child: Divider(height: 1, color: JegoTheme.bordCarte),
              ),
            if (r.passagers > 1)
              Padding(
                padding: const EdgeInsets.only(top: 4, bottom: 8),
                child: Row(
                  children: [
                    const Icon(Icons.person_rounded,
                        size: 15, color: JegoTheme.texteSecondaire),
                    const SizedBox(width: 6),
                    Text(
                      '${Strings.t('voyageur')} ${i + 1}',
                      style: const TextStyle(
                          color: JegoTheme.texte,
                          fontSize: 13,
                          fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ),
            // Bagages
            Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: JegoTheme.champ,
                    borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                  ),
                  child: const Icon(Icons.luggage_rounded,
                      size: 19, color: JegoTheme.texteSecondaire),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        Strings.t('opt_bagage_supp'),
                        style: const TextStyle(
                            color: JegoTheme.texte,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700),
                      ),
                      Text(
                        '${Strings.t('bagage_inclus')} · +${Reservation.prixBagage} FCFA/${Strings.t('bagage_unite')}',
                        style: const TextStyle(
                            color: JegoTheme.texteTernaire, fontSize: 10.5),
                      ),
                    ],
                  ),
                ),
                _compteur(
                  valeur: bagages[i],
                  onMoins: () {
                    if (bagages[i] > 0) {
                      setState(() => bagages[i] = bagages[i] - 1);
                    }
                  },
                  onPlus: () => setState(() => bagages[i] = bagages[i] + 1),
                ),
              ],
            ),
            const SizedBox(height: 10),
            // Flexible
            _ligneToggle(
              icone: Icons.published_with_changes_rounded,
              titre: Strings.t('opt_billet_flexible'),
              sousTitre:
                  '${Strings.t('opt_flexible_desc')} · +$coutFlex FCFA',
              valeur: flexible[i],
              onChange: (v) => setState(() => flexible[i] = v),
            ),
            const SizedBox(height: 10),
            // Cadeau (par billet)
            _ligneToggle(
              icone: Icons.card_giftcard_rounded,
              titre: Strings.t('opt_cadeau'),
              sousTitre: Strings.t('opt_cadeau_desc'),
              valeur: cadeau[i],
              onChange: (v) => setState(() {
                cadeau[i] = v;
                _erreurCadeau = false;
              }),
            ),
            AnimatedSize(
              duration: const Duration(milliseconds: 280),
              curve: Curves.easeOutCubic,
              child: cadeau[i]
                  ? Padding(
                      padding: const EdgeInsets.only(top: 10, left: 48),
                      child: Column(
                        children: [
                          ChampJego(
                            controller: nomCtrl[i],
                            libelle: '${Strings.t('cadeau_nom')} *',
                            icone: Icons.person_outline_rounded,
                            onChange: (_) =>
                                setState(() => _erreurCadeau = false),
                          ),
                          const SizedBox(height: 10),
                          ChampTelephone(
                            controller: telCtrl[i],
                            pays: pays[i],
                            onPays: (p) => onPays(i, p),
                            libelle: '${Strings.t('cadeau_tel')} *',
                            onChange: (_) =>
                                setState(() => _erreurCadeau = false),
                          ),
                          if (_erreurCadeau &&
                              (nomCtrl[i].text.trim().isEmpty ||
                                  !PaysTelephone.valide(
                                      pays[i], telCtrl[i].text)))
                            Padding(
                              padding:
                                  const EdgeInsets.only(top: 6, left: 4),
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  Strings.t('cadeau_erreur'),
                                  style: const TextStyle(
                                    color: JegoTheme.danger,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    )
                  : const SizedBox(width: double.infinity),
            ),
          ],
        ],
      ),
    );
  }

  Widget _compteur({
    required int valeur,
    required VoidCallback onMoins,
    required VoidCallback onPlus,
  }) {
    return Row(
      children: [
        _boutonCompteur(Icons.remove_rounded, onMoins),
        SizedBox(
          width: 28,
          child: Center(
            child: Text(
              '$valeur',
              style: const TextStyle(
                color: JegoTheme.vert,
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
        _boutonCompteur(Icons.add_rounded, onPlus),
      ],
    );
  }

  Widget _boutonCompteur(IconData icone, VoidCallback onTap) {
    return BoutonTactile(
      onTap: onTap,
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: JegoTheme.vert.withOpacity(0.1),
          shape: BoxShape.circle,
          border:
              Border.all(color: JegoTheme.vert.withOpacity(0.3), width: 0.8),
        ),
        child: Icon(icone, size: 16, color: JegoTheme.vert),
      ),
    );
  }

  Widget _ligneToggle({
    required IconData icone,
    required String titre,
    required String sousTitre,
    required bool valeur,
    required ValueChanged<bool> onChange,
  }) {
    return Row(
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: JegoTheme.champ,
            borderRadius: BorderRadius.circular(JegoTheme.rPetit),
          ),
          child: Icon(icone, size: 19, color: JegoTheme.texteSecondaire),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                titre,
                style: const TextStyle(
                    color: JegoTheme.texte,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700),
              ),
              Text(
                sousTitre,
                style: const TextStyle(
                    color: JegoTheme.texteTernaire, fontSize: 10.5),
              ),
            ],
          ),
        ),
        _interrupteur(valeur, onChange),
      ],
    );
  }

  Widget _interrupteur(bool valeur, ValueChanged<bool> onChange) {
    return BoutonTactile(
      onTap: () => onChange(!valeur),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        width: 46,
        height: 27,
        padding: const EdgeInsets.all(3),
        alignment: valeur ? Alignment.centerRight : Alignment.centerLeft,
        decoration: BoxDecoration(
          color: valeur ? JegoTheme.vert : JegoTheme.bordCarte,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Container(
          width: 21,
          height: 21,
          decoration: const BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }

  Widget _blocPoints() {
    final prixStandard = r.offreAller['prix'] as int;
    return _carte(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.stars_rounded,
                  size: 18, color: JegoTheme.etoile),
              const SizedBox(width: 8),
              Text(
                Strings.t('points_titre'),
                style: const TextStyle(
                    color: JegoTheme.texte,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800),
              ),
              const Spacer(),
              Text(
                '${Reservation.pointsDisponibles} pts',
                style: const TextStyle(
                    color: JegoTheme.vert,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _optionPoints(
            libelle: Strings.t('points_aucun'),
            detail: '',
            actif: r.pointsConsommes == 0,
            onTap: () => setState(() {
              r.pointsConsommes = 0;
              r.pointsReduction = 0;
            }),
          ),
          _optionPoints(
            libelle: '${Strings.t('points_500')} (-500 FCFA)',
            detail: '500 pts',
            actif: r.pointsConsommes == 500,
            disponible: Reservation.pointsDisponibles >= 500,
            onTap: () => setState(() {
              r.pointsConsommes = 500;
              r.pointsReduction = 500;
            }),
          ),
          _optionPoints(
            libelle: '${Strings.t('points_1000')} (-$prixStandard FCFA)',
            detail: '1000 pts',
            actif: r.pointsConsommes == 1000,
            disponible: Reservation.pointsDisponibles >= 1000,
            onTap: () => setState(() {
              r.pointsConsommes = 1000;
              r.pointsReduction = prixStandard;
            }),
          ),
        ],
      ),
    );
  }

  Widget _optionPoints({
    required String libelle,
    required String detail,
    required bool actif,
    bool disponible = true,
    required VoidCallback onTap,
  }) {
    return Opacity(
      opacity: disponible ? 1 : 0.4,
      child: BoutonTactile(
        onTap: disponible ? onTap : null,
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          decoration: BoxDecoration(
            color:
                actif ? JegoTheme.vert.withOpacity(0.08) : JegoTheme.champ,
            borderRadius: BorderRadius.circular(JegoTheme.rPetit),
            border: Border.all(
              color: actif ? JegoTheme.vert : Colors.transparent,
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Icon(
                actif
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_unchecked_rounded,
                size: 18,
                color: actif ? JegoTheme.vert : JegoTheme.texteTernaire,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  libelle,
                  style: TextStyle(
                    color: JegoTheme.texte,
                    fontSize: 12.5,
                    fontWeight: actif ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ),
              if (detail.isNotEmpty)
                Text(
                  detail,
                  style: const TextStyle(
                      color: JegoTheme.texteTernaire, fontSize: 11),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _blocRecap() {
    return _carte(
      child: Column(
        children: [
          _ligneRecap(
              '${Strings.t('prix_billet')} × ${r.passagers}${r.estAllerRetour ? ' (${Strings.t('aller_retour')})' : ''}',
              '${r.prixBilletsAller + r.prixBilletsRetour} FCFA'),
          if (r.supplementsAller + r.supplementsRetour > 0)
            _ligneRecap(Strings.t('recap_sieges'),
                '${r.supplementsAller + r.supplementsRetour} FCFA'),
          if (r.coutBagages > 0)
            _ligneRecap(Strings.t('recap_bagages'),
                '${r.coutBagages} FCFA'),
          if (r.coutFlexible > 0)
            _ligneRecap(Strings.t('recap_flexible'),
                '${r.coutFlexible} FCFA'),
          if (r.pointsReduction > 0)
            _ligneRecap(Strings.t('recap_points'),
                '-${r.pointsReduction} FCFA',
                vert: true),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Divider(height: 1, color: JegoTheme.bordCarte),
          ),
          _ligneRecap(Strings.t('total'), '${r.total} FCFA', gras: true),
        ],
      ),
    );
  }

  Widget _ligneRecap(String libelle, String valeur,
      {bool gras = false, bool vert = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Text(
            libelle,
            style: TextStyle(
              color: gras ? JegoTheme.texte : JegoTheme.texteSecondaire,
              fontSize: gras ? 15 : 12.5,
              fontWeight: gras ? FontWeight.w800 : FontWeight.w500,
            ),
          ),
          const Spacer(),
          Text(
            valeur,
            style: TextStyle(
              color: vert
                  ? JegoTheme.vert
                  : (gras ? JegoTheme.vert : JegoTheme.texte),
              fontSize: gras ? 17 : 12.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}