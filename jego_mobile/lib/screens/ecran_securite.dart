import 'package:flutter/material.dart';
import '../widgets/ecran_toggles_generique.dart';

class EcranSecurite extends StatelessWidget {
  const EcranSecurite({super.key});

  @override
  Widget build(BuildContext context) {
    return const EcranTogglesGenerique(
      titre: 'Securite',
      icone: Icons.lock_outline_rounded,
      description:
          'Ces réglages ne sont pas encore actifs.',
      items: [
        ItemToggleGenerique(Icons.fingerprint_rounded, 'Deverrouillage biometrique'),
        ItemToggleGenerique(Icons.shield_rounded, 'Verification en 2 etapes'),
        ItemToggleGenerique(Icons.visibility_off_rounded, 'Masquer le solde au demarrage'),
      ],
    );
  }
}