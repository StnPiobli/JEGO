import 'package:flutter/material.dart';
import '../widgets/ecran_choix_generique.dart';

/// DEMO : "Sombre" est desactive -- l'app n'a pas de vrai mode sombre
/// implemente, seul le clair existe reellement (decision prise plus tot
/// dans le projet de fixer le theme en clair partout).
class EcranTheme extends StatelessWidget {
  const EcranTheme({super.key});

  @override
  Widget build(BuildContext context) {
    return const EcranChoixGenerique(
      titre: 'Theme',
      icone: Icons.dark_mode_outlined,
      valeurInitiale: 'clair',
      options: [
        OptionChoix('clair', 'Clair'),
        OptionChoix('sombre', 'Sombre', disponible: false),
      ],
    );
  }
}