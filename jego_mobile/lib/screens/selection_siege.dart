import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/billets_store.dart';
import '../config/api.dart';
import '../config/reservation.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/timer_softlock.dart';
import 'options_reservation.dart';

class EcranSelectionSiege extends StatefulWidget {
  final Map<String, dynamic> offre;
  final int passagers;
  final String? etiquette;
  final Map<String, dynamic>? offreSuivante;
  final Reservation? partielle;
  final String villeDepart;
  final String villeArrivee;
  final String dateAller;
  final String dateRetour;

  const EcranSelectionSiege({
    super.key,
    required this.offre,
    this.passagers = 1,
    this.etiquette,
    this.offreSuivante,
    this.partielle,
    this.villeDepart = '',
    this.villeArrivee = '',
    this.dateAller = '',
    this.dateRetour = '',
  });

  @override
  State<EcranSelectionSiege> createState() => _EcranSelectionSiegeState();
}

class _EcranSelectionSiegeState extends State<EcranSelectionSiege> {
  List<Map<String, dynamic>> _sieges = [];
  final Set<int> _choisis = {};
  bool _verrouActif = false;
  bool _modeAuto = false;
  bool _expire = false;
  bool _chargement = true;
  String? _erreurPlan;

  static const int dureeSoftLock = 5 * 60;

  /// Frais de choix de siège. Renseigné par le backend au moment du
  /// paiement ; la valeur affichée ici n'est qu'une estimation, le
  /// montant qui fait foi est celui calculé côté serveur.
  static const int fraisChoixSiege = 500;

  /// Supplément premium réel du bus, renvoyé avec le plan.
  int _supplementPremium = 0;
  int get _prixPremium => _supplementPremium;

  /// Correspondance numéro affiché -> identifiant serveur du siège.
  /// Indispensable : le backend travaille en UUID, l'interface en
  /// numéros de siège.
  final Map<int, String> _idParNumero = {};

  @override
  void initState() {
    super.initState();
    _chargerPlan();
  }

  /// Charge le vrai plan du bus depuis le backend. La disponibilité
  /// vient de la base : un siège déjà vendu est réellement indisponible.
  Future<void> _chargerPlan() async {
    setState(() {
      _chargement = true;
      _erreurPlan = null;
    });
    try {
      final rep = await ApiService.planTrajet('${widget.offre['id']}');
      final trajet = Map<String, dynamic>.from(rep['trajet'] ?? {});
      final brut = (rep['sieges'] as List?) ?? [];

      _idParNumero.clear();
      final convertis = <Map<String, dynamic>>[];
      for (final s in brut) {
        final numero = int.tryParse('${s['numero']}') ?? 0;
        if (s['id'] != null) _idParNumero[numero] = '${s['id']}';

        // Traduction des statuts serveur vers ceux attendus par
        // l'affichage déjà en place.
        final dispo = '${s['disponibilite']}';
        String statut;
        switch (dispo) {
          case 'disponible':
            statut = 'disponible';
            break;
          case 'toilettes':
            statut = 'toilette';
            break;
          case 'desactive':
            statut = 'abime';
            break;
          default:
            statut = 'vendu_ligne';
        }

        convertis.add({
          'numero': numero,
          'rangee': int.tryParse('${s['rangee']}') ?? 0,
          'colonne': int.tryParse('${s['position']}') ?? 0,
          'statut': statut,
          'type': s['est_premium'] == true ? 'premium' : 'standard',
          'position': '${s['type_position'] ?? 'couloir'}',
        });
      }

      if (!mounted) return;
      setState(() {
        _sieges = convertis;
        _supplementPremium =
            int.tryParse('${trajet['supplement_premium'] ?? 0}') ?? 0;
        _chargement = false;
      });
    } on ErreurApi catch (e) {
      if (!mounted) return;
      setState(() {
        _erreurPlan = e.message;
        _chargement = false;
      });
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  bool _estDisponible(Map<String, dynamic> s) => s['statut'] == 'disponible';

  void _taperSiege(Map<String, dynamic> siege) {
    if (_verrouActif) return;
    if (!_estDisponible(siege)) return;
    final numero = siege['numero'] as int;
    setState(() {
      _modeAuto = false;
      _expire = false;
      if (_choisis.contains(numero)) {
        _choisis.remove(numero);
      } else {
        if (_choisis.length >= widget.passagers) {
          _choisis.remove(_choisis.first);
        }
        _choisis.add(numero);
      }
    });
  }

  int get _totalSupplements {
    var total = _choisis.length * fraisChoixSiege;
    for (final n in _choisis) {
      final s = _sieges.firstWhere((x) => x['numero'] == n);
      if (s['type'] == 'premium') total += _prixPremium;
    }
    return total;
  }

  void _continuer() {
    final pret = _modeAuto || _choisis.length == widget.passagers;
    if (!pret || _verrouActif) return;
    setState(() {
      _verrouActif = true;
      _expire = false;
    });
    if (widget.offreSuivante == null) {
      SoftLock.demarrer(dureeSoftLock);
    }

    // Mode automatique : on attribue de vrais sièges libres du bus,
    // pris dans le plan réel chargé depuis le serveur. Aucun numéro
    // n'est inventé — sinon le paiement porterait sur une place qui
    // n'existe pas ou qui est déjà vendue.
    if (_modeAuto && _choisis.isEmpty) {
      final libres = _sieges
          .where(_estDisponible)
          .map((s) => s['numero'] as int)
          .toList()
        ..sort();
      _choisis.addAll(libres.take(widget.passagers));
    }

    final siegesActuels = _choisis.toList()..sort();

    // On mémorise l'identifiant serveur de chaque siège retenu :
    // le paiement en a besoin pour réserver la bonne place.
    final idsChoisis = <int, String>{
      for (final n in siegesActuels)
        if (_idParNumero[n] != null) n: _idParNumero[n]!,
    };

    if (widget.offreSuivante != null) {
      final partielle = Reservation(
        offreAller: widget.offre,
        passagers: widget.passagers,
        siegesAller: siegesActuels,
        idSiegesAller: idsChoisis,
        autoAller: _modeAuto,
        supplementsAller: _totalSupplements,
        villeAllerDepart: widget.villeDepart,
        villeAllerArrivee: widget.villeArrivee,
        dateAllerAffichee: widget.dateAller,
        dateRetourAffichee: widget.dateRetour,
      );
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => EcranSelectionSiege(
            offre: widget.offreSuivante!,
            passagers: widget.passagers,
            etiquette: Strings.t('resultats_retour'),
            partielle: partielle,
          ),
        ),
      );
      return;
    }

    final Reservation resa;
    if (widget.partielle != null) {
      resa = widget.partielle!
        ..offreRetour = widget.offre
        ..siegesRetour = siegesActuels
        ..idSiegesRetour = idsChoisis
        ..autoRetour = _modeAuto
        ..supplementsRetour = _totalSupplements;
    } else {
      resa = Reservation(
        offreAller: widget.offre,
        passagers: widget.passagers,
        siegesAller: siegesActuels,
        idSiegesAller: idsChoisis,
        autoAller: _modeAuto,
        supplementsAller: _totalSupplements,
        villeAllerDepart: widget.villeDepart,
        villeAllerArrivee: widget.villeArrivee,
        dateAllerAffichee: widget.dateAller,
      );
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => EcranOptionsReservation(reservation: resa),
      ),
    );
  }

  void _basculerAuto() {
    if (_verrouActif) return;
    setState(() {
      _modeAuto = !_modeAuto;
      _expire = false;
      if (_modeAuto) _choisis.clear();
    });
  }

  void _liberer() {
    if (!mounted) return;
    SoftLock.arreter();
    setState(() {
      _verrouActif = false;
      _choisis.clear();
      _modeAuto = false;
      _expire = true;
    });
  }

  Color _couleurSiege(Map<String, dynamic> siege) {
    if (_choisis.contains(siege['numero'])) return JegoTheme.texte;
    if (!_estDisponible(siege)) return const Color(0xFFD4D9D5);
    if (siege['type'] == 'premium') return const Color(0xFFE6B84C);
    return JegoTheme.vert;
  }

  @override
  Widget build(BuildContext context) {
    final rangees = <int, List<Map<String, dynamic>?>>{};
    for (final s in _sieges) {
      rangees.putIfAbsent(s['rangee'] as int, () => []).add(
            s['statut'] == 'toilette' ? null : s,
          );
    }
    final numRangees = rangees.keys.toList()..sort();

    final pretAContinuer =
        (_modeAuto || _choisis.length == widget.passagers) && !_verrouActif;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _tenterRetour();
      },
      child: Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 4),
              child: Row(
                children: [
                  BoutonTactile(
                    onTap: _tenterRetour,
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
                  Expanded(
                    child: Text(
                      Strings.t('siege_titre'),
                      style: const TextStyle(
                        color: JegoTheme.texte,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  if (widget.etiquette != null)
                    Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: JegoTheme.vert.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                      ),
                      child: Text(
                        widget.etiquette!,
                        style: const TextStyle(
                          color: JegoTheme.vert,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  TimerSoftLock(onExpire: _liberer),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Column(
                children: [
                  Text(
                    _modeAuto
                        ? Strings.t('choix_auto_actif')
                        : '${_choisis.length} / ${widget.passagers} ${Strings.t('sieges_choisis')}',
                    style: TextStyle(
                      color: _modeAuto
                          ? JegoTheme.vert
                          : JegoTheme.texteSecondaire,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (_expire)
                    Padding(
                      padding: const EdgeInsets.only(top: 3),
                      child: Text(
                        Strings.t('siege_verrou_expire'),
                        style: const TextStyle(
                          color: JegoTheme.danger,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                    border:
                        Border.all(color: JegoTheme.bordCarte, width: 1),
                    boxShadow: JegoTheme.ombreDouce,
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(9),
                        decoration: const BoxDecoration(
                          color: JegoTheme.champ,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                            Icons.sports_motorsports_rounded,
                            size: 20,
                            color: JegoTheme.texteSecondaire),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        Strings.t('conducteur'),
                        style: const TextStyle(
                            color: JegoTheme.texteTernaire, fontSize: 10),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 10),
                        child: Divider(
                            height: 1, color: JegoTheme.bordCarte),
                      ),
                      ...numRangees.map((r) {
                        final ligne = rangees[r]!;
                        final pleine = ligne.length == 5;
                        return Padding(
                          padding:
                              const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              for (var i = 0; i < ligne.length; i++) ...[
                                if (!pleine && i == 2)
                                  const SizedBox(width: 30),
                                if (ligne[i] == null)
                                  const SizedBox(width: 46, height: 40)
                                else
                                  _CaseSiege(
                                    siege: ligne[i]!,
                                    couleur: _couleurSiege(ligne[i]!),
                                    choisi: _choisis
                                        .contains(ligne[i]!['numero']),
                                    onTap: () => _taperSiege(ligne[i]!),
                                  ),
                              ],
                            ],
                          ),
                        );
                      }),
                      const SizedBox(height: 14),
                      Wrap(
                        spacing: 14,
                        runSpacing: 6,
                        alignment: WrapAlignment.center,
                        children: [
                          _legende(
                              JegoTheme.vert, Strings.t('leg_disponible')),
                          _legende(const Color(0xFFE6B84C),
                              '${Strings.t('leg_premium')} (+$_prixPremium FCFA)'),
                          _legende(const Color(0xFFD4D9D5),
                              Strings.t('leg_indisponible')),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 4, 18, 14),
              child: Column(
                children: [
                  if (_choisis.isNotEmpty && !_modeAuto)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Text(
                            '${Strings.t('sieges_label')} ${(_choisis.toList()..sort()).join(', ')}',
                            style: const TextStyle(
                              color: JegoTheme.texte,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '+$_totalSupplements FCFA',
                            style: const TextStyle(
                              color: JegoTheme.vert,
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  BoutonTactile(
                    onTap: pretAContinuer ? _continuer : null,
                    child: AnimatedOpacity(
                      duration: const Duration(milliseconds: 250),
                      opacity: pretAContinuer ? 1 : 0.4,
                      child: Container(
                        height: 54,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.vert,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rMoyen),
                          boxShadow: JegoTheme.ombreVerte,
                        ),
                        child: Text(
                          _modeAuto
                              ? '${Strings.t('continuer')} (${Strings.t('gratuit')})'
                              : '${Strings.t('continuer')} (+$fraisChoixSiege FCFA/${Strings.t('siege_unite')})',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  BoutonTactile(
                    onTap: _basculerAuto,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 17,
                          height: 17,
                          decoration: BoxDecoration(
                            color:
                                _modeAuto ? JegoTheme.vert : Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: _modeAuto
                                  ? JegoTheme.vert
                                  : JegoTheme.texteTernaire,
                              width: 1.3,
                            ),
                          ),
                          child: _modeAuto
                              ? const Icon(Icons.check_rounded,
                                  size: 11, color: Colors.white)
                              : null,
                        ),
                        const SizedBox(width: 7),
                        Text(
                          Strings.t('choix_auto'),
                          style: const TextStyle(
                            color: JegoTheme.texteSecondaire,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }

  void _tenterRetour() {
    // Verrou non actif : on revient normalement.
    if (!SoftLock.actif.value && !_verrouActif) {
      Navigator.of(context).pop();
      return;
    }
    // Verrou actif : on previent que la reservation sera annulee.
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.warning_amber_rounded,
                  color: JegoTheme.danger, size: 32),
              const SizedBox(height: 10),
              Text(Strings.t('retour_titre'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 15.5, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text(Strings.t('retour_texte'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: JegoTheme.texteSecondaire, fontSize: 12.5)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(),
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.champ,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: Text(Strings.t('retour_continuer'),
                            style: const TextStyle(
                                color: JegoTheme.texte,
                                fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: BoutonTactile(
                      onTap: () {
                        SoftLock.arreter();
                        Navigator.of(ctx).pop();
                        // Retour au choix du trajet ALLER (liste resultats).
                        Navigator.of(context).popUntil((route) {
                          return route.settings.name == 'resultats' ||
                              route.isFirst;
                        });
                      },
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.danger,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: Text(Strings.t('retour_annuler'),
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _legende(Color couleur, String libelle) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 13,
          height: 13,
          decoration: BoxDecoration(
            color: couleur,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 5),
        Text(libelle,
            style: const TextStyle(
                fontSize: 11, color: JegoTheme.texteSecondaire)),
      ],
    );
  }
}

class _CaseSiege extends StatelessWidget {
  final Map<String, dynamic> siege;
  final Color couleur;
  final bool choisi;
  final VoidCallback onTap;

  const _CaseSiege({
    required this.siege,
    required this.couleur,
    required this.choisi,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final indisponible = siege['statut'] != 'disponible';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 3),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          width: 40,
          height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: couleur,
            borderRadius: BorderRadius.circular(12),
            border:
                choisi ? Border.all(color: JegoTheme.vert, width: 2) : null,
            boxShadow: choisi
                ? [
                    BoxShadow(
                      color: JegoTheme.vert.withOpacity(0.35),
                      blurRadius: 10,
                    ),
                  ]
                : null,
          ),
          child: choisi
              ? const Icon(Icons.check_rounded,
                  color: Colors.white, size: 20)
              : Text(
                  '${siege['numero']}',
                  style: TextStyle(
                    color: indisponible
                        ? const Color(0xFF9AA69F)
                        : Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
        ),
      ),
    );
  }
}