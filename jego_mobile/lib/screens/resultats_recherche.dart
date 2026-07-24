import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../config/api.dart';
import '../config/donnees_demo.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';
import 'detail_trajet.dart';
import '../widgets/selecteur_date.dart';

class EcranResultatsRecherche extends StatefulWidget {
  final Map<String, String> params;
  const EcranResultatsRecherche({super.key, required this.params});

  @override
  State<EcranResultatsRecherche> createState() =>
      _EcranResultatsRechercheState();
}

class _EcranResultatsRechercheState extends State<EcranResultatsRecherche> {
  bool _chargement = true;
  List<Map<String, dynamic>> _aller = [];
  List<Map<String, dynamic>> _retour = [];
  bool _phaseRetour = false; // false = on choisit l'aller, true = le retour
  Map<String, dynamic>? _offreAllerChoisie;

  bool get _estAllerRetour => widget.params['aller_retour'] == '1';

  @override
  void initState() {
    super.initState();
    _charger();
  }

  List<Map<String, dynamic>> _filtrer(List<Map<String, dynamic>> source) {
    var liste = source;

    final heure = widget.params['heure'];
    if (heure != null) {
      liste = liste
          .where((o) => '${o['heure_depart']}'.compareTo(heure) >= 0)
          .toList();
    }

    // Categorie : multi-selection, logique OU (au moins une correspond).
    final categorieStr = widget.params['categorie'];
    if (categorieStr != null && categorieStr.isNotEmpty) {
      final demandees =
          categorieStr.split(',').map((c) => c.toLowerCase()).toSet();
      liste = liste
          .where((o) =>
              demandees.contains('${o['categorie']}'.toLowerCase()))
          .toList();
    }

    // Direct = 0 arret, Avec arrets = au moins 1.
    final typeTrajet = widget.params['type_trajet'];
    if (typeTrajet != null) {
      liste = liste.where((o) {
        final arrets = (o['nombre_arrets'] as num?)?.toInt() ?? 0;
        return typeTrajet == 'direct' ? arrets == 0 : arrets > 0;
      }).toList();
    }

    final prixMin = int.tryParse(widget.params['prix_min'] ?? '');
    if (prixMin != null) {
      liste = liste
          .where((o) => ((o['prix'] as num?)?.toInt() ?? 0) >= prixMin)
          .toList();
    }

    final prixMax = int.tryParse(widget.params['prix_max'] ?? '');
    if (prixMax != null) {
      liste = liste
          .where((o) => ((o['prix'] as num?)?.toInt() ?? 0) <= prixMax)
          .toList();
    }

    final noteMin = double.tryParse(widget.params['note_min'] ?? '');
    if (noteMin != null) {
      liste = liste
          .where((o) =>
              ((o['note_moyenne'] as num?)?.toDouble() ?? 0) >= noteMin)
          .toList();
    }

    // Chaque equipement demande doit etre present dans l'offre.
    final equipementsStr = widget.params['equipements'];
    if (equipementsStr != null && equipementsStr.isNotEmpty) {
      final demandes = equipementsStr.split(',');
      liste = liste.where((o) {
        final dispo = (o['equipements'] as List?)?.cast<String>() ?? [];
        return demandes.every((e) => dispo.contains(e));
      }).toList();
    }

    // "Premium" exclut les offres Standard (pas de rangee premium sur un
    // petit car standard). "Standard" ne filtre rien : tout bus a des
    // sieges standard.
    final typeSiege = widget.params['type_siege'];
    if (typeSiege == 'premium') {
      liste = liste
          .where((o) => '${o['categorie']}'.toLowerCase() != 'standard')
          .toList();
    }

    return liste;
  }

  Future<void> _charger() async {
    setState(() => _chargement = true);
    if (ApiConfig.modeDemo) {
      await Future.delayed(const Duration(milliseconds: 1000));
      if (!mounted) return;
      setState(() {
        _aller = _filtrer(DonneesDemo.offres
            .map((o) => Map<String, dynamic>.from(o))
            .toList());
        _retour = _filtrer(DonneesDemo.offresRetour
            .map((o) => Map<String, dynamic>.from(o))
            .toList());
        _chargement = false;
      });
    }
  }

  Future<void> _changerDate() async {
    final actuelle = DateTime.tryParse(_phaseRetour
            ? widget.params['date_retour'] ?? ''
            : widget.params['date'] ?? '') ??
        DateTime.now();
    final choisie = await choisirDateJegoImportContournement(
      context,
      actuelle.isBefore(DateTime.now()) ? DateTime.now() : actuelle,
    );
    if (choisie != null && mounted) {
      setState(() {
        final cle = _phaseRetour ? 'date_retour' : 'date';
        widget.params[cle] = DateFormat('yyyy-MM-dd').format(choisie);
      });
      _charger();
    }
  }

  Future<void> _ouvrirDetail(Map<String, dynamic> offre) async {
    final mode =
        !_estAllerRetour ? 'simple' : (_phaseRetour ? 'retour' : 'aller');

    final resultat = await Navigator.of(context).push<String>(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 380),
        pageBuilder: (_, anim, __) => SlideTransition(
          position: Tween<Offset>(
                  begin: const Offset(0.05, 0), end: Offset.zero)
              .animate(CurvedAnimation(
                  parent: anim, curve: Curves.easeOutCubic)),
          child: FadeTransition(
            opacity: anim,
            child: EcranDetailTrajet(
              offre: offre,
              mode: mode,
              passagers:
                  int.tryParse(widget.params['passagers'] ?? '1') ?? 1,
              villeDepart: _phaseRetour
                  ? widget.params['ville_arrivee'] ?? ''
                  : widget.params['ville_depart'] ?? '',
              villeArrivee: _phaseRetour
                  ? widget.params['ville_depart'] ?? ''
                  : widget.params['ville_arrivee'] ?? '',
              date: _phaseRetour
                  ? widget.params['date_retour'] ?? ''
                  : widget.params['date'] ?? '',
              offreAller: _phaseRetour ? _offreAllerChoisie : null,
              dateAller: widget.params['date'] ?? '',
            ),
          ),
        ),
      ),
    );

    // "Reserver le retour" -> passage en phase retour
    if (resultat == 'choisir_retour' && mounted) {
      setState(() {
        _offreAllerChoisie = offre;
        _phaseRetour = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final de = widget.params['ville_depart'] ?? '';
    final vers = widget.params['ville_arrivee'] ?? '';
    final offres = _phaseRetour ? _retour : _aller;

    return Scaffold(
      backgroundColor: JegoTheme.fond,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 4),
              child: Row(
                children: [
                  BoutonTactile(
                    onTap: () {
                      // En phase retour, revenir = revenir au choix aller
                      if (_phaseRetour) {
                        setState(() {
                          _phaseRetour = false;
                          _offreAllerChoisie = null;
                        });
                      } else {
                        Navigator.of(context).pop();
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: JegoTheme.bordCarte, width: 1),
                      ),
                      child: const Icon(Icons.arrow_back_rounded,
                          size: 20, color: JegoTheme.texte),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _phaseRetour ? '$vers → $de' : '$de → $vers',
                          style: const TextStyle(
                            color: JegoTheme.texte,
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        if (_estAllerRetour)
                          Text(
                            _phaseRetour
                                ? Strings.t('phase_retour')
                                : Strings.t('phase_aller'),
                            style: const TextStyle(
                              color: JegoTheme.vert,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                      ],
                    ),
                  ),
                  BoutonTactile(
                    onTap: _changerDate,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 7),
                      decoration: BoxDecoration(
                        color: JegoTheme.vert.withOpacity(0.1),
                        borderRadius:
                            BorderRadius.circular(JegoTheme.rGrand),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_month_rounded,
                              size: 14, color: JegoTheme.vert),
                          const SizedBox(width: 5),
                          Text(
                            _phaseRetour
                                ? widget.params['date_retour'] ?? ''
                                : widget.params['date'] ?? '',
                            style: const TextStyle(
                              color: JegoTheme.vert,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(width: 3),
                          const Icon(Icons.edit_rounded,
                              size: 11, color: JegoTheme.vert),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Phase retour : rappel de la date et l'heure du voyage ALLER
            if (_phaseRetour && _offreAllerChoisie != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 8, 18, 0),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: JegoTheme.vert.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                    border: Border.all(
                        color: JegoTheme.vert.withOpacity(0.3),
                        width: 0.8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_rounded,
                          size: 16, color: JegoTheme.vert),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${Strings.t('voyage_aller_label')} ${widget.params['date']} · ${_offreAllerChoisie!['heure_depart']}',
                          style: const TextStyle(
                            color: JegoTheme.texte,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ).animate().fadeIn(duration: 350.ms),
            const SizedBox(height: 8),
            Expanded(
              child: _chargement
                  ? _squelettes()
                  : offres.isEmpty
                      ? Center(
                          child: Text(
                            Strings.t('resultats_aucun'),
                            style: const TextStyle(
                                color: JegoTheme.texteSecondaire),
                          ),
                        )
                      : ListView.separated(
                          key: ValueKey(_phaseRetour),
                          padding:
                              const EdgeInsets.fromLTRB(18, 6, 18, 30),
                          itemCount: offres.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 12),
                          itemBuilder: (context, i) {
                            return _CarteOffre(
                              offre: offres[i],
                              villeDepart: _phaseRetour ? vers : de,
                              villeArrivee: _phaseRetour ? de : vers,
                              onTap: () => _ouvrirDetail(offres[i]),
                            )
                                .animate(delay: (i * 90).ms)
                                .fadeIn(duration: 450.ms)
                                .slideY(
                                    begin: 0.18,
                                    curve: Curves.easeOutCubic);
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _squelettes() {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(18, 6, 18, 30),
      itemCount: 4,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, i) {
        return Container(
          height: 128,
          decoration: BoxDecoration(
            color: const Color(0xFFEFF3F0),
            borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
          ),
        ).animate(onPlay: (c) => c.repeat()).shimmer(
            duration: 1200.ms, color: Colors.white.withOpacity(0.7));
      },
    );
  }
}

// Petit contournement d'import pour eviter la collision de noms :
// on reutilise le calendrier JEGO defini dans widgets/selecteur_date.dart
Future<DateTime?> choisirDateJegoImportContournement(
    BuildContext context, DateTime initiale) async {
  return await _importCalendrier(context, initiale);
}

Future<DateTime?> _importCalendrier(
    BuildContext context, DateTime initiale) {
  return choisirDateJegoDepuisWidgets(context, initiale);
}

Future<DateTime?> choisirDateJegoDepuisWidgets(
    BuildContext context, DateTime initiale) {
  return choisirDateJegoExterne(
    context,
    initiale: initiale,
    premiere: DateTime.now(),
    derniere: DateTime.now().add(const Duration(days: 365)),
  );
}

Future<DateTime?> choisirDateJegoExterne(
  BuildContext context, {
  DateTime? initiale,
  required DateTime premiere,
  required DateTime derniere,
}) {
  return choisirDateJego(context,
      initiale: initiale, premiere: premiere, derniere: derniere);
}

class _CarteOffre extends StatelessWidget {
  final Map<String, dynamic> offre;
  final String villeDepart;
  final String villeArrivee;
  final VoidCallback onTap;

  const _CarteOffre({
    required this.offre,
    required this.villeDepart,
    required this.villeArrivee,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final nbArrets = offre['nombre_arrets'] ?? 0;

    return BoutonTactile(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: JegoTheme.fondCarte,
          borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
          border: Border.all(color: JegoTheme.bordCarte, width: 1),
          boxShadow: JegoTheme.ombreDouce,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  '${offre['heure_depart']} → ${offre['heure_arrivee']}',
                  style: const TextStyle(
                    color: JegoTheme.texte,
                    fontSize: 16.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: JegoTheme.vert.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                  ),
                  child: Text(
                    '${offre['categorie']}',
                    style: const TextStyle(
                      color: JegoTheme.vert,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        villeDepart,
                        style: const TextStyle(
                          color: JegoTheme.texte,
                          fontSize: 15.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        '${offre['point_depart']}',
                        style: const TextStyle(
                          color: JegoTheme.texteSecondaire,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  nbArrets == 0
                      ? Icons.arrow_forward_rounded
                      : Icons.more_horiz_rounded,
                  color: JegoTheme.texteTernaire,
                  size: 18,
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        villeArrivee,
                        style: const TextStyle(
                          color: JegoTheme.texte,
                          fontSize: 15.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        '${offre['point_arrivee']}',
                        style: const TextStyle(
                          color: JegoTheme.texteSecondaire,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Text(
                  '${offre['nom_agence']}',
                  style: const TextStyle(
                    color: JegoTheme.texteSecondaire,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(width: 5),
                const Icon(Icons.star_rounded,
                    size: 14, color: JegoTheme.etoile),
                Text(
                  '${offre['note_moyenne']}',
                  style: const TextStyle(
                      color: JegoTheme.texteSecondaire, fontSize: 12),
                ),
                const Spacer(),
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: '${offre['prix']}',
                        style: const TextStyle(
                          color: JegoTheme.texte,
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const TextSpan(
                        text: ' FCFA',
                        style: TextStyle(
                          color: JegoTheme.texteTernaire,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                const Icon(Icons.chevron_right_rounded,
                    color: JegoTheme.texteTernaire, size: 20),
              ],
            ),
          ],
        ),
      ),
    );
  }
}