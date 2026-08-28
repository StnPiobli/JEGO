import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../config/api_service.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import '../widgets/fond_immersif.dart';
import '../widgets/selecteur_date.dart';
import '../config/notifs_store.dart';
import 'notifications.dart';
import 'resultats_recherche.dart';
import '../config/preferences_voyage.dart';

class EcranAccueilRecherche extends StatefulWidget {
  final VoidCallback? onOuvrirMenu;
  const EcranAccueilRecherche({super.key, this.onOuvrirMenu});
  @override
  State<EcranAccueilRecherche> createState() => _EcranAccueilRechercheState();
}

class _EcranAccueilRechercheState extends State<EcranAccueilRecherche> {
  final _ctrlDepart = TextEditingController();
  final _ctrlArrivee = TextEditingController();

  /// Codes serveur des villes choisies (ex. `yaounde`). Le backend
  /// cherche les trajets par code, jamais par nom affiché : « Yaoundé »
  /// ne correspond à rien en base. Tant qu'une ville n'a pas été
  /// choisie dans la liste, son code est nul et la recherche est
  /// refusée — plutôt que de partir avec un texte libre qui ne
  /// remonterait aucun trajet sans expliquer pourquoi.
  String? _codeDepart;
  String? _codeArrivee;

  DateTime? _dateAller;
  DateTime? _dateRetour;
  TimeOfDay? _heure;
  bool _allerRetour = false;
  int _passagers = 1;
  static const int maxPassagers = 5;
  bool _filtresOuverts = false;

  bool _erreurMaxPassagers = false;
  bool _erreurVilles = false;
  String _cleErreurVilles = 'erreur_villes_requises';
  bool _erreurDate = false;
  bool _erreurDateRetour = false;

  // Pre-cochees depuis les preferences de voyage : ce sont les memes
  // ensembles que les filtres manuels, la personne peut donc les
  // decocher pour une recherche sans perdre son reglage.
  final Set<String> _categories = {...PreferencesVoyage.categories};
  RangeValues _prix = const RangeValues(1000, 30000);
  bool _prixModifie = false;
  int? _noteMin;
  final Set<String> _equipements = {...PreferencesVoyage.equipements};
  String? _typeSiege;

  bool get _filtresActifs =>
      _categories.isNotEmpty ||
      _prixModifie ||
      _noteMin != null ||
      _equipements.isNotEmpty ||
      _typeSiege != null ||
      _heure != null;

  @override
  void dispose() {
    _ctrlDepart.dispose();
    _ctrlArrivee.dispose();
    super.dispose();
  }

  void _reinitialiser() {
    setState(() {
      _categories
        ..clear()
        ..addAll(PreferencesVoyage.categories);
      _prix = const RangeValues(1000, 30000);
      _prixModifie = false;
      _noteMin = null;
      _equipements
        ..clear()
        ..addAll(PreferencesVoyage.equipements);
      _typeSiege = null;
      _heure = null;
    });
  }

  Future<void> _choisirDate({required bool retour}) async {
    final maintenant = DateTime.now();
    final choisie = await choisirDateJego(
      context,
      initiale: retour
          ? (_dateRetour ?? _dateAller ?? maintenant)
          : (_dateAller ?? maintenant),
      premiere: retour ? (_dateAller ?? maintenant) : maintenant,
      derniere: maintenant.add(const Duration(days: 365)),
    );
    if (choisie != null) {
      setState(() {
        if (retour) {
          _dateRetour = choisie;
          _erreurDateRetour = false;
        } else {
          _dateAller = choisie;
          _erreurDate = false;
          if (_dateRetour != null && _dateRetour!.isBefore(choisie)) {
            _dateRetour = null;
          }
        }
      });
    }
  }

  Future<void> _choisirHeure() async {
    final choisie = await showTimePicker(
      context: context,
      initialTime: _heure ?? const TimeOfDay(hour: 8, minute: 0),
    );
    if (choisie != null) setState(() => _heure = choisie);
  }

  void _echanger() {
    final tmpTexte = _ctrlDepart.text;
    final tmpCode = _codeDepart;
    setState(() {
      _ctrlDepart.text = _ctrlArrivee.text;
      _ctrlArrivee.text = tmpTexte;
      _codeDepart = _codeArrivee;
      _codeArrivee = tmpCode;
    });
  }

  void _rechercher() {
    final depart = _ctrlDepart.text.trim();
    final arrivee = _ctrlArrivee.text.trim();

    final champsVides = depart.isEmpty || arrivee.isEmpty;
    final villesNonChoisies = _codeDepart == null || _codeArrivee == null;

    setState(() {
      _erreurVilles = champsVides || villesNonChoisies;
      _cleErreurVilles =
          champsVides ? 'erreur_villes_requises' : 'erreur_villes_liste';
      _erreurDate = _dateAller == null;
      _erreurDateRetour = _allerRetour && _dateRetour == null;
    });
    if (_erreurVilles || _erreurDate || _erreurDateRetour) return;

    final params = <String, String>{
      'ville_depart': _codeDepart!,
      'ville_arrivee': _codeArrivee!,
      'depart_affiche': depart,
      'arrivee_affiche': arrivee,
      'date': DateFormat('yyyy-MM-dd').format(_dateAller!),
      'passagers': _passagers.toString(),
      'aller_retour': _allerRetour ? '1' : '0',
      if (_allerRetour)
        'date_retour': DateFormat('yyyy-MM-dd').format(_dateRetour!),
      if (_heure != null)
        'heure':
            '${_heure!.hour.toString().padLeft(2, '0')}:${_heure!.minute.toString().padLeft(2, '0')}',
      if (_categories.isNotEmpty) 'categorie': _categories.join(','),
      if (_prixModifie) 'prix_min': _prix.start.round().toString(),
      if (_prixModifie) 'prix_max': _prix.end.round().toString(),
      if (_noteMin != null) 'note_min': _noteMin.toString(),
      if (_equipements.isNotEmpty) 'equipements': _equipements.join(','),
      if (_typeSiege != null) 'type_siege': _typeSiege!,
    };

    Navigator.of(context).push(
      PageRouteBuilder(
        settings: const RouteSettings(name: 'resultats'),
        transitionDuration: const Duration(milliseconds: 420),
        pageBuilder: (_, anim, __) => SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.06),
            end: Offset.zero,
          ).animate(
              CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
          child: FadeTransition(
            opacity: anim,
            child: EcranResultatsRecherche(params: params),
          ),
        ),
      ),
    );
  }

  Widget _erreurSousCase(bool visible, String cle) {
    return AnimatedSize(
      duration: const Duration(milliseconds: 220),
      child: visible
          ? Padding(
              padding: const EdgeInsets.only(top: 5, left: 4),
              child: Text(
                Strings.t(cle),
                style: TextStyle(
                  color: JegoTheme.danger,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            )
          : const SizedBox(width: double.infinity),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        const Positioned.fill(
          child: Align(
            alignment: Alignment.topCenter,
            child: FondImmersif(hauteur: 400),
          ),
        ),
        SafeArea(
          bottom: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 100),
            children: [
              // En-tete : hamburger a GAUCHE, cloche a DROITE
              Row(
                children: [
                 BoutonTactile(
                    onTap: widget.onOuvrirMenu,
                    child: _pastille(Icons.menu_rounded),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'JEGO',
                    style: TextStyle(
                      fontSize: 21,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2,
                      color: JegoTheme.texte,
                    ),
                  ),
                  const Spacer(),
                  BoutonTactile(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                            builder: (_) => EcranNotifications()),
                      );
                    },
                    child: ValueListenableBuilder<List<Map<String, dynamic>>>(
                      valueListenable: NotifsStore.liste,
                      builder: (context, _, __) {
                        final n = NotifsStore.nonLues;
                        return Stack(
                          clipBehavior: Clip.none,
                          children: [
                            _pastille(Icons.notifications_rounded),
                            if (n > 0)
                              Positioned(
                                right: -2,
                                top: -2,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  constraints: const BoxConstraints(
                                      minWidth: 18, minHeight: 18),
                                  decoration: BoxDecoration(
                                    color: JegoTheme.danger,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                        color: JegoTheme.fondCarte, width: 1.5),
                                  ),
                                  child: Center(
                                    child: Text(
                                      '$n',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        );
                      },
                    ),
                  ),
                ],
              ).animate().fadeIn(duration: 450.ms),
              const SizedBox(height: 24),
              Text(
                Strings.t('recherche_titre'),
                style: TextStyle(
                  fontSize: 27,
                  fontWeight: FontWeight.w800,
                  color: JegoTheme.texte,
                  height: 1.15,
                ),
              )
                  .animate(delay: 80.ms)
                  .fadeIn(duration: 500.ms)
                  .slideY(begin: 0.25, curve: Curves.easeOutCubic),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: JegoTheme.fondCarte,
                  borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                  border: Border.all(color: JegoTheme.bordCarte, width: 1),
                  boxShadow: JegoTheme.ombreDouce,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        _segment(
                          libelle: Strings.t('aller_simple'),
                          actif: !_allerRetour,
                          onTap: () =>
                              setState(() => _allerRetour = false),
                        ),
                        const SizedBox(width: 8),
                        _segment(
                          libelle: Strings.t('aller_retour'),
                          actif: _allerRetour,
                          onTap: () => setState(() => _allerRetour = true),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Stack(
                      children: [
                        Column(
                          children: [
                            _ChampVille(
                              controller: _ctrlDepart,
                              libelle: Strings.t('ville_depart'),
                              icone: Icons.trip_origin_rounded,
                              onVilleChoisie: (code) => setState(() {
                                _codeDepart = code;
                                _erreurVilles = false;
                              }),
                            ),
                            const SizedBox(height: 8),
                            _ChampVille(
                              controller: _ctrlArrivee,
                              libelle: Strings.t('ville_arrivee'),
                              icone: Icons.place_rounded,
                              onVilleChoisie: (code) => setState(() {
                                _codeArrivee = code;
                                _erreurVilles = false;
                              }),
                            ),
                          ],
                        ),
                        Positioned(
                          right: 10,
                          top: 0,
                          bottom: 0,
                          child: Center(
                            child: BoutonTactile(
                              onTap: _echanger,
                              child: Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: JegoTheme.vert.withOpacity(0.1),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                      color: JegoTheme.vert
                                          .withOpacity(0.35),
                                      width: 0.8),
                                ),
                                child: Icon(Icons.swap_vert_rounded,
                                    size: 19, color: JegoTheme.vert),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    _erreurSousCase(_erreurVilles, _cleErreurVilles),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _champBouton(
                            icone: Icons.calendar_month_rounded,
                            texte: _dateAller == null
                                ? Strings.t('date_aller')
                                : DateFormat('dd MMM').format(_dateAller!),
                            actif: _dateAller != null,
                            onTap: () => _choisirDate(retour: false),
                          ),
                        ),
                        if (_allerRetour) ...[
                          const SizedBox(width: 8),
                          Expanded(
                            child: _champBouton(
                              icone: Icons.event_repeat_rounded,
                              texte: _dateRetour == null
                                  ? Strings.t('date_retour')
                                  : DateFormat('dd MMM')
                                      .format(_dateRetour!),
                              actif: _dateRetour != null,
                              onTap: () => _choisirDate(retour: true),
                            ),
                          ),
                        ],
                        const SizedBox(width: 8),
                        Expanded(
                          child: _champBouton(
                            icone: Icons.schedule_rounded,
                            texte: _heure == null
                                ? Strings.t('heure')
                                : _heure!.format(context),
                            actif: _heure != null,
                            onTap: _choisirHeure,
                          ),
                        ),
                      ],
                    ),
                    _erreurSousCase(_erreurDate, 'erreur_date_requise'),
                    _erreurSousCase(
                        _erreurDateRetour, 'erreur_date_retour_requise'),
                    const SizedBox(height: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: JegoTheme.champ,
                            borderRadius:
                                BorderRadius.circular(JegoTheme.rPetit),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.group_rounded,
                                  size: 18,
                                  color: JegoTheme.texteSecondaire),
                              const SizedBox(width: 10),
                              Text(
                                Strings.t('passagers'),
                                style: TextStyle(
                                    color: JegoTheme.texte, fontSize: 13),
                              ),
                              const Spacer(),
                              _boutonPassager(Icons.remove_rounded, () {
                                setState(() {
                                  _erreurMaxPassagers = false;
                                  if (_passagers > 1) _passagers--;
                                });
                              }),
                              SizedBox(
                                width: 34,
                                child: Center(
                                  child: Text(
                                    '$_passagers',
                                    style: TextStyle(
                                      color: JegoTheme.vert,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ),
                              _boutonPassager(Icons.add_rounded, () {
                                setState(() {
                                  if (_passagers < maxPassagers) {
                                    _passagers++;
                                    _erreurMaxPassagers = false;
                                  } else {
                                    _erreurMaxPassagers = true;
                                  }
                                });
                              }),
                            ],
                          ),
                        ),
                        _erreurSousCase(
                            _erreurMaxPassagers, 'erreur_max_passagers'),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: BoutonTactile(
                            onTap: () => setState(
                                () => _filtresOuverts = !_filtresOuverts),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 11),
                              decoration: BoxDecoration(
                                color: JegoTheme.champ,
                                borderRadius: BorderRadius.circular(
                                    JegoTheme.rPetit),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.tune_rounded,
                                      size: 18,
                                      color:
                                          JegoTheme.texteSecondaire),
                                  const SizedBox(width: 10),
                                  Text(
                                    Strings.t('filtres'),
                                    style: TextStyle(
                                        color: JegoTheme.texte,
                                        fontSize: 13),
                                  ),
                                  const Spacer(),
                                  AnimatedRotation(
                                    turns: _filtresOuverts ? 0.5 : 0,
                                    duration: const Duration(
                                        milliseconds: 250),
                                    child: Icon(
                                        Icons
                                            .keyboard_arrow_down_rounded,
                                        color: JegoTheme
                                            .texteSecondaire),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        if (_filtresActifs) ...[
                          const SizedBox(width: 8),
                          BoutonTactile(
                            onTap: _reinitialiser,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 11),
                              decoration: BoxDecoration(
                                color:
                                    JegoTheme.danger.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(
                                    JegoTheme.rPetit),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.refresh_rounded,
                                      size: 16,
                                      color: JegoTheme.danger),
                                  const SizedBox(width: 5),
                                  Text(
                                    Strings.t('reinitialiser'),
                                    style: TextStyle(
                                      color: JegoTheme.danger,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    AnimatedSize(
                      duration: const Duration(milliseconds: 320),
                      curve: Curves.easeOutCubic,
                      child: _filtresOuverts
                          ? _blocFiltres()
                          : const SizedBox(width: double.infinity),
                    ),
                    const SizedBox(height: 12),
                    BoutonTactile(
                      onTap: _rechercher,
                      child: Container(
                        height: 54,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.vert,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rMoyen),
                          boxShadow: JegoTheme.ombreVerte,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.search_rounded,
                                color: JegoTheme.surVert, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              Strings.t('rechercher'),
                              style: TextStyle(
                                color: JegoTheme.surVert,
                                fontSize: 15.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                        .animate(onPlay: (c) => c.repeat(reverse: true))
                        .scaleXY(
                            begin: 1.0,
                            end: 1.015,
                            duration: 1400.ms,
                            curve: Curves.easeInOut),
                  ],
                ),
              )
                  .animate(delay: 180.ms)
                  .fadeIn(duration: 550.ms)
                  .slideY(begin: 0.18, curve: Curves.easeOutCubic),
              const SizedBox(height: 20),
              Text(
                Strings.t('lignes_populaires'),
                style: TextStyle(
                  color: JegoTheme.texteSecondaire,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ).animate(delay: 320.ms).fadeIn(duration: 500.ms),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                      child: _carteLigne(
                          'Douala',
                          'douala',
                          'Yaoundé',
                          'yaounde',
                          Color(modeSombre.value ? 0xFF17251E : 0xFFDCF2E5),
                          Color(modeSombre.value ? 0xFF1F3329 : 0xFFA7DEC0))),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _carteLigne(
                          'Douala',
                          'douala',
                          'Bafoussam',
                          'bafoussam',
                          Color(modeSombre.value ? 0xFF152219 : 0xFFD3EDDE),
                          Color(modeSombre.value ? 0xFF1C2F24 : 0xFF95D5B2))),
                ],
              )
                  .animate(delay: 400.ms)
                  .fadeIn(duration: 550.ms)
                  .slideY(begin: 0.2, curve: Curves.easeOutCubic),
            ],
          ),
        ),
      ],
    );
  }

  Widget _pastille(IconData icone) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte.withOpacity(0.85),
        shape: BoxShape.circle,
        border: Border.all(color: JegoTheme.bordCarte, width: 1),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: Icon(icone, size: 20, color: JegoTheme.texte),
    );
  }

  Widget _segment({
    required String libelle,
    required bool actif,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: BoutonTactile(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: actif ? JegoTheme.vert : JegoTheme.champ,
            borderRadius: BorderRadius.circular(JegoTheme.rPetit),
          ),
          child: Center(
            child: Text(
              libelle,
              style: TextStyle(
                color: actif ? Colors.white : JegoTheme.texteSecondaire,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _champBouton({
    required IconData icone,
    required String texte,
    required VoidCallback onTap,
    bool actif = false,
  }) {
    return BoutonTactile(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        decoration: BoxDecoration(
          color: JegoTheme.champ,
          borderRadius: BorderRadius.circular(JegoTheme.rPetit),
          border: actif
              ? Border.all(
                  color: JegoTheme.vert.withOpacity(0.5), width: 1)
              : null,
        ),
        child: Row(
          children: [
            Icon(icone,
                size: 16,
                color:
                    actif ? JegoTheme.vert : JegoTheme.texteSecondaire),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                texte,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: actif ? JegoTheme.texte : JegoTheme.texteSecondaire,
                  fontSize: 12.5,
                  fontWeight: actif ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _boutonPassager(IconData icone, VoidCallback onTap) {
    return BoutonTactile(
      onTap: onTap,
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: JegoTheme.vert.withOpacity(0.1),
          shape: BoxShape.circle,
          border:
              Border.all(color: JegoTheme.vert.withOpacity(0.3), width: 0.8),
        ),
        child: Icon(icone, size: 17, color: JegoTheme.vert),
      ),
    );
  }

  Widget _blocFiltres() {
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Classe du bus : c'est ce que la base connait vraiment
          // (standard / mixte / vip). « Mixte » manquait, donc un bus
          // mixte n'etait pas filtrable et se faisait exclure des qu'on
          // cochait Standard ou VIP.
          _titreFiltre(Strings.t('categorie')),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _puceMultiCategorie('standard', Strings.t('cat_standard')),
            _puceMultiCategorie('mixte', Strings.t('cat_mixte')),
            _puceMultiCategorie('vip', Strings.t('cat_vip')),
          ]),
          // Nuit et Express ne sont pas des classes : ce sont des
          // caracteristiques calculees a partir de l'horaire et des
          // arrets. Groupe a part pour ne pas les confondre.
          _titreFiltre(Strings.t('caracteristiques')),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _puceMultiCategorie('nuit', Strings.t('cat_nuit')),
            _puceMultiCategorie('express', Strings.t('cat_express')),
          ]),
          _titreFiltre(
              '${Strings.t('prix')} : ${_prix.start.round()} – ${_prix.end.round()}'),
          SliderTheme(
            data: SliderThemeData(
              activeTrackColor: JegoTheme.vert,
              inactiveTrackColor: JegoTheme.champ,
              thumbColor: JegoTheme.vert,
              overlayColor: JegoTheme.vert.withOpacity(0.12),
              trackHeight: 3,
            ),
            child: RangeSlider(
              values: _prix,
              min: 500,
              max: 50000,
              divisions: 99,
              onChanged: (v) => setState(() {
                _prix = v;
                _prixModifie = true;
              }),
            ),
          ),
          _titreFiltre(Strings.t('note_minimale')),
          Wrap(
            spacing: 8,
            children: [3, 4, 5].map((n) {
              final actif = _noteMin == n;
              return BoutonTactile(
                onTap: () => setState(() => _noteMin = actif ? null : n),
                child: _decorPuce('$n★', actif),
              );
            }).toList(),
          ),
          _titreFiltre(Strings.t('equipements')),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _puceMulti('clim', Strings.t('eq_clim')),
            _puceMulti('toilettes', Strings.t('eq_toilettes')),
            _puceMulti('usb', Strings.t('eq_usb')),
            _puceMulti('wifi', Strings.t('eq_wifi')),
            _puceMulti('inclinables', Strings.t('eq_inclinables')),
          ]),
          _titreFiltre(Strings.t('type_siege')),
          Wrap(spacing: 8, children: [
            _puce('standard', Strings.t('siege_standard'), _typeSiege,
                (v) => setState(() => _typeSiege = v)),
            _puce('premium', Strings.t('siege_premium'), _typeSiege,
                (v) => setState(() => _typeSiege = v)),
          ]),
        ],
      ),
    );
  }

  Widget _titreFiltre(String texte) => Padding(
        padding: const EdgeInsets.only(top: 14, bottom: 8),
        child: Text(
          texte,
          style: TextStyle(
            color: JegoTheme.texteSecondaire,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      );

  Widget _decorPuce(String libelle, bool actif) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: actif ? JegoTheme.vert : JegoTheme.champ,
        borderRadius: BorderRadius.circular(JegoTheme.rGrand),
      ),
      child: Text(
        libelle,
        style: TextStyle(
          color: actif ? Colors.white : JegoTheme.texteSecondaire,
          fontSize: 12.5,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _puce(String valeur, String libelle, String? etat,
      ValueChanged<String?> onChange) {
    final actif = etat == valeur;
    return BoutonTactile(
      onTap: () => onChange(actif ? null : valeur),
      child: _decorPuce(libelle, actif),
    );
  }

  Widget _puceMulti(String valeur, String libelle) {
    final actif = _equipements.contains(valeur);
    return BoutonTactile(
      onTap: () => setState(() {
        actif ? _equipements.remove(valeur) : _equipements.add(valeur);
      }),
      child: _decorPuce(libelle, actif),
    );
  }

  Widget _puceMultiCategorie(String valeur, String libelle) {
    final actif = _categories.contains(valeur);
    return BoutonTactile(
      onTap: () => setState(() {
        actif ? _categories.remove(valeur) : _categories.add(valeur);
      }),
      child: _decorPuce(libelle, actif),
    );
  }

  /// Ligne populaire : on renseigne le nom affiché ET le code, sinon
  /// la recherche partirait sans code et serait refusée.
  Widget _carteLigne(String de, String codeDe, String vers, String codeVers,
      Color fond, Color colline) {
    return BoutonTactile(
      onTap: () {
        setState(() {
          _ctrlDepart.text = de;
          _ctrlArrivee.text = vers;
          _codeDepart = codeDe;
          _codeArrivee = codeVers;
          _erreurVilles = false;
        });
      },
      child: Container(
        height: 78,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: fond,
          borderRadius: BorderRadius.circular(JegoTheme.rPetit + 2),
        ),
        child: Stack(
          children: [
            Positioned(
              bottom: -20,
              left: -12,
              child: Container(
                width: 100,
                height: 52,
                decoration: BoxDecoration(
                  color: colline,
                  borderRadius:
                      const BorderRadius.all(Radius.elliptical(100, 52)),
                ),
              ),
            ),
            Positioned(
              bottom: 8,
              left: 10,
              child: Text(
                '$de → $vers',
                style: TextStyle(
                  color: Color(modeSombre.value ? 0xFF7FD9AC : 0xFF0E5C3A),
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Champ de saisie d'une ville, alimenté par l'autocomplétion du
/// serveur (les 50 villes de la base, avec leurs abréviations).
///
/// Le champ remonte deux choses au parent : le nom affiché, qui reste
/// dans le contrôleur de texte, et le CODE de la ville, seul accepté
/// par la recherche de trajets. Tant que le voyageur n'a pas choisi
/// une ville dans la liste, le code vaut `null`.
class _ChampVille extends StatefulWidget {
  final TextEditingController controller;
  final String libelle;
  final IconData icone;

  /// Appelé avec le code serveur quand une ville est choisie dans la
  /// liste, et avec `null` dès que le texte est modifié à la main :
  /// le code retenu ne correspondrait alors plus à ce qui est affiché.
  final ValueChanged<String?> onVilleChoisie;

  const _ChampVille({
    required this.controller,
    required this.libelle,
    required this.icone,
    required this.onVilleChoisie,
  });

  @override
  State<_ChampVille> createState() => _ChampVilleState();
}

class _ChampVilleState extends State<_ChampVille> {
  /// Dernière saisie lancée. Sert à ignorer la réponse d'une requête
  /// partie avant une frappe plus récente.
  String _saisieEnCours = '';

  /// Interroge le serveur après une courte pause. Sans cette pause,
  /// chaque lettre tapée déclencherait un appel réseau — coûteux sur
  /// une connexion mobile camerounaise.
  Future<Iterable<Map<String, dynamic>>> _suggestions(
      TextEditingValue valeur) async {
    final saisie = valeur.text.trim();
    if (saisie.length < 2) return const [];

    _saisieEnCours = saisie;
    await Future.delayed(const Duration(milliseconds: 250));
    if (_saisieEnCours != saisie) return const [];

    try {
      return await ApiService.chercherVilles(saisie);
    } on ErreurApi {
      // Serveur injoignable : aucune suggestion, et le voyageur ne
      // peut pas lancer une recherche qui échouerait de toute façon.
      return const [];
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = widget.controller;
    final libelle = widget.libelle;
    final icone = widget.icone;

    return Autocomplete<Map<String, dynamic>>(
      optionsBuilder: _suggestions,
      displayStringForOption: (ville) => '${ville['nom']}',
      onSelected: (choix) {
        controller.text = '${choix['nom']}';
        widget.onVilleChoisie('${choix['code']}');
      },
      optionsViewBuilder: (context, onSelected, options) {
        return Align(
          alignment: Alignment.topLeft,
          child: Material(
            color: Colors.transparent,
            child: Container(
              margin: const EdgeInsets.only(top: 6),
              width: 260,
              constraints: const BoxConstraints(maxHeight: 210),
              decoration: BoxDecoration(
                color: JegoTheme.fondCarte,
                borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                border: Border.all(color: JegoTheme.bordCarte, width: 1),
                boxShadow: JegoTheme.ombreDouce,
              ),
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 6),
                shrinkWrap: true,
                itemCount: options.length,
                itemBuilder: (context, i) {
                  final option = options.elementAt(i);
                  final region = '${option['region'] ?? ''}';
                  return InkWell(
                    onTap: () => onSelected(option),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      child: Row(
                        children: [
                          Icon(Icons.location_on_rounded,
                              size: 15, color: JegoTheme.vert),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text('${option['nom']}',
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                    color: JegoTheme.texte, fontSize: 13.5)),
                          ),
                          if (region.isNotEmpty)
                            Text(region,
                                style: TextStyle(
                                    color: JegoTheme.texteTernaire,
                                    fontSize: 11.5)),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        );
      },
      fieldViewBuilder: (context, ctrlInterne, focusNode, onSubmit) {
        // Le parent peut remplir le champ de l'extérieur (échange des
        // deux villes, ligne populaire) : on recopie sa valeur tant
        // que le champ n'a pas le curseur.
        if (ctrlInterne.text != controller.text && !focusNode.hasFocus) {
          ctrlInterne.text = controller.text;
        }
        return Container(
          decoration: BoxDecoration(
            color: JegoTheme.champ,
            borderRadius: BorderRadius.circular(JegoTheme.rPetit),
          ),
          child: TextField(
            controller: ctrlInterne,
            focusNode: focusNode,
            onChanged: (texte) {
              controller.text = texte;
              // Texte modifié à la main : le code retenu ne vaut plus
              // rien, il faudra rechoisir une ville dans la liste.
              widget.onVilleChoisie(null);
            },
            style: TextStyle(color: JegoTheme.texte, fontSize: 14),
            cursorColor: JegoTheme.vert,
            decoration: InputDecoration(
              hintText: libelle,
              hintStyle: TextStyle(
                  color: JegoTheme.texteTernaire, fontSize: 13.5),
              prefixIcon: Icon(icone, size: 18, color: JegoTheme.vert),
              border: InputBorder.none,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
            ),
          ),
        );
      },
    );
  }
}