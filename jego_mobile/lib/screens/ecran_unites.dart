import 'package:flutter/material.dart';
import '../widgets/ecran_choix_generique.dart';

/// DEMO : reglage local uniquement, aucune distance de l'app n'est
/// recalculee en miles aujourd'hui (les distances affichees restent en km
/// quel que soit ce choix).
class EcranUnites extends StatelessWidget {
  const EcranUnites({super.key});

  @override
  Widget build(BuildContext context) {
    return const EcranChoixGenerique(
      titre: 'Unites',
      icone: Icons.straighten_rounded,
      valeurInitiale: 'km',
      options: [
        OptionChoix('km', 'Kilometres (km)'),
        OptionChoix('mi', 'Miles (mi)', disponible: false),
      ],
    );
  }
}