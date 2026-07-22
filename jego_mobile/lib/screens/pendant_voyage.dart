import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/billets_store.dart';
import '../config/format_date.dart';
import '../config/notifs_store.dart';
import '../config/theme_jego.dart';
import '../widgets/dialogues_voyage.dart';
import '../widgets/popup_arrivee.dart';
import 'apres_voyage.dart';

enum _StatutTrajet { aVenir, enCours, arrive }

class _Categorie {
  final String id;
  final String libelle;
  final IconData icone;
  const _Categorie(this.id, this.libelle, this.icone);
}

const _categories = <_Categorie>[
  _Categorie('vitesse', 'Excès de vitesse', Icons.speed_rounded),
  _Categorie('conduite', 'Conduite dangereuse', Icons.warning_amber_rounded),
  _Categorie('comportement', 'Comportement inapproprié',
      Icons.report_problem_rounded),
  _Categorie(
      'panne', 'Bus en panne / problème technique', Icons.build_rounded),
  _Categorie('arret', 'Arrêt non prévu trop long', Icons.timer_off_rounded),
  _Categorie('autre', 'Autre', Icons.more_horiz_rounded),
];

/// Ecran "Pendant le voyage". Le statut affiche est calcule localement
/// (comparaison horaire) UNIQUEMENT en attendant l'espace chauffeur reel :
/// a terme, le statut viendra des declarations depart/arrivee du chauffeur,
/// pas des heures officielles (qui restent la reference pour les rapports
/// de retard cote agence/admin). Le billet est relu depuis BilletsStore a
/// chaque frame pour rester synchro avec les actions faites ailleurs.
class EcranPendantVoyage extends StatefulWidget {
  final Map<String, dynamic> billet;
  const EcranPendantVoyage({super.key, required this.billet});

  @override
  State<EcranPendantVoyage> createState() => _EcranPendantVoyageState();
}

class _EcranPendantVoyageState extends State<EcranPendantVoyage> {
  final Set<String> _categoriesSignalees = {};
  String? _confirmation;

  // DEMO uniquement : force un statut pour tester sans changer les dates.
  // Appui long sur le badge de statut. A retirer au branchement backend.
  _StatutTrajet? _forcage;

  void _cyclerForcage() {
    setState(() {
      if (_forcage == null) {
        _forcage = _StatutTrajet.enCours;
      } else if (_forcage == _StatutTrajet.enCours) {
        _forcage = _StatutTrajet.arrive;
      } else {
        _forcage = null;
      }
    });
  }

  Future<void> _confirmerSignalementProbleme(
      BuildContext context, _Categorie cat) async {
    final controleur = TextEditingController();
    final texteValide = ValueNotifier<bool>(cat.id != 'autre');

    final confirme = await showDialog<bool>(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(cat.icone, color: JegoTheme.danger, size: 32),
              const SizedBox(height: 10),
              const Text(
                'Confirmer le signalement',
                textAlign: TextAlign.center,
                style:
                    TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              Text(
                cat.libelle,
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: JegoTheme.texteSecondaire,
                    fontSize: 13,
                    fontWeight: FontWeight.w700),
              ),
              if (cat.id == 'autre') ...[
                const SizedBox(height: 14),
                Container(
                  decoration: BoxDecoration(
                    color: JegoTheme.champ,
                    borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                  ),
                  child: TextField(
                    controller: controleur,
                    maxLines: 3,
                    onChanged: (v) =>
                        texteValide.value = v.trim().isNotEmpty,
                    style: const TextStyle(
                        color: JegoTheme.texte, fontSize: 13.5),
                    decoration: const InputDecoration(
                      hintText: 'Décrivez le problème',
                      hintStyle: TextStyle(color: JegoTheme.texteTernaire),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.all(14),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(false),
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.champ,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: const Text('Annuler',
                            style: TextStyle(
                                color: JegoTheme.texte,
                                fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ValueListenableBuilder<bool>(
                      valueListenable: texteValide,
                      builder: (context, valide, _) => BoutonTactile(
                        onTap: valide
                            ? () => Navigator.of(ctx).pop(true)
                            : null,
                        child: Container(
                          height: 46,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: valide
                                ? JegoTheme.danger
                                : JegoTheme.texteTernaire.withOpacity(0.3),
                            borderRadius:
                                BorderRadius.circular(JegoTheme.rPetit),
                          ),
                          child: const Text('Confirmer',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800)),
                        ),
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

    if (confirme == true) {
      setState(() {
        _categoriesSignalees.add(cat.id);
        _confirmation = cat.libelle;
      });
    }
  }

  Future<void> _confirmerFausseArrivee(
      BuildContext context, String billetId) async {
    final confirme = await showDialog<bool>(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.report_rounded,
                  color: JegoTheme.danger, size: 32),
              const SizedBox(height: 10),
              const Text(
                'Signaler une fausse arrivée',
                textAlign: TextAlign.center,
                style:
                    TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              Text(
                'L\'agence a déclaré ce trajet arrivé, mais vous êtes encore en route. Une fois signalé, vous ne pourrez plus noter ce trajet tant que ce n\'est pas vérifié.',
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: JegoTheme.texteSecondaire, fontSize: 12.5),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(false),
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.champ,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: const Text('Annuler',
                            style: TextStyle(
                                color: JegoTheme.texte,
                                fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: BoutonTactile(
                      onTap: () => Navigator.of(ctx).pop(true),
                      child: Container(
                        height: 46,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: JegoTheme.danger,
                          borderRadius:
                              BorderRadius.circular(JegoTheme.rPetit),
                        ),
                        child: const Text('Signaler',
                            style: TextStyle(
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

    if (confirme == true) {
      BilletsStore.mettreAJour(billetId, {'fausse_arrivee_signalee': true});
    }
  }

  DateTime? _dateHeure(Map<String, dynamic> billet, String? heure) {
    final date = billet['date'] as String?;
    if (date == null || heure == null) return null;
    try {
      final d = DateTime.parse(date);
      final parts = heure.split(':');
      return DateTime(
          d.year, d.month, d.day, int.parse(parts[0]), int.parse(parts[1]));
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<List<Map<String, dynamic>>>(
      valueListenable: BilletsStore.billets,
      builder: (context, tous, _) {
        final billetActuel = tous.firstWhere(
          (b) => b['id'] == widget.billet['id'],
          orElse: () => widget.billet,
        );

        final depart = _dateHeure(
            billetActuel, billetActuel['heure_depart'] as String?);
        var arrivee = _dateHeure(
            billetActuel, billetActuel['heure_arrivee'] as String?);
        if (depart != null && arrivee != null && arrivee.isBefore(depart)) {
          arrivee = arrivee.add(const Duration(days: 1));
        }

        final maintenant = DateTime.now();
        _StatutTrajet statut;
        double progression;

        if (depart == null || arrivee == null) {
          statut = _StatutTrajet.aVenir;
          progression = 0;
        } else if (maintenant.isBefore(depart)) {
          statut = _StatutTrajet.aVenir;
          progression = 0;
        } else if (maintenant.isAfter(arrivee)) {
          statut = _StatutTrajet.arrive;
          progression = 1;
        } else {
          statut = _StatutTrajet.enCours;
          final total = arrivee.difference(depart).inSeconds;
          final ecoule = maintenant.difference(depart).inSeconds;
          progression = total == 0 ? 0 : (ecoule / total).clamp(0.0, 1.0);
        }

        // DEMO : le forcage manuel ecrase le calcul reel pour tester.
        if (_forcage != null) {
          statut = _forcage!;
          progression = switch (statut) {
            _StatutTrajet.aVenir => 0.0,
            _StatutTrajet.enCours => 0.5,
            _StatutTrajet.arrive => 1.0,
          };
        }

        final billetId = '${billetActuel['id']}';
        final noteEnvoyee = billetActuel['note_envoyee'] == true;
        final fausseArriveeSignalee =
            billetActuel['fausse_arrivee_signalee'] == true;
        // Prevu pour le blocage collectif backend (seuil de signalements
        // atteint sur ce trajet) : jamais positionne en demo, juste lu ici.
        final notationBloqueeCollectif =
            billetActuel['notation_bloquee'] == true;

        // Declenche la notif "arrivee declaree" une seule fois, en la
        // marquant sur le billet lui-meme pour survivre a une reouverture.
        if (statut == _StatutTrajet.arrive &&
            billetActuel['notif_arrivee_envoyee'] != true) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
           NotifsStore.ajouterArriveeDeclaree(billetActuel);
            BilletsStore.mettreAJour(
                billetId, {'notif_arrivee_envoyee': true});
            afficherPopupArrivee(
              billet: billetActuel,
              onNoter: () {
                SoftLock.navKey.currentState?.push(
                  MaterialPageRoute(
                    builder: (_) => EcranApresVoyage(billet: billetActuel),
                  ),
                );
              },
            );
          });
        }

        return Scaffold(
          backgroundColor: JegoTheme.fond,
          body: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: _EnTeteTrajet(
                  villeDepart: '${billetActuel['ville_depart']}',
                  villeArrivee: '${billetActuel['ville_arrivee']}',
                  nomAgence: '${billetActuel['nom_agence']}',
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _CarteProgression(
                      statut: statut,
                      progression: progression,
                      pointDepart:
                          '${billetActuel['point_depart'] ?? billetActuel['ville_depart']}',
                      pointArrivee:
                          '${billetActuel['point_arrivee'] ?? billetActuel['ville_arrivee']}',
                      depart: depart,
                      onDebugTap: _cyclerForcage,
                    ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.06),
                    const SizedBox(height: 14),
                    _CarteEta(
                      heureArrivee: '${billetActuel['heure_arrivee']}',
                      date: '${billetActuel['date']}',
                      statut: statut,
                    )
                        .animate(delay: 80.ms)
                        .fadeIn(duration: 350.ms)
                        .slideY(begin: 0.06),
                    if (statut == _StatutTrajet.arrive) ...[
                      const SizedBox(height: 14),
                      _CarteArrivee(
                        noteEnvoyee: noteEnvoyee,
                        fausseArriveeSignalee: fausseArriveeSignalee,
                        notationBloqueeCollectif: notationBloqueeCollectif,
                        onNoter: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                EcranApresVoyage(billet: billetActuel),
                          ),
                        ),
                        onSignalerFausseArrivee: () =>
                            confirmerFausseArrivee(context, billetId),
                      )
                          .animate(delay: 140.ms)
                          .fadeIn(duration: 350.ms)
                          .slideY(begin: 0.06),
                    ],
                    if (statut == _StatutTrajet.enCours) ...[
                      const SizedBox(height: 24),
                      const Text(
                        'Signaler un problème',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: JegoTheme.texte,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Votre signalement est pris en compte avec ceux des autres passagers du bus.',
                        style: TextStyle(
                            fontSize: 12, color: JegoTheme.texteSecondaire),
                      ),
                      const SizedBox(height: 14),
                      ...List.generate(_categories.length, (i) {
                        final cat = _categories[i];
                        final signalee =
                            _categoriesSignalees.contains(cat.id);
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _BoutonSignalement(
                            categorie: cat,
                            signalee: signalee,
                            onTap: signalee
                                ? null
                                : () => _confirmerSignalementProbleme(
                                    context, cat),
                          ),
                        ).animate(delay: (i * 40).ms).fadeIn(duration: 300.ms);
                      }),
                      AnimatedSize(
                        duration: const Duration(milliseconds: 250),
                        child: _confirmation == null
                            ? const SizedBox(width: double.infinity)
                            : Container(
                                margin: const EdgeInsets.only(top: 6),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 12),
                                decoration: BoxDecoration(
                                  color: JegoTheme.vert.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(
                                      JegoTheme.rPetit),
                                ),
                                child: const Row(
                                  children: [
                                    Icon(Icons.check_circle_rounded,
                                        color: JegoTheme.vert, size: 18),
                                    SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'Signalement envoyé. Merci de votre vigilance.',
                                        style: TextStyle(
                                            fontSize: 12.5,
                                            color: JegoTheme.texte),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                      ),
                    ],
                  ]),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Carte unique affichee quand le trajet est termine : notation ou etats
/// de blocage (deja note / signalement individuel / verification collective).
class _CarteArrivee extends StatelessWidget {
  final bool noteEnvoyee;
  final bool fausseArriveeSignalee;
  final bool notationBloqueeCollectif;
  final VoidCallback onNoter;
  final VoidCallback onSignalerFausseArrivee;

  const _CarteArrivee({
    required this.noteEnvoyee,
    required this.fausseArriveeSignalee,
    required this.notationBloqueeCollectif,
    required this.onNoter,
    required this.onSignalerFausseArrivee,
  });

  @override
  Widget build(BuildContext context) {
    if (noteEnvoyee) {
      return _carteEtat(
        icone: Icons.check_circle_rounded,
        couleur: JegoTheme.vert,
        titre: 'Merci, vous avez déjà noté ce trajet.',
      );
    }
    if (notationBloqueeCollectif) {
      return _carteEtat(
        icone: Icons.gavel_rounded,
        couleur: JegoTheme.texteTernaire,
        titre:
            'Ce trajet fait l\'objet d\'une vérification. La notation est temporairement indisponible.',
      );
    }
    if (fausseArriveeSignalee) {
      return _carteEtat(
        icone: Icons.hourglass_top_rounded,
        couleur: JegoTheme.texteTernaire,
        titre:
            'Signalement transmis. La notation est suspendue le temps de la vérification.',
      );
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rGrand),
        border: Border.all(color: JegoTheme.vert.withOpacity(0.25), width: 1.5),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: JegoTheme.vert.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.flag_rounded,
                    color: JegoTheme.vert, size: 20),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'L\'arrivée vient d\'être déclarée.',
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    color: JegoTheme.texte,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Padding(
            padding: EdgeInsets.only(left: 52),
            child: Text(
              'Avez-vous passé un bon voyage ?',
              style: TextStyle(fontSize: 13, color: JegoTheme.texteSecondaire),
            ),
          ),
          const SizedBox(height: 16),
          BoutonTactile(
            onTap: onNoter,
            child: Container(
              width: double.infinity,
              height: 48,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [JegoTheme.vert, JegoTheme.vertVif],
                ),
                borderRadius: BorderRadius.circular(JegoTheme.rPetit),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.star_rounded, color: Colors.white, size: 18),
                  SizedBox(width: 8),
                  Text('Noter mon voyage',
                      style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 14)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          BoutonTactile(
            onTap: onSignalerFausseArrivee,
            child: Container(
              width: double.infinity,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: JegoTheme.danger.withOpacity(0.08),
                borderRadius: BorderRadius.circular(JegoTheme.rPetit),
                border: Border.all(color: JegoTheme.danger.withOpacity(0.3)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.report_rounded,
                      color: JegoTheme.danger, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    'Vous n\'êtes pas encore arrivé ? Signaler',
                    style: TextStyle(
                        color: JegoTheme.danger,
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _carteEtat({
    required IconData icone,
    required Color couleur,
    required String titre,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.bordCarte),
      ),
      child: Row(
        children: [
          Icon(icone, color: couleur, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              titre,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: JegoTheme.texte,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EnTeteTrajet extends StatelessWidget {
  final String villeDepart;
  final String villeArrivee;
  final String nomAgence;
  const _EnTeteTrajet({
    required this.villeDepart,
    required this.villeArrivee,
    required this.nomAgence,
  });

  @override
  Widget build(BuildContext context) {
    return ClipPath(
      clipper: _VagueClipperVoyage(),
      child: Container(
        height: 152,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [JegoTheme.vert, JegoTheme.vertVif],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.16),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.arrow_back_rounded,
                        color: Colors.white, size: 20),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  '$villeDepart → $villeArrivee',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 21,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  nomAgence,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.85),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ).animate().fadeIn(duration: 300.ms);
  }
}

class _VagueClipperVoyage extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final chemin = Path();
    chemin.lineTo(0, size.height - 26);
    chemin.quadraticBezierTo(
        size.width / 2, size.height, size.width, size.height - 26);
    chemin.lineTo(size.width, 0);
    chemin.close();
    return chemin;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

class _CarteProgression extends StatelessWidget {
  final _StatutTrajet statut;
  final double progression;
  final String pointDepart;
  final String pointArrivee;
  final DateTime? depart;
  final VoidCallback? onDebugTap;

  const _CarteProgression({
    required this.statut,
    required this.progression,
    required this.pointDepart,
    required this.pointArrivee,
    required this.depart,
    this.onDebugTap,
  });

  String _libelleStatut() {
    switch (statut) {
      case _StatutTrajet.aVenir:
        return _texteAttente();
      case _StatutTrajet.enCours:
        return 'Trajet en cours';
      case _StatutTrajet.arrive:
        return 'Trajet terminé';
    }
  }

  String _texteAttente() {
    if (depart == null) return 'Départ à venir';
    final diff = depart!.difference(DateTime.now());
    if (diff.isNegative) return 'Départ imminent';
    final h = diff.inHours;
    final m = diff.inMinutes % 60;
    if (h == 0) return 'Départ dans $m min';
    return 'Départ dans ${h}h${m.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: JegoTheme.fondCarte,
        borderRadius: BorderRadius.circular(JegoTheme.rGrand),
        border: Border.all(color: JegoTheme.bordCarte),
        boxShadow: JegoTheme.ombreDouce,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onLongPress: onDebugTap,
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: statut == _StatutTrajet.enCours
                        ? JegoTheme.vert
                        : JegoTheme.texteTernaire,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  _libelleStatut(),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: JegoTheme.texte,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          LayoutBuilder(
            builder: (context, constraints) {
              final largeurUtile = constraints.maxWidth - 24;
              final positionBus =
                  (largeurUtile * progression).clamp(0.0, largeurUtile);
              return SizedBox(
                height: 34,
                child: Stack(
                  alignment: Alignment.centerLeft,
                  children: [
                    Container(
                      height: 4,
                      decoration: BoxDecoration(
                        color: JegoTheme.champ,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    Container(
                      height: 4,
                      width: positionBus + 12,
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [JegoTheme.vert, JegoTheme.vertVif],
                        ),
                        borderRadius: BorderRadius.all(Radius.circular(4)),
                      ),
                    ),
                    Positioned(
                      left: positionBus,
                      child: Container(
                        width: 26,
                        height: 26,
                        decoration: BoxDecoration(
                          color: JegoTheme.vert,
                          shape: BoxShape.circle,
                          boxShadow: JegoTheme.ombreVerte,
                        ),
                        child: const Icon(Icons.directions_bus_rounded,
                            color: Colors.white, size: 15),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  pointDepart,
                  style: TextStyle(
                      fontSize: 11.5,
                      color: JegoTheme.texteSecondaire,
                      fontWeight: FontWeight.w600),
                ),
              ),
              Expanded(
                child: Text(
                  pointArrivee,
                  textAlign: TextAlign.right,
                  style: TextStyle(
                      fontSize: 11.5,
                      color: JegoTheme.texteSecondaire,
                      fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CarteEta extends StatelessWidget {
  final String heureArrivee;
  final String date;
  final _StatutTrajet statut;
  const _CarteEta({
    required this.heureArrivee,
    required this.date,
    required this.statut,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: JegoTheme.vert.withOpacity(0.06),
        borderRadius: BorderRadius.circular(JegoTheme.rMoyen),
        border: Border.all(color: JegoTheme.vert.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              color: JegoTheme.fondCarte,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.schedule_rounded,
                color: JegoTheme.vert, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  statut == _StatutTrajet.arrive
                      ? 'Arrivée déclarée'
                      : 'Arrivée prévue',
                  style: TextStyle(
                      fontSize: 11.5, color: JegoTheme.texteSecondaire),
                ),
                const SizedBox(height: 2),
                Text(
                  '$heureArrivee · ${FormatDate.lisible(date)}',
                  style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w800,
                      color: JegoTheme.texte),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BoutonSignalement extends StatelessWidget {
  final _Categorie categorie;
  final bool signalee;
  final VoidCallback? onTap;
  const _BoutonSignalement({
    required this.categorie,
    required this.signalee,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return BoutonTactile(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: signalee ? JegoTheme.champ : JegoTheme.fondCarte,
          borderRadius: BorderRadius.circular(JegoTheme.rPetit),
          border: Border.all(color: JegoTheme.bordCarte),
        ),
        child: Row(
          children: [
            Icon(categorie.icone,
                size: 18,
                color: signalee
                    ? JegoTheme.texteTernaire
                    : JegoTheme.texteSecondaire),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                categorie.libelle,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color:
                      signalee ? JegoTheme.texteTernaire : JegoTheme.texte,
                ),
              ),
            ),
            Icon(
              signalee ? Icons.check_circle_rounded : Icons.chevron_right_rounded,
              size: 18,
              color: signalee ? JegoTheme.vert : JegoTheme.texteTernaire,
            ),
          ],
        ),
      ),
    );
  }
}