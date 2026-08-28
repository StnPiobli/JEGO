import 'package:flutter/material.dart';

import '../config/theme_jego.dart';

/// Adoucit le passage d'un thème à l'autre.
///
/// Les couleurs étant lues à l'exécution, le changement est instantané :
/// tout l'écran claque d'un coup, ce qui est brutal. On pose donc un
/// voile de la nouvelle couleur de fond, qui s'efface en un tiers de
/// seconde — l'œil lit une transition au lieu d'un sursaut.
///
/// Le voile ne capte aucun geste : on peut continuer à toucher l'écran
/// pendant qu'il s'efface.
class BasculeTheme extends StatefulWidget {
  final Widget child;
  const BasculeTheme({super.key, required this.child});

  @override
  State<BasculeTheme> createState() => _BasculeThemeState();
}

class _BasculeThemeState extends State<BasculeTheme>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controleur = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 320),
  );

  @override
  void initState() {
    super.initState();
    modeSombre.addListener(_jouer);
  }

  void _jouer() {
    if (!mounted) return;
    // Le voile apparaît d'emblée puis s'efface : le nouvel écran se
    // révèle dessous.
    _controleur.value = 1;
    _controleur.reverse();
  }

  @override
  void dispose() {
    modeSombre.removeListener(_jouer);
    _controleur.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        Positioned.fill(
          child: IgnorePointer(
            child: FadeTransition(
              opacity: CurvedAnimation(
                parent: _controleur,
                curve: Curves.easeOut,
              ),
              child: Container(color: JegoTheme.fond),
            ),
          ),
        ),
      ],
    );
  }
}
