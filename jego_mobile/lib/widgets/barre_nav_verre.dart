import 'dart:ui';
import 'package:flutter/material.dart';
import '../config/theme_jego.dart';

/// Barre de navigation flottante etroite. L'indicateur actif est un
/// cylindre occupant 1/3 de la barre en largeur ET toute la hauteur.
class BarreNavVerre extends StatelessWidget {
  final int index;
  final ValueChanged<int> onChange;
  final List<IconData> icones;

  const BarreNavVerre({
    super.key,
    required this.index,
    required this.onChange,
    required this.icones,
  });

  @override
  Widget build(BuildContext context) {
    final n = icones.length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(96, 0, 96, 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(27),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: Container(
            height: 54,
            decoration: BoxDecoration(
              color: JegoTheme.fondCarte.withOpacity(0.72),
              borderRadius: BorderRadius.circular(27),
              border: Border.all(
                  color: JegoTheme.fondCarte.withOpacity(0.9), width: 0.8),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF14201A).withOpacity(0.10),
                  blurRadius: 22,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: LayoutBuilder(
              builder: (context, contraintes) {
                final largeurCase = contraintes.maxWidth / n;
                // Cylindre = 1/3 de la largeur, pleine hauteur
                final largeurCylindre = contraintes.maxWidth / 3;
                final gauche = largeurCase * index +
                    (largeurCase - largeurCylindre) / 2;
                return Stack(
                  children: [
                    AnimatedPositioned(
                      duration: const Duration(milliseconds: 340),
                      curve: Curves.easeOutBack,
                      left: gauche,
                      top: 0,
                      bottom: 0,
                      child: Container(
                        width: largeurCylindre,
                        decoration: BoxDecoration(
                          color: JegoTheme.vert.withOpacity(0.16),
                          borderRadius: BorderRadius.circular(27),
                          border: Border.all(
                            color: JegoTheme.vert.withOpacity(0.32),
                            width: 0.8,
                          ),
                        ),
                      ),
                    ),
                    Row(
                      children: List.generate(n, (i) {
                        final actif = i == index;
                        return Expanded(
                          child: GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: () => onChange(i),
                            child: Center(
                              child: AnimatedScale(
                                scale: actif ? 1.12 : 1.0,
                                duration:
                                    const Duration(milliseconds: 240),
                                curve: Curves.easeOutBack,
                                child: Icon(
                                  icones[i],
                                  size: 22,
                                  color: actif
                                      ? JegoTheme.vert
                                      : JegoTheme.texteTernaire,
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}