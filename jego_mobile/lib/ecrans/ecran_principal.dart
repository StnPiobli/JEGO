import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme.dart';
import 'ecran_recherche.dart';
import 'ecran_billets.dart';
import 'ecran_profil.dart';

class EcranPrincipal extends StatefulWidget {
  const EcranPrincipal({super.key});

  @override
  State<EcranPrincipal> createState() => _EcranPrincipalState();
}

class _EcranPrincipalState extends State<EcranPrincipal> {
  int _indexActuel = 0;

  final List<Widget> _ecrans = const [
    EcranRecherche(),
    EcranBillets(),
    EcranProfil(),
  ];

  final List<IconData> _icones = const [
    Icons.home_rounded,
    Icons.confirmation_number_rounded,
    Icons.person_rounded,
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: IndexedStack(
        index: _indexActuel,
        children: _ecrans,
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.fromLTRB(40, 0, 40, 24),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(40),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: Container(
              height: 68,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.75),
                borderRadius: BorderRadius.circular(40),
                border: Border.all(color: Colors.white.withOpacity(0.5)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.15),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: LayoutBuilder(
                builder: (context, contraintes) {
                  final largeurZone = contraintes.maxWidth / _icones.length;
                  return Stack(
                    alignment: Alignment.centerLeft,
                    children: [
                      // Indicateur cylindre qui glisse
                      AnimatedPositioned(
                        duration: const Duration(milliseconds: 280),
                        curve: Curves.easeOutCubic,
                        left: largeurZone * _indexActuel + 6,
                        top: 8,
                        child: Container(
                          width: largeurZone - 12,
                          height: 44,
                          decoration: BoxDecoration(
                            color: JegoColors.vertMoyen,
                            borderRadius: BorderRadius.circular(22),
                          ),
                        ),
                      ),
                      // Icones
                      Row(
                        children: List.generate(_icones.length, (index) {
                          final selectionne = index == _indexActuel;
                          return Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _indexActuel = index),
                              behavior: HitTestBehavior.opaque,
                              child: SizedBox(
                                height: 60,
                                child: Icon(
                                  _icones[index],
                                  color: selectionne ? Colors.white : Colors.black45,
                                  size: 24,
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
      ),
    );
  }
}