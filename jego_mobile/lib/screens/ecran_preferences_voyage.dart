import 'package:flutter/material.dart';
import '../widgets/ecran_toggles_generique.dart';

class EcranPreferencesVoyage extends StatelessWidget {
  const EcranPreferencesVoyage({super.key});

  @override
  Widget build(BuildContext context) {
    return const EcranTogglesGenerique(
      titre: 'Preferences de voyage',
      icone: Icons.tune_rounded,
      description:
          'Ces preferences ne sont pas encore appliquees automatiquement a la recherche (demo).',
      items: [
        ItemToggleGenerique(Icons.event_seat_rounded, 'Preferer les sieges cote fenetre'),
        ItemToggleGenerique(Icons.ac_unit_rounded, 'Toujours filtrer sur la climatisation'),
        ItemToggleGenerique(Icons.nights_stay_rounded, 'Preferer les trajets de nuit'),
        ItemToggleGenerique(Icons.wifi_rounded, 'Toujours filtrer sur le WiFi'),
      ],
    );
  }
}