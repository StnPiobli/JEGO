import 'package:flutter/material.dart';
import '../widgets/ecran_choix_generique.dart';

/// DEMO : seul XAF (Franc CFA) est reellement utilise dans l'app
/// aujourd'hui -- les autres devises n'ont aucune conversion reelle.
class EcranDevise extends StatelessWidget {
  const EcranDevise({super.key});

  @override
  Widget build(BuildContext context) {
    return const EcranChoixGenerique(
      titre: 'Devise',
      icone: Icons.attach_money_rounded,
      valeurInitiale: 'xaf',
      options: [
        OptionChoix('xaf', 'Franc CFA (XAF)'),
        OptionChoix('eur', 'Euro (EUR)', disponible: false),
        OptionChoix('usd', 'Dollar americain (USD)', disponible: false),
      ],
    );
  }
}