import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

/// Fond immersif clair — collines vertes, soleil, nuages qui derivent,
/// bus qui roule. Sera remplace/complete par de vraies photos plus tard.
class FondImmersif extends StatefulWidget {
  final double hauteur;
  const FondImmersif({super.key, this.hauteur = 380});

  @override
  State<FondImmersif> createState() => _FondImmersifState();
}

class _FondImmersifState extends State<FondImmersif>
    with TickerProviderStateMixin {
  late final AnimationController _nuages; // derive lente
  late final AnimationController _bus; // roulis du bus
  late final AnimationController _soleil; // halo qui respire

  @override
  void initState() {
    super.initState();
    _nuages = AnimationController(
        vsync: this, duration: const Duration(seconds: 22))
      ..repeat();
    _bus = AnimationController(
        vsync: this, duration: const Duration(seconds: 3))
      ..repeat(reverse: true);
    _soleil = AnimationController(
        vsync: this, duration: const Duration(seconds: 4))
      ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _nuages.dispose();
    _bus.dispose();
    _soleil.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: widget.hauteur,
      child: LayoutBuilder(builder: (context, c) {
        final l = c.maxWidth;
        final h = widget.hauteur;
        return Stack(
          fit: StackFit.expand,
          clipBehavior: Clip.hardEdge,
          children: [
            // Ciel clair
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFFE9F6EE), Color(0xFFF6FAF6), JegoTheme.fond],
                  stops: [0.0, 0.65, 1.0],
                ),
              ),
            ),
            // Soleil au halo qui respire
            AnimatedBuilder(
              animation: _soleil,
              builder: (context, _) {
                final t = _soleil.value;
                return Positioned(
                  top: h * 0.08,
                  right: l * 0.12,
                  child: Container(
                    width: 54 + t * 8,
                    height: 54 + t * 8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFFFE9B8),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFFFD97A)
                              .withOpacity(0.45 + t * 0.2),
                          blurRadius: 34 + t * 14,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
            // Nuages qui derivent en continu
            AnimatedBuilder(
              animation: _nuages,
              builder: (context, _) {
                final t = _nuages.value;
                return Stack(children: [
                  _nuage(((t * (l + 160)) % (l + 160)) - 160, h * 0.10, 90),
                  _nuage(
                      (((t + 0.45) * (l + 220)) % (l + 220)) - 220,
                      h * 0.22,
                      120),
                  _nuage(
                      (((t + 0.75) * (l + 130)) % (l + 130)) - 130,
                      h * 0.05,
                      64),
                ]);
              },
            ),
            // Collines
            Positioned(
              top: h * 0.45,
              left: -60,
              child: _colline(280, const Color(0xFFBFE6CF)),
            ),
            Positioned(
              top: h * 0.52,
              right: -90,
              child: _colline(320, const Color(0xFF9FD9B8)),
            ),
            Positioned(
              top: h * 0.62,
              left: 60,
              child: _colline(230, const Color(0xFF7CCB9F)),
            ),
            // Route
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  width: 76,
                  height: h * 0.34,
                  decoration: const BoxDecoration(
                    color: Color(0xFF57866C),
                    borderRadius:
                        BorderRadius.vertical(top: Radius.circular(38)),
                  ),
                  child: AnimatedBuilder(
                    animation: _nuages,
                    builder: (context, _) {
                      // Pointilles de route qui defilent
                      final d = (_nuages.value * 5 * 36) % 36;
                      return ClipRRect(
                        borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(38)),
                        child: Stack(
                          children: List.generate(6, (i) {
                            return Positioned(
                              top: i * 36.0 - d,
                              left: 0,
                              right: 0,
                              child: Center(
                                child: Container(
                                  width: 5,
                                  height: 16,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.55),
                                    borderRadius:
                                        BorderRadius.circular(3),
                                  ),
                                ),
                              ),
                            );
                          }),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
            // Bus qui roule (leger roulis + rebond)
            AnimatedBuilder(
              animation: _bus,
              builder: (context, _) {
                final t = _bus.value;
                return Positioned(
                  bottom: h * 0.09 + t * 6,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Transform.rotate(
                      angle: (t - 0.5) * 0.05,
                      child: Container(
                        padding: const EdgeInsets.all(9),
                        decoration: BoxDecoration(
                          color: JegoTheme.vert,
                          shape: BoxShape.circle,
                          boxShadow: JegoTheme.ombreVerte,
                        ),
                        child: const Icon(Icons.directions_bus_rounded,
                            color: Colors.white, size: 24),
                      ),
                    ),
                  ),
                );
              },
            ),
            // Fondu vers le fond
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              height: 70,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      JegoTheme.fond.withOpacity(0),
                      JegoTheme.fond,
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      }),
    );
  }

  Widget _nuage(double x, double y, double taille) {
    return Positioned(
      left: x,
      top: y,
      child: Container(
        width: taille,
        height: taille * 0.38,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.85),
          borderRadius: BorderRadius.circular(taille),
        ),
      ),
    );
  }

  Widget _colline(double taille, Color couleur) {
    return Container(
      width: taille,
      height: taille * 0.6,
      decoration: BoxDecoration(
        color: couleur,
        borderRadius:
            BorderRadius.all(Radius.elliptical(taille, taille * 0.6)),
      ),
    );
  }
}