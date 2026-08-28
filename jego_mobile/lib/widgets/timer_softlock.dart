import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import '../config/billets_store.dart';
import '../config/theme_jego.dart';
import '../l10n/strings.dart';

/// Cylindre de verre affichant le compte a rebours du soft-lock GLOBAL.
/// Un seul de ces widgets fait avancer l'horloge a la fois (garde-fou anti double).
/// A l'expiration, ramene TOUJOURS au premier ecran via SoftLock.navKey,
/// peu importe l'ecran ou on se trouve (siege, options, paiement).
class TimerSoftLock extends StatefulWidget {
  /// Optionnel : action supplementaire propre a l'ecran (ex. reset local).
  /// La liberation/navigation est geree ici de toute facon.
  final VoidCallback? onExpire;
  const TimerSoftLock({super.key, this.onExpire});

  @override
  State<TimerSoftLock> createState() => _TimerSoftLockState();
}

// Garde-fou : un seul timer actif globalement (evite la double vitesse).
int _instancesActives = 0;
// Empeche deux liberations simultanees (dialogue + expiration).
bool _liberationEnCours = false;

class _TimerSoftLockState extends State<TimerSoftLock>
    with WidgetsBindingObserver {
  Timer? _t;
  bool _proprietaire = false;
  bool _alerteMontree = false;
  static const int seuilAlerte = 30;

  @override
  void initState() {
    super.initState();
    if (_instancesActives == 0) {
      _proprietaire = true;
      _instancesActives = 1;
      WidgetsBinding.instance.addObserver(this);
      _t = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
    }
  }

  /// Retour de l'arriere-plan : le systeme a gele nos tics pendant
  /// l'absence. On relit l'horloge tout de suite plutot que d'attendre
  /// le prochain tic, et le verrou tombe s'il a expire entre-temps.
  @override
  void didChangeAppLifecycleState(AppLifecycleState etat) {
    if (etat == AppLifecycleState.resumed) _tick();
  }

  void _tick() {
    if (!SoftLock.actif.value || SoftLock.suspendu.value) return;
    final s = SoftLock.restant;
    SoftLock.secondes.value = s;
    if (s <= 0) {
      _liberer();
      return;
    }
    // Comparaison large, pas une egalite : au retour d'une mise en
    // veille le decompte saute plusieurs secondes d'un coup et le
    // seuil exact ne serait jamais atteint.
    if (s <= seuilAlerte && !_alerteMontree) {
      _alerteMontree = true;
      _demanderPresence();
    }
  }

  /// Libere le verrou ET ramene au tout debut du tunnel (choix du trajet),
  /// depuis n'importe quel ecran. Affiche un message.
  void _liberer() {
    if (_liberationEnCours) return;
    _liberationEnCours = true;

    SoftLock.arreter();
    widget.onExpire?.call();

    final nav = SoftLock.navKey.currentState;
    if (nav != null) {
      // Ferme tout ce qui a ete empile pendant le tunnel (siege, options,
      // paiement, dialogues) et revient a la racine (accueil/resultats).
      nav.popUntil((route) => route.isFirst);
      final ctx = SoftLock.navKey.currentContext;
      if (ctx != null) {
        ScaffoldMessenger.of(ctx).showSnackBar(
          SnackBar(
            content: Text(Strings.t('siege_verrou_expire')),
            behavior: SnackBarBehavior.floating,
            backgroundColor: JegoTheme.texte,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(JegoTheme.rPetit)),
          ),
        );
      }
    }

    // Rearme pour une prochaine reservation.
    Future.delayed(const Duration(milliseconds: 300), () {
      _liberationEnCours = false;
    });
  }

  Future<void> _demanderPresence() async {
    SoftLock.suspendre();
    var secondes = 10;
    Timer? tDialog;
    final ctxRacine = SoftLock.navKey.currentContext ?? context;

    final reponse = await showDialog<bool>(
      context: ctxRacine,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) {
          tDialog ??= Timer.periodic(const Duration(seconds: 1), (t) {
            secondes--;
            if (secondes <= 0) {
              t.cancel();
              if (Navigator.of(ctx).canPop()) Navigator.of(ctx).pop(false);
            } else {
              setD(() {});
            }
          });
          return Dialog(
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(JegoTheme.rMoyen)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.timer_rounded,
                      color: JegoTheme.vert, size: 34),
                  const SizedBox(height: 10),
                  Text(Strings.t('toujours_la_titre'),
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text(Strings.t('toujours_la_texte'),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: JegoTheme.texteSecondaire, fontSize: 12.5)),
                  const SizedBox(height: 16),
                  BoutonTactile(
                    onTap: () => Navigator.of(ctx).pop(true),
                    child: Container(
                      width: double.infinity,
                      height: 46,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: JegoTheme.vert,
                        borderRadius:
                            BorderRadius.circular(JegoTheme.rPetit),
                      ),
                      child: Text(
                        '${Strings.t('toujours_la_bouton')} ($secondes s)',
                        style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
    tDialog?.cancel();

    if (reponse == true) {
      // L'utilisateur confirme : on relance le compteur.
      SoftLock.relancer();
      _alerteMontree = false;
    } else {
      // Pas de reponse (ou dialogue ferme sans "Oui") : on libere ET on
      // ramene au debut du tunnel. C'est ce cas qui etait casse avant.
      _liberer();
    }
  }

  @override
  void dispose() {
    if (_proprietaire) {
      _t?.cancel();
      WidgetsBinding.instance.removeObserver(this);
      _instancesActives = 0;
    }
    super.dispose();
  }

  String _fmt(int s) {
    final m = (s ~/ 60).toString().padLeft(2, '0');
    final sec = (s % 60).toString().padLeft(2, '0');
    return '$m:$sec';
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: SoftLock.actif,
      builder: (context, actif, _) {
        if (!actif) return const SizedBox.shrink();
        return ValueListenableBuilder<int>(
          valueListenable: SoftLock.secondes,
          builder: (context, s, __) {
            return ClipRRect(
              borderRadius: BorderRadius.circular(JegoTheme.rGrand),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                child: Container(
                  width: 92,
                  alignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(vertical: 7),
                  decoration: BoxDecoration(
                    color: JegoTheme.fondCarte.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(JegoTheme.rGrand),
                    border: Border.all(
                        color: JegoTheme.fondCarte.withOpacity(0.9), width: 0.8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.lock_clock_rounded,
                          size: 14, color: JegoTheme.vert),
                      const SizedBox(width: 5),
                      Text(_fmt(s),
                          style: TextStyle(
                              color: JegoTheme.texte,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w800,
                              fontFeatures: [FontFeature.tabularFigures()])),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}